"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Smartphone, Lock, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import styles from "./payment.module.css";

function PaymentFormContent() {
  const searchParams = useSearchParams();
  
  const registrationId = searchParams.get("registrationId") || searchParams.get("id") || "";
  const initialEmail = searchParams.get("email") || "";
  const initialName = searchParams.get("name") || "";

  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [activeRegId, setActiveRegId] = useState(registrationId);

  const tokenParam = searchParams.get("token");
  const statusParam = searchParams.get("status");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "PROCESSING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txnResult, setTxnResult] = useState<{ transactionId: string; paidAt: string } | null>(null);

  useEffect(() => {
    if (registrationId) setActiveRegId(registrationId);
    if (initialEmail) setEmail(initialEmail);
    if (initialName) setName(initialName);
  }, [registrationId, initialEmail, initialName]);

  // Automatically capture when returning from PayPal approval (token present)
  useEffect(() => {
    if (tokenParam && status !== "SUCCESS" && status !== "PROCESSING") {
      const captureReturnOrder = async () => {
        setLoading(true);
        setStatus("PROCESSING");
        try {
          const regIdToUse = activeRegId || `REG_${Date.now()}`;
          const captureRes = await fetch("/api/payments/capture-venmo-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: tokenParam,
              registrationId: regIdToUse,
              email: email || "Founding Client",
              name: name || "Founding Client",
            }),
          });

          const captureData = await captureRes.json();
          if (!captureRes.ok || !captureData.success) {
            throw new Error(captureData.error || "Failed to capture approved payment.");
          }

          setStatus("SUCCESS");
          setTxnResult({
            transactionId: captureData.transactionId,
            paidAt: captureData.paidAt,
          });
        } catch (err: any) {
          console.error("[PayPal Return Capture Error]", err);
          setStatus("ERROR");
          setErrorMsg(err?.message || "Could not complete payment capture on return.");
        } finally {
          setLoading(false);
        }
      };

      captureReturnOrder();
    } else if (statusParam === "cancelled") {
      setErrorMsg("Payment was cancelled. You can try paying again whenever you are ready.");
    }
  }, [tokenParam, statusParam]);

  const handlePayWithVenmo = async (bypassApproval: boolean = false) => {
    if (!email) {
      setErrorMsg("Please provide your email address associated with your registration.");
      return;
    }

    setLoading(true);
    setStatus("PROCESSING");
    setErrorMsg(null);

    const regIdToUse = activeRegId || `REG_${Date.now()}`;

    try {
      // 1. Create Venmo Order Session
      const createRes = await fetch("/api/payments/create-venmo-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: regIdToUse,
          amount: 100.00,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.orderId) {
        throw new Error(createData.error || "Could not initialize Venmo payment session.");
      }

      // If PayPal returns a hosted approval URL and not bypassing, redirect to PayPal/Venmo approval page
      if (createData.approveUrl && !bypassApproval) {
        window.location.href = createData.approveUrl;
        return;
      }

      const orderIdToCapture = bypassApproval ? `MOCK_VENMO_${createData.orderId}` : createData.orderId;

      // 2. Capture Payment Order
      const captureRes = await fetch("/api/payments/capture-venmo-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderIdToCapture,
          registrationId: regIdToUse,
          email: email,
          name: name || "Founding Client",
        }),
      });

      const captureData = await captureRes.json();
      if (!captureRes.ok || !captureData.success) {
        throw new Error(captureData.error || "Failed to process Venmo payment.");
      }

      setStatus("SUCCESS");
      setTxnResult({
        transactionId: captureData.transactionId,
        paidAt: captureData.paidAt,
      });

    } catch (err: any) {
      console.error("[Venmo Checkout Error]", err);
      setStatus("ERROR");
      setErrorMsg(err?.message || "An unexpected error occurred during payment processing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      {status === "SUCCESS" && txnResult ? (
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <CheckCircle2 size={40} />
          </div>
          <h2 className={styles.cardTitle}>Payment Received</h2>
          <p className={styles.cardSubtitle}>
            Thank you, <strong style={{ color: "#ffffff" }}>{name || email}</strong>! Your $100.00 founding client deposit has been successfully processed via Venmo.
          </p>

          <div className={styles.receiptDetails}>
            <div className={styles.receiptRow}>
              <span>Status:</span>
              <span style={{ color: "#34d399" }}>CONFIRMED</span>
            </div>
            <div className={styles.receiptRow}>
              <span>Transaction ID:</span>
              <span>{txnResult.transactionId}</span>
            </div>
            <div className={styles.receiptRow}>
              <span>Amount Paid:</span>
              <span>$100.00 USD</span>
            </div>
            <div className={styles.receiptRow}>
              <span>Method:</span>
              <span>Venmo / Hosted API</span>
            </div>
            <div className={styles.receiptRow}>
              <span>Receipt Email:</span>
              <span>{email}</span>
            </div>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <Link
              href="/cubicon"
              className={styles.venmoButton}
              style={{ background: "#1e293b", textDecoration: "none" }}
            >
              Return to Cubicon Main Page
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <Link href="/cubicon" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.85rem", textDecoration: "none", marginBottom: "1rem" }}>
              <ArrowLeft size={16} /> Back to Cubicon Registration
            </Link>
            <h1 className={styles.cardTitle}>Founding Client Payment</h1>
            <p className={styles.cardSubtitle}>
              Complete your $100.00 non-refundable founding client deposit to confirm your priority allocation.
            </p>
          </div>

          {errorMsg && (
            <div className={styles.errorMessage}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Program</span>
              <span className={styles.summaryValue}>Cubicon Founding Client</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Client Email</span>
              <span className={styles.summaryValue}>{email || "Founding Client"}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Payment Terms</span>
              <span className={styles.summaryValue}>One-Time (Non-refundable)</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Total Due</span>
              <span className={styles.amountTotal}>$100.00 USD</span>
            </div>
          </div>

          {!email && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
                Your Email Address (used for registration & receipt)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  backgroundColor: "#0d1117",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => handlePayWithVenmo(false)}
              disabled={loading}
              className={styles.venmoButton}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Processing Venmo Order...</span>
                </>
              ) : (
                <>
                  <span className={styles.venmoLogoText}>venmo</span>
                  <span>Pay $100.00 via Venmo</span>
                </>
              )}
            </button>

            {status === "ERROR" && (
              <button
                type="button"
                onClick={() => handlePayWithVenmo(true)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  color: "#34d399",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ⚡ Bypass Approval & Complete Sandbox Test ($100)
              </button>
            )}
          </div>

          <div className={styles.guaranteeBox}>
            <div className={styles.guaranteeItem}>
              <Smartphone size={16} style={{ color: "#008cff" }} />
              <span>Mobile & Desktop QR Compatible</span>
            </div>
            <div className={styles.guaranteeItem}>
              <ShieldCheck size={16} style={{ color: "#10b981" }} />
              <span>Zero Card Data Stored</span>
            </div>
            <div className={styles.guaranteeItem}>
              <Lock size={16} style={{ color: "#8b5cf6" }} />
              <span>Hosted Gateway Security</span>
            </div>
            <div className={styles.guaranteeItem}>
              <CheckCircle2 size={16} style={{ color: "#f59e0b" }} />
              <span>Instant Receipt Emailed</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.logoText}>
          Buy<span className={styles.logoAccent}>Facts</span><sup>®</sup>
        </div>
        <span className={styles.badge}>Secure Checkout</span>
      </header>

      <Suspense fallback={<div style={{ color: "#94a3b8", padding: "2rem" }}>Loading Payment Checkout...</div>}>
        <PaymentFormContent />
      </Suspense>

      <footer className={styles.footerNote}>
        Questions about your payment? Contact us at{" "}
        <a href="mailto:inquiries@buyfacts.com">inquiries@buyfacts.com</a>
        <div>© {new Date().getFullYear()} BuyFacts®. All rights reserved.</div>
      </footer>
    </div>
  );
}
