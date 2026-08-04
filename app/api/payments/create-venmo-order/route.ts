import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registrationId, amount = 100.00 } = body;

    if (!registrationId) {
      return NextResponse.json(
        { error: "Validation Error: registrationId is required." },
        { status: 400 }
      );
    }

    const registration = await prisma.cubiconRegistration.findUnique({
      where: { id: registrationId },
    }).catch(() => null);

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || "sandbox";

    const baseApi = mode === "live" 
      ? "https://api-m.paypal.com" 
      : "https://api-m.sandbox.paypal.com";

    // Standard $100 Founding Client charge
    const chargeAmount = Number(amount) > 0 ? Number(amount).toFixed(2) : "100.00";

    let orderId: string;
    let approveUrl: string | null = null;

    const reqOrigin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/$/, "") || "http://localhost:3000";
    const returnUrl = `${reqOrigin}/payment`;
    const cancelUrl = `${reqOrigin}/payment?status=cancelled`;

    if (clientId && clientSecret && !clientId.startsWith("sb_your_")) {
      // 1. Get OAuth Access Token from PayPal API
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

      // 2. Create PayPal/Venmo Checkout Order
      const orderResponse = await fetch(`${baseApi}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: registrationId,
              description: "BuyFacts Cubicon Founding Client Fee ($100 One-time)",
              custom_id: registrationId,
              amount: {
                currency_code: "USD",
                value: chargeAmount,
              },
            },
          ],
          payment_source: {
            venmo: {
              experience_context: {
                brand_name: "BuyFacts Cubicon",
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
                return_url: returnUrl,
                cancel_url: cancelUrl,
              },
            },
          },
        }),
      });

      if (!orderResponse.ok) {
        const errDetails = await orderResponse.text();
        console.error("[PayPal API Error]", errDetails);
        throw new Error(`PayPal Order creation failed: ${orderResponse.statusText}`);
      }

      const orderData = await orderResponse.json();
      orderId = orderData.id;
      approveUrl = orderData.links?.find((l: any) => l.rel === "payer-action" || l.rel === "approve")?.href || null;
    } else {
      // Development Fallback Order ID if PayPal keys are not populated yet
      orderId = `MOCK_VENMO_ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      console.log(`[Venmo Order API] Created fallback order ID: ${orderId} for registration ${registrationId}`);
    }

    // Save order details to SQLite via Prisma if record exists
    if (registration) {
      await prisma.cubiconRegistration.update({
        where: { id: registrationId },
        data: {
          paypalOrderId: orderId,
          amountPaid: parseFloat(chargeAmount),
          paymentStatus: "PENDING",
        },
      }).catch(err => console.warn("Failed to update pending payment status:", err));
    }

    return NextResponse.json({
      success: true,
      orderId,
      approveUrl,
      amount: chargeAmount,
      currency: "USD",
    });

  } catch (error: any) {
    console.error("[Venmo Create Order API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create Venmo payment order." },
      { status: 500 }
    );
  }
}
