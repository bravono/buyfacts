import { Resend } from "resend";

/**
 * Lazy initialization of Resend client
 */
let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not defined in environment variables.");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const rawFrom = process.env.RESEND_FROM_EMAIL || "BuyFacts <onboarding@resend.dev>";
export const DEFAULT_FROM_EMAIL = rawFrom.replace(/^["']|["']$/g, "").trim();

const rawNotify = process.env.RESEND_NOTIFICATION_EMAIL || "admin@buyfacts.com";
export const DEFAULT_NOTIFICATION_EMAIL = rawNotify.replace(/^["']|["']$/g, "").trim();


interface ContactSubmissionData {
  id: string;
  name: string;
  email: string;
  company?: string;
  interest?: string;
  message: string;
}

interface CubiconRegistrationData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  urgency?: string;
  selectedAreas?: Record<string, boolean> | string[];
  priorityScore?: number;
}

/**
 * Send Transactional Emails for Contact Form Submission
 */
export async function sendContactEmails(data: ContactSubmissionData) {
  try {
    const resend = getResendClient();
    const { id, name, email, company, interest, message } = data;

    // 1. User Confirmation Email
    const userEmailPromise = resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: [email],
      subject: "We received your inquiry - BuyFacts®",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Inquiry Confirmation</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 32px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 2px solid #3b82f6;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">BuyFacts®</h1>
                  <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">B2B Research Methods & Tools</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">Thank you for contacting us, ${escapeHtml(name)}!</h2>
                  <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    We have successfully received your inquiry regarding <strong>${escapeHtml(interest || "General Inquiry")}</strong>. Our research team will review your message and get back to you shortly.
                  </p>
                  
                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 20px; margin: 24px 0;">
                    <h3 style="margin: 0 0 12px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Submission Summary</h3>
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Reference ID:</strong> ${escapeHtml(id)}</p>
                    ${company ? `<p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Topic:</strong> ${escapeHtml(interest || "General Inquiry")}</p>
                    <p style="margin: 12px 0 4px 0; color: #94a3b8; font-size: 13px;"><strong>Message:</strong></p>
                    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.5; white-space: pre-wrap; font-style: italic;">"${escapeHtml(message)}"</div>
                  </div>

                  <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                    If you have any urgent questions, feel free to reply directly to this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px; background-color: #0d1117; border-top: 1px solid #30363d; text-align: center; color: #64748b; font-size: 12px;">
                  © ${new Date().getFullYear()} BuyFacts®. All rights reserved.
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    // 2. Admin Notification Email (if notification email is set)
    let adminEmailPromise: Promise<unknown> = Promise.resolve(null);
    if (DEFAULT_NOTIFICATION_EMAIL) {
      adminEmailPromise = resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: [DEFAULT_NOTIFICATION_EMAIL],
        subject: `[New Inquiry] ${name} - ${interest || "General"}`,
        html: `
          <h3>New Contact Submission</h3>
          <p><strong>ID:</strong> ${escapeHtml(id)}</p>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
          <p><strong>Company:</strong> ${escapeHtml(company || "N/A")}</p>
          <p><strong>Interest:</strong> ${escapeHtml(interest || "General Inquiry")}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="background: #f4f4f5; padding: 12px; border-left: 4px solid #3b82f6;">${escapeHtml(message)}</blockquote>
        `,
      });
    }

    const [userRes, adminRes] = await Promise.allSettled([userEmailPromise, adminEmailPromise]);
    console.log("[Resend] Contact emails result:", { userRes, adminRes });

    return { userRes, adminRes };
  } catch (error) {
    console.error("[Resend] Error sending contact emails:", error);
    return null;
  }
}

/**
 * Send Transactional Emails for Cubicon Founding Client Registration
 */
export async function sendCubiconRegistrationEmails(data: CubiconRegistrationData) {
  try {
    const resend = getResendClient();
    const { id, firstName, lastName, email, phone, urgency, selectedAreas, priorityScore } = data;
    const fullName = `${firstName} ${lastName}`.trim();
    const areasFormatted = typeof selectedAreas === "object" && selectedAreas !== null
      ? (Array.isArray(selectedAreas) ? selectedAreas.join(", ") : Object.keys(selectedAreas).filter(k => (selectedAreas as Record<string, boolean>)[k]).join(", "))
      : String(selectedAreas || "None specified");

    // 1. Client Confirmation Email
    const userEmailPromise = resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: [email],
      subject: "Cubicon Founding Client Registration Received - BuyFacts®",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cubicon Registration</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 32px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 2px solid #8b5cf6;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">BuyFacts® Cubicon</h1>
                  <p style="margin: 4px 0 0 0; color: #a78bfa; font-size: 14px;">Founding Client Program</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">Welcome to Cubicon, ${escapeHtml(firstName)}!</h2>
                  <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    Thank you for applying to the <strong>Cubicon Founding Client Program</strong>. We have received your registration and assigned priority routing based on your requirements.
                  </p>

                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 20px; margin: 24px 0;">
                    <h3 style="margin: 0 0 12px 0; color: #a78bfa; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Registration Details</h3>
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Registration ID:</strong> ${escapeHtml(id)}</p>
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Urgency Level:</strong> ${escapeHtml(urgency || "Medium")}</p>
                    ${phone ? `<p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
                    ${areasFormatted ? `<p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Selected Focus Areas:</strong> ${escapeHtml(areasFormatted)}</p>` : ""}
                  </div>

                  <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                    Our executive team will reach out to you shortly with next steps.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px; background-color: #0d1117; border-top: 1px solid #30363d; text-align: center; color: #64748b; font-size: 12px;">
                  © ${new Date().getFullYear()} BuyFacts®. All rights reserved.
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    // 2. Admin Alert Email
    let adminEmailPromise: Promise<unknown> = Promise.resolve(null);
    if (DEFAULT_NOTIFICATION_EMAIL) {
      adminEmailPromise = resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: [DEFAULT_NOTIFICATION_EMAIL],
        subject: `[Cubicon Registration] ${fullName} (Priority Score: ${priorityScore || 0})`,
        html: `
          <h3>New Cubicon Founding Client Registration</h3>
          <p><strong>ID:</strong> ${escapeHtml(id)}</p>
          <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
          <p><strong>Phone:</strong> ${escapeHtml(phone || "N/A")}</p>
          <p><strong>Urgency:</strong> ${escapeHtml(urgency || "Medium")}</p>
          <p><strong>Priority Score:</strong> ${priorityScore || 0}</p>
          <p><strong>Focus Areas:</strong> ${escapeHtml(areasFormatted)}</p>
        `,
      });
    }

    const [userRes, adminRes] = await Promise.allSettled([userEmailPromise, adminEmailPromise]);
    console.log("[Resend] Cubicon registration emails result:", { userRes, adminRes });

    return { userRes, adminRes };
  } catch (error) {
    console.error("[Resend] Error sending Cubicon registration emails:", error);
    return null;
  }
}

interface PaymentReceiptData {
  id: string;
  email: string;
  name: string;
  amount: number;
  transactionId: string;
  paymentGateway?: string;
  paidAt?: string;
}

/**
 * Send Transactional Payment Receipt Email for Founding Client Payment ($100)
 */
export async function sendPaymentReceiptEmail(data: PaymentReceiptData) {
  try {
    const resend = getResendClient();
    const { id, email, name, amount, transactionId, paymentGateway = "Venmo", paidAt } = data;
    const dateFormatted = paidAt ? new Date(paidAt).toLocaleDateString("en-US", { dateStyle: "medium" }) : new Date().toLocaleDateString("en-US", { dateStyle: "medium" });

    const emailRes = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: [email],
      subject: "Official Receipt: $100 Founding Client Deposit - BuyFacts®",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Receipt</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 32px; background: linear-gradient(135deg, #065f46 0%, #0f172a 100%); border-bottom: 2px solid #10b981;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">BuyFacts® Payment Receipt</h1>
                  <p style="margin: 4px 0 0 0; color: #6ee7b7; font-size: 14px;">Founding Client Program</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">Payment Confirmed</h2>
                  <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    Thank you, <strong>${escapeHtml(name)}</strong>! We have received your <strong>$${amount.toFixed(2)} USD</strong> non-refundable founding client payment processed via ${escapeHtml(paymentGateway)}.
                  </p>

                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 20px; margin: 24px 0;">
                    <h3 style="margin: 0 0 12px 0; color: #34d399; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Transaction Summary</h3>
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Registration ID:</strong> ${escapeHtml(id)}</p>
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Transaction ID:</strong> ${escapeHtml(transactionId)}</p>
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Amount Paid:</strong> $${amount.toFixed(2)} USD</p>
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Payment Method:</strong> ${escapeHtml(paymentGateway)}</p>
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Date:</strong> ${escapeHtml(dateFormatted)}</p>
                  </div>

                  <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                    Keep this receipt for your records. If you have any questions regarding your registration, reply directly to this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px; background-color: #0d1117; border-top: 1px solid #30363d; text-align: center; color: #64748b; font-size: 12px;">
                  © ${new Date().getFullYear()} BuyFacts®. All rights reserved.
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log("[Resend] Payment receipt email sent to", email, emailRes);
    return emailRes;
  } catch (error) {
    console.error("[Resend] Error sending payment receipt email:", error);
    return null;
  }
}


/**
 * Diagnostic/Test Email Sender
 */
export async function sendTestEmail(toEmail: string) {
  const resend = getResendClient();
  return await resend.emails.send({
    from: DEFAULT_FROM_EMAIL,
    to: [toEmail],
    subject: "Resend Integration Test - BuyFacts®",
    html: `
      <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
        <h2 style="color: #38bdf8;">Resend Integration Test Successful 🎉</h2>
        <p>If you are reading this email, Resend API key configuration is active and operational for your BuyFacts application.</p>
        <p style="font-size: 12px; color: #94a3b8;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `,
  });
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
