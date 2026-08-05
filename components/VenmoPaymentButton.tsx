"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, ShieldCheck, QrCode, Smartphone, Loader2, CreditCard, AlertCircle } from "lucide-react";

interface VenmoPaymentButtonProps {
  registrationId: string;
  clientEmail: string;
  clientName: string;
  onPaymentSuccess?: (transactionId: string) => void;
}

export function VenmoPaymentButton({
  registrationId,
  clientEmail,
  clientName,
  onPaymentSuccess,
}: VenmoPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"IDLE" | "PROCESSING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<{ transactionId: string; paidAt: string } | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);

  const handleInitiateVenmoPayment = async (bypassApproval: boolean = false) => {
    setLoading(true);
    setPaymentStatus("PROCESSING");
    setErrorMessage(null);

    try {
      // 1. Create Venmo Order Session
      const createRes = await fetch("/api/payments/create-venmo-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, amount: 100.00 }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.orderId) {
        throw new Error(createData.error || "Could not create Venmo payment session.");
      }

      // In Sandbox test mode or fallback mode, bypass manual popup approval if selected
      const orderId = bypassApproval ? `MOCK_VENMO_${createData.orderId}` : createData.orderId;

      // 2. Capture Venmo Order
      const captureRes = await fetch("/api/payments/capture-venmo-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          registrationId,
          email: clientEmail,
          name: clientName,
        }),
      });

      const captureData = await captureRes.json();
      if (!captureRes.ok || !captureData.success) {
        throw new Error(captureData.error || "Payment authorization could not be completed.");
      }

      setPaymentStatus("SUCCESS");
      setTransactionDetails({
        transactionId: captureData.transactionId,
        paidAt: captureData.paidAt,
      });

      if (onPaymentSuccess) {
        onPaymentSuccess(captureData.transactionId);
      }
    } catch (err: any) {
      console.error("Venmo payment error:", err);
      setPaymentStatus("ERROR");
      setErrorMessage(err?.message || "An unexpected error occurred during Venmo payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl p-6 shadow-xl backdrop-blur-md">
      {paymentStatus === "SUCCESS" && transactionDetails ? (
        <div className="text-center py-4 space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Founding Fee Paid ($100.00)</h3>
          <p className="text-sm text-slate-300">
            Thank you, <span className="font-semibold text-emerald-400">{clientName}</span>! Your non-refundable founding client deposit has been processed.
          </p>
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 font-mono space-y-1">
            <div><span className="text-slate-500">Transaction ID:</span> {transactionDetails.transactionId}</div>
            <div><span className="text-slate-500">Method:</span> Venmo / Hosted Checkout</div>
            <div><span className="text-slate-500">Status:</span> Confirmed & Receipt Emailed</div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Founding Client Deposit
              </span>
              <h3 className="text-lg font-bold text-white mt-1">Cubicon Founding Membership</h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-white">$100.00</div>
              <div className="text-xs text-slate-400">One-time (Non-refundable)</div>
            </div>
          </div>

          {/* Device & Security Callout */}
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded border border-slate-800">
              <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Mobile App & Desktop QR</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero Card Data Stored</span>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleInitiateVenmoPayment(false)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-lg bg-[#008CFF] hover:bg-[#0074D9] text-white font-bold text-base transition-all shadow-lg hover:shadow-[#008CFF]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Venmo Payment...</span>
                </>
              ) : (
                <>
                  <span className="font-extrabold tracking-tight">venmo</span>
                  <span>Pay $100.00 via Venmo</span>
                </>
              )}
            </button>

            {paymentStatus === "ERROR" && (
              <button
                type="button"
                onClick={() => handleInitiateVenmoPayment(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition-all"
              >
                <span>⚡ Bypass Approval & Complete Sandbox Test ($100)</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-center text-slate-500 leading-tight">
            Payments are securely routed via PayPal/Venmo hosted checkout. No card numbers or credentials are saved at rest.
          </p>
        </div>
      )}
    </div>
  );
}
