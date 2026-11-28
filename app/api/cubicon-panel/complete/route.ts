import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signPanelResult } from "@/lib/panel/hmac";
import { evaluateSequencePass } from "@/app/api/cubicon-data/route";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, callbackUrl } = body;

    if (!sessionId || !callbackUrl) {
      return NextResponse.json(
        { error: "sessionId and callbackUrl are required." },
        { status: 400 }
      );
    }

    // Load session with sequence
    const session = await prisma.cubiconSession.findUnique({
      where: { sessionId },
      include: { sequence: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    const effectiveRespondentId = session.respondentId || body.respondentId;
    const effectiveClientId = session.clientId || body.clientId;

    if (!effectiveRespondentId) {
      return NextResponse.json(
        { error: "Session has no respondentId." },
        { status: 400 }
      );
    }

    if (session.sessionMode !== "panel" && !body.respondentId) {
      return NextResponse.json(
        { error: "Session is not a panel session." },
        { status: 400 }
      );
    }

    // Ensure session is tagged with panel mode and IDs
    if (
      session.sessionMode !== "panel" ||
      session.respondentId !== effectiveRespondentId ||
      (effectiveClientId && session.clientId !== effectiveClientId)
    ) {
      await prisma.cubiconSession.update({
        where: { id: session.id },
        data: {
          sessionMode: "panel",
          respondentId: effectiveRespondentId,
          clientId: effectiveClientId || session.clientId,
        },
      });
    }

    // Determine pass/fail
    const totalTasks =
      session.totalPuzzlesAttempted > 0
        ? session.totalPuzzlesAttempted
        : await prisma.cubiconTask.count({
            where: { sequenceId: session.sequenceId, isFinal: false },
          });

    const threshold = session.sequence?.passThreshold ?? 0.66;
    const passed = evaluateSequencePass(
      session.passedPuzzles,
      totalTasks > 0 ? totalTasks : 1,
      threshold
    );

    const result: "pass" | "fail" = passed ? "pass" : "fail";
    const ts = Math.floor(Date.now() / 1000);
    const sig = signPanelResult({
      respondentId: effectiveRespondentId,
      result,
      ts,
    });

    // Validate callbackUrl is a real URL
    let redirectBase: URL;
    try {
      redirectBase = new URL(callbackUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid callbackUrl." },
        { status: 400 }
      );
    }

    // Validate callbackUrl domain against client's allowedCallbackDomains
    const clientToValidate = effectiveClientId || session.clientId;
    if (clientToValidate) {
      const client = await prisma.foundingClient.findUnique({
        where: { clientId: clientToValidate },
      });
      if (client) {
        let allowedDomains: string[] = [];
        try {
          allowedDomains = JSON.parse(client.allowedCallbackDomains);
        } catch {
          allowedDomains = [];
        }
        if (allowedDomains.length > 0) {
          const hostname = redirectBase.hostname.toLowerCase();
          const domainAllowed = allowedDomains.some((d) => {
            const allowed = d
              .replace(/^https?:\/\//, "")
              .replace(/\/.*$/, "")
              .toLowerCase();
            return hostname === allowed || hostname.endsWith("." + allowed);
          });
          if (!domainAllowed) {
            return NextResponse.json(
              { error: "callbackUrl domain not approved for this client." },
              { status: 403 }
            );
          }
        }
      }
    }

    // Build signed redirect URL
    redirectBase.searchParams.set("respondentId", effectiveRespondentId);
    redirectBase.searchParams.set("result", result);
    redirectBase.searchParams.set("ts", String(ts));
    redirectBase.searchParams.set("sig", sig);

    // Mark session as panel-completed
    await prisma.cubiconSession.update({
      where: { id: session.id },
      data: { previousResult: `panel_${result}` },
    });

    return NextResponse.json({
      success: true,
      redirectUrl: redirectBase.toString(),
      result,
      respondentId: effectiveRespondentId,
    });
  } catch (error: unknown) {
    console.error("[cubicon-panel/complete] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
