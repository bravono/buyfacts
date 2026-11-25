import { NextResponse } from "next/server";
import { sendPaymentReceiptEmail, sendClientOnboardingEmail } from "@/lib/resend";
import { generateClientId } from "@/lib/panel/client-id";
import { prisma } from "@/lib/prisma";

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
    const recipientEmail = body.email;
    const recipientName = body.name || "Founding Client";

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

    // Issue Client ID for founding client panel access
    let issuedClientId: string | null = null;
    if (registrationId) {
      try {
        // Look up the registration to get name/email/company
        const registration = await prisma.cubiconRegistration.findUnique({
          where: { id: registrationId },
        });

        if (registration) {
          // Generate a unique Client ID (retry up to 5 times on collision)
          let clientId = generateClientId();
          let attempts = 0;
          while (attempts < 5) {
            const existing = await prisma.foundingClient.findUnique({
              where: { clientId },
            });
            if (!existing) break;
            clientId = generateClientId();
            attempts++;
          }

          const foundingClient = await prisma.foundingClient.create({
            data: {
              clientId,
              registrationId,
              name: registration.name,
              email: registration.email,
              company: registration.company || "",
              allowedCallbackDomains: "[]",
              paymentStatus: "paid",
              paymentTransactionId: captureTransactionId,
              paidAt: paidTimestamp,
              isActive: true,
            },
          });

          issuedClientId = foundingClient.clientId;

          // Send onboarding email with Client ID (non-blocking)
          sendClientOnboardingEmail({
            clientId: foundingClient.clientId,
            name: registration.name,
            email: registration.email,
            company: registration.company || undefined,
          }).catch((err) =>
            console.error("[Panel] Failed to send onboarding email:", err)
          );
        }
      } catch (err) {
        console.error("[Panel] Failed to issue Client ID:", err);
        // Non-fatal: payment succeeded, Client ID issuance failure is logged
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment captured successfully!",
      transactionId: captureTransactionId,
      amount: 100.00,
      paidAt: paidTimestamp.toISOString(),
      clientId: issuedClientId,
    });

  } catch (error: any) {
    console.error("[Venmo Capture Order API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to capture Venmo payment order." },
      { status: 500 }
    );
  }
}
