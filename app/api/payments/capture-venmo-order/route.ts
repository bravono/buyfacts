import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPaymentReceiptEmail } from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, registrationId } = body;

    if (!orderId || !registrationId) {
      return NextResponse.json(
        { error: "Validation Error: orderId and registrationId are required." },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || "sandbox";

    const baseApi = mode === "live" 
      ? "https://api-m.paypal.com" 
      : "https://api-m.sandbox.paypal.com";

    let captureTransactionId = orderId;
    let paymentSuccess = true;

    if (clientId && clientSecret && !clientId.startsWith("sb_your_") && !orderId.startsWith("MOCK_VENMO_")) {
      // 1. Get OAuth token
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenResponse = await fetch(`${baseApi}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (!tokenResponse.ok) {
        throw new Error(`Failed to obtain PayPal OAuth token: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // 2. Capture PayPal/Venmo Order
      const captureResponse = await fetch(`${baseApi}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!captureResponse.ok) {
        const errText = await captureResponse.text();
        console.error("[PayPal Capture Error Raw Body]:", errText);

        let detailedMsg = `PayPal Order capture failed (${captureResponse.statusText})`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.details && errJson.details.length > 0) {
            const issue = errJson.details[0].issue;
            const description = errJson.details[0].description;
            if (issue === "ORDER_NOT_APPROVED") {
              detailedMsg = "Payment not approved yet: Please approve the payment in your Venmo/PayPal app window before capturing.";
            } else if (issue === "ORDER_ALREADY_CAPTURED") {
              detailedMsg = "This payment order has already been captured.";
            } else {
              detailedMsg = `PayPal Payment Error: ${issue} - ${description}`;
            }
          } else if (errJson.message) {
            detailedMsg = `PayPal Payment Error: ${errJson.message}`;
          }
        } catch (_) {
          // Fallback if not JSON
        }

        throw new Error(detailedMsg);
      }

      const captureData = await captureResponse.json();
      if (captureData.status === "COMPLETED") {
        paymentSuccess = true;
        const purchaseUnit = captureData.purchase_units?.[0];
        const captureItem = purchaseUnit?.payments?.captures?.[0];
        if (captureItem?.id) {
          captureTransactionId = captureItem.id;
        }
      } else {
        paymentSuccess = false;
      }
    } else {
      // Sandbox fallback capture
      console.log(`[Venmo Capture API] Simulated successful capture for fallback order ${orderId}`);
      captureTransactionId = `TXN_${Date.now()}_VENMO`;
    }

    if (!paymentSuccess) {
      return NextResponse.json(
        { error: "Payment capture was not completed by provider." },
        { status: 400 }
      );
    }

    const paidTimestamp = new Date();

    // 3. Update SQLite database record using Prisma
    let updatedRegistration = null;
    try {
      updatedRegistration = await prisma.cubiconRegistration.update({
        where: { id: registrationId },
        data: {
          paymentStatus: "COMPLETED",
          paypalOrderId: captureTransactionId,
          amountPaid: 100.00,
          paidAt: paidTimestamp,
        },
      });
    } catch (dbErr) {
      console.warn("Could not update database record on capture:", dbErr);
    }

    // 4. Send Receipt Email via Resend
    const recipientEmail = updatedRegistration?.email || body.email;
    const recipientName = updatedRegistration 
      ? `${updatedRegistration.firstName} ${updatedRegistration.lastName}` 
      : body.name || "Founding Client";

    if (recipientEmail) {
      sendPaymentReceiptEmail({
        id: registrationId,
        email: recipientEmail,
        name: recipientName,
        amount: 100.00,
        transactionId: captureTransactionId,
        paymentGateway: "Venmo / PayPal",
        paidAt: paidTimestamp.toISOString(),
      }).catch(err => console.error("Failed to send receipt email:", err));
    }

    return NextResponse.json({
      success: true,
      message: "Payment captured successfully!",
      transactionId: captureTransactionId,
      amount: 100.00,
      paidAt: paidTimestamp.toISOString(),
    });

  } catch (error: any) {
    console.error("[Venmo Capture Order API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to capture Venmo payment order." },
      { status: 500 }
    );
  }
}
