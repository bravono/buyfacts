import { NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/resend";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const toEmail = searchParams.get("to");

    if (!toEmail) {
      return NextResponse.json(
        {
          error: "Missing 'to' query parameter. Example: /api/test-email?to=your_email@example.com",
        },
        { status: 400 }
      );
    }

    const result = await sendTestEmail(toEmail);

    return NextResponse.json({
      success: true,
      message: `Test transactional email dispatched to ${toEmail} via Resend.`,
      result,
    });
  } catch (error: any) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to send test email",
        details: error,
      },
      { status: 500 }
    );
  }
}
