import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidClientId, isValidRespondentId } from "@/lib/panel/client-id";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId")?.trim();
    const respondentId = searchParams.get("respondentId")?.trim();
    const callbackUrl = searchParams.get("callbackUrl")?.trim();

    if (!clientId || !callbackUrl) {
      return NextResponse.json(
        { valid: false, error: "clientId and callbackUrl are required." },
        { status: 400 }
      );
    }

    if (!isValidClientId(clientId)) {
      return NextResponse.json(
        { valid: false, error: "Invalid Client ID format." },
        { status: 400 }
      );
    }

    if (respondentId && !isValidRespondentId(respondentId)) {
      return NextResponse.json(
        { valid: false, error: "Respondent ID must be an 8-digit number." },
        { status: 400 }
      );
    }

    // Parse and validate callbackUrl is a real HTTPS URL
    let callbackHostname: string;
    try {
      const parsed = new URL(callbackUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return NextResponse.json(
          { valid: false, error: "callbackUrl must use http or https." },
          { status: 400 }
        );
      }
      callbackHostname = parsed.hostname;
    } catch {
      return NextResponse.json(
        { valid: false, error: "callbackUrl is not a valid URL." },
        { status: 400 }
      );
    }

    // Look up the client
    const client = await prisma.foundingClient.findUnique({
      where: { clientId },
    });

    if (!client || !client.isActive || client.paymentStatus !== "paid") {
      return NextResponse.json(
        { valid: false, error: "Client ID not found or not active." },
        { status: 403 }
      );
    }

    // Validate callbackUrl domain against allowedCallbackDomains
    // If the list is empty, allow any domain (for onboarding before domains are configured)
    let allowedDomains: string[] = [];
    try {
      allowedDomains = JSON.parse(client.allowedCallbackDomains);
    } catch {
      allowedDomains = [];
    }

    if (allowedDomains.length > 0) {
      const domainAllowed = allowedDomains.some((d) => {
        const allowed = d
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, "")
          .toLowerCase();
        return (
          callbackHostname.toLowerCase() === allowed ||
          callbackHostname.toLowerCase().endsWith("." + allowed)
        );
      });

      if (!domainAllowed) {
        return NextResponse.json(
          {
            valid: false,
            error:
              "callbackUrl domain is not on the approved list for this client.",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ valid: true, clientName: client.name });
  } catch (error: unknown) {
    console.error("[cubicon-panel/validate] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
