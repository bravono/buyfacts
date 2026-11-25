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
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">Thank you for getting in touch, ${escapeHtml(name)}!</h2>
                  <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    We've received your note regarding <strong>${escapeHtml(interest || "General Inquiry")}</strong>. Our team will review the details of your request and follow up with you as soon as possible.
                  </p>
                  
                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 20px; margin: 24px 0;">
                    <h3 style="margin: 0 0 12px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Summary of Your Request</h3>
                    ${company ? `<p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
                    <p style="margin: 4px 0; color: #e2e8f0; font-size: 14px;"><strong>Topic:</strong> ${escapeHtml(interest || "General Inquiry")}</p>
                    <p style="margin: 12px 0 4px 0; color: #94a3b8; font-size: 13px;"><strong>Your Message:</strong></p>
                    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.5; white-space: pre-wrap; font-style: italic;">"${escapeHtml(message)}"</div>
                  </div>

                  <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                    If you have any additional thoughts or updates to share in the meantime, feel free to reply directly to this email.
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
    const cleanFirst = (firstName || "").trim();
    const cleanLast = (lastName || "").trim();
    const fullName = cleanFirst && cleanLast
      ? (cleanFirst.toLowerCase().includes(cleanLast.toLowerCase()) ? cleanFirst : `${cleanFirst} ${cleanLast}`)
      : (cleanFirst || cleanLast || "Valued Client");
    const greetingName = cleanFirst || fullName;
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
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">Welcome to Cubicon, ${escapeHtml(greetingName)}!</h2>
                  <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    Thank you for applying to the <strong>Cubicon Founding Client Program</strong>. We have received and confirmed your registration as an early founding partner.
                  </p>
                  <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    As a founding partner, your organization secures preferential lifetime wholesale rate locks, evaluation tools, and priority access to our 3D visual participant validation suite.
                  </p>

                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
                    <p style="margin: 0 0 12px 0; color: #38bdf8; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Your Founding Client Privileges</p>
                    <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                      <li><strong>30% Permanent Wholesale Price:</strong> Permanent list price lock below commercial launch rates.</li>
                      <li><strong>Real-World Taste Test:</strong> Single-study validation evaluation on an upcoming survey project.</li>
                      <li><strong>100% Refund Guarantee:</strong> Full fee refund if Cubicon does not detect at least 10% automated bot activity.</li>
                      <li><strong>Priority Roadmap Access:</strong> Early access to future BuyFacts innovations and method enhancements.</li>
                    </ul>
                  </div>

                  <p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    Our executive team will reach out to you shortly with next steps and project onboarding details.
                  </p>
                  <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                    If you have any questions or require immediate assistance, simply reply directly to this email or contact us at <a href="mailto:inquiry@buyfacts.com" style="color: #38bdf8; text-decoration: none;">inquiry@buyfacts.com</a>.
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

interface CubiconShareData {
  senderName: string;
  receiverName: string;
  receiverEmail: string;
}

/**
 * Send Transactional Invitation Email for Cubicon 3D Spatial Validation
 */
export async function sendCubiconShareEmail(data: CubiconShareData) {
  try {
    const resend = getResendClient();
    const { senderName, receiverName, receiverEmail } = data;
    const appUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://buyfacts.com"}/cubicon`;

    const emailRes = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: [receiverEmail],
      subject: `Cubicon Preview Suggested by ${senderName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cubicon 3D Invitation</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 32px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 2px solid #8b5cf6;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">BuyFacts® Cubicon</h1>
                  <p style="margin: 6px 0 0 0; color: #a78bfa; font-size: 14px; font-weight: 500;">3D Interactive Human Survey Verification</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">Hello ${escapeHtml(receiverName)},</h2>
                  <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    <strong>${escapeHtml(senderName)}</strong> has invited you to experience <strong>Cubicon</strong> — our revolutionary 3D visual validation system designed to ensure 100% genuine human survey participation by filtering out automated bots.
                  </p>

                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 24px; margin: 24px 0;">
                    <h3 style="margin: 0 0 16px 0; color: #38bdf8; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">How to Use Cubicon</h3>
                    <ol style="margin: 0; padding-left: 20px; color: #e2e8f0; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom: 10px;"><strong>Launch the 3D Canvas:</strong> Click the button below to open the Cubicon 3D spatial view in your browser.</li>
                      <li style="margin-bottom: 10px;"><strong>Rotate & Inspect:</strong> Click and drag anywhere across the 3D model to rotate 360° and inspect all faces of the cube.</li>
                      <li style="margin-bottom: 10px;"><strong>Read the Puzzle Prompt:</strong> Each puzzle specifies a target subject or question located on a specific cube face.</li>
                      <li style="margin-bottom: 10px;"><strong>Circle or Select Target:</strong> Click directly or draw a precise circle around the designated target area on the active face.</li>
                      <li style="margin-bottom: 0;"><strong>Submit & Verify:</strong> Click <em>Submit</em> to validate your spatial responses and verify your human response authenticity.</li>
                    </ol>
                  </div>

                  <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="${appUrl}" target="_blank" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                      Launch Cubicon 3D Spatial App
                    </a>
                  </div>

                  <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 1.5; text-align: center;">
                    If the button above does not work, copy and paste this link into your browser:<br>
                    <a href="${appUrl}" style="color: #38bdf8; word-break: break-all;">${appUrl}</a>
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

    console.log("[Resend] Cubicon share invitation sent to", receiverEmail, emailRes);
    return emailRes;
  } catch (error) {
    console.error("[Resend] Error sending Cubicon share email:", error);
    return null;
  }
}


/**
 * Send Email Verification Link (Section 9.1)
 * Holds message until user verifies their email address within 24 hours.
 */
export async function sendVerificationEmail(data: {
  email: string;
  name: string;
  token: string;
  type?: string;
}) {
  try {
    const resend = getResendClient();
    const { email, name, token, type } = data;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dev.buyfacts.com";
    const verificationUrl = `${baseUrl}/api/verify-email?token=${encodeURIComponent(token)}`;

    const isFoundingClient = type === "founding_client";
    const subject = isFoundingClient
      ? "Action Required: Verify your email to complete your Cubicon Founding Client registration"
      : "Action Required: Verify your email to complete your BuyFacts inquiry";
    const emailRes = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: [email],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${isFoundingClient ? "Verify Your Founding Client Registration" : "Verify Your Email"}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 32px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 2px solid ${isFoundingClient ? "#8b5cf6" : "#3b82f6"};">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">BuyFacts${isFoundingClient ? "® Cubicon" : ""}</h1>
                  <p style="margin: 4px 0 0 0; color: ${isFoundingClient ? "#a78bfa" : "#94a3b8"}; font-size: 14px;">${isFoundingClient ? "Founding Client Program" : "The Early Recognition Company"}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">${isFoundingClient ? `Welcome, ${escapeHtml(name)}!` : `Hello ${escapeHtml(name)},`}</h2>
                  <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    ${isFoundingClient
                      ? "Thank you for registering for the <strong>Cubicon Founding Client Program</strong>. Your registration is currently on hold awaiting business email verification. To protect our research cohort and activate your application, please verify your email address below."
                      : "Your inquiry is currently on hold. To protect our research communications and confirm your identity, please click the button below to verify your email address."}
                  </p>
                  <p style="margin: 0 0 24px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    ${isFoundingClient
                      ? "Once verified, your founding client status will be confirmed, and our executive team will follow up with your cohort onboarding details."
                      : "Once verified, your message will be immediately delivered to the BuyFacts team, and you will hear back within 48 hours."}
                  </p>

                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${verificationUrl}" target="_blank" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">
                      ${isFoundingClient ? "Verify Email & Confirm Registration" : "Verify My Email Address"}
                    </a>
                  </div>

                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                      <strong>Note:</strong> This verification link will remain valid for <strong>24 hours</strong>. If the link expires, you may request a new link at any time. If verification is not completed, your pending registration will not be activated.
                    </p>
                  </div>

                  <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 12px; line-height: 1.5; word-break: break-all;">
                    Direct link: <a href="${verificationUrl}" style="color: #38bdf8;">${verificationUrl}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px; background-color: #0d1117; border-top: 1px solid #30363d; text-align: center; color: #64748b; font-size: 12px;">
                  © ${new Date().getFullYear()} BuyFacts, Inc. All rights reserved.
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log("[Resend] Verification email dispatched to", email);
    return emailRes;
  } catch (error) {
    console.error("[Resend] Error sending verification email:", error);
    return null;
  }
}

/**
 * Send Verification Reminder Email (Automated halfway through 24-hour window)
 */
export async function sendVerificationReminderEmail(data: {
  email: string;
  name: string;
  token: string;
  hoursRemaining?: number;
  type?: string;
}) {
  try {
    const resend = getResendClient();
    const { email, name, token, hoursRemaining = 12, type } = data;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dev.buyfacts.com";
    const verificationUrl = `${baseUrl}/api/verify-email?token=${encodeURIComponent(token)}`;

    const isFoundingClient = type === "founding_client";
    const subject = isFoundingClient
      ? `Reminder: ${hoursRemaining} hours remaining to verify your Cubicon Founding Client registration`
      : `Reminder: ${hoursRemaining} hours remaining to verify your BuyFacts inquiry`;
    const emailRes = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: [email],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Reminder</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 32px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 2px solid #eab308;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">BuyFacts</h1>
                  <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">Inquiry Verification Reminder</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">Hello ${escapeHtml(name)},</h2>
                  <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    We noticed you have not yet confirmed your email. Your inquiry is still waiting for verification.
                  </p>
                  <p style="margin: 0 0 24px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    Please click the button below within the next <strong>${hoursRemaining} hours</strong> to release your inquiry to our team.
                  </p>

                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${verificationUrl}" target="_blank" style="background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">
                      Complete Email Verification
                    </a>
                  </div>

                  <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 12px; line-height: 1.5; word-break: break-all;">
                    Direct link: <a href="${verificationUrl}" style="color: #38bdf8;">${verificationUrl}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px; background-color: #0d1117; border-top: 1px solid #30363d; text-align: center; color: #64748b; font-size: 12px;">
                  © ${new Date().getFullYear()} BuyFacts, Inc. All rights reserved.
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    return emailRes;
  } catch (error) {
    console.error("[Resend] Error sending reminder email:", error);
    return null;
  }
}

/**
 * Deliver verified inquiry to internal mailbox (Section 9.1 -> inquiry@buyfacts.com)
 */
export async function deliverVerifiedInquiry(data: {
  id: string;
  name: string;
  email: string;
  company?: string;
  interest?: string;
  message: string;
  verifiedAt: Date;
}) {
  try {
    const resend = getResendClient();
    const staffEmail = process.env.INQUIRY_RECIPIENT_EMAIL || DEFAULT_NOTIFICATION_EMAIL;

    const emailRes = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: [staffEmail],
      replyTo: data.email,
      subject: `[Verified Inquiry] ${data.interest || "General Inquiry"} from ${data.name}`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; background: #161b22; color: #e6edf3; border-radius: 8px;">
          <h2 style="color: #38bdf8; margin-top: 0;">Verified Contact Inquiry Received</h2>
          <p><strong>Submission ID:</strong> ${escapeHtml(data.id)}</p>
          <p><strong>Sender Name:</strong> ${escapeHtml(data.name)}</p>
          <p><strong>Sender Email:</strong> <a href="mailto:${escapeHtml(data.email)}" style="color: #38bdf8;">${escapeHtml(data.email)}</a></p>
          <p><strong>Company:</strong> ${escapeHtml(data.company || "Not provided")}</p>
          <p><strong>Area of Interest:</strong> ${escapeHtml(data.interest || "General Inquiry")}</p>
          <p><strong>Verified At:</strong> ${data.verifiedAt.toISOString()}</p>
          <hr style="border: none; border-top: 1px solid #30363d; margin: 20px 0;" />
          <h3 style="color: #94a3b8; font-size: 14px; text-transform: uppercase;">Message:</h3>
          <div style="background: #0d1117; padding: 16px; border-radius: 6px; border: 1px solid #30363d; white-space: pre-wrap;">
            ${escapeHtml(data.message)}
          </div>
        </div>
      `,
    });

    console.log("[Resend] Verified inquiry delivered to internal staff mailbox:", staffEmail);
    return emailRes;
  } catch (error) {
    console.error("[Resend] Error delivering verified inquiry:", error);
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
    subject: "Resend Integration Test - BuyFacts",
    html: `
      <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
        <h2 style="color: #38bdf8;">Resend Integration Test Successful</h2>
        <p>If you are reading this email, Resend API key configuration is active and operational for your BuyFacts application.</p>
        <p style="font-size: 12px; color: #94a3b8;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `,
  });
}

/**
 * Password Reset Email (admin portal)
 * Sends a single-use, time-limited link to set a new admin password.
 */
export async function sendPasswordResetEmail(data: {
  email: string;
  name?: string | null;
  token: string;
  expiresInMinutes: number;
}) {
  const resend = getResendClient();
  const { email, name, token, expiresInMinutes } = data;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://buyfacts.com";
  const resetUrl = `${baseUrl}/admin?reset=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name || "there");

  const emailRes = await resend.emails.send({
    from: DEFAULT_FROM_EMAIL,
    to: [email],
    subject: "Reset your BuyFacts admin password",
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0f172a;">
        <h2 style="margin: 0 0 16px; font-size: 20px;">Reset your admin password</h2>
        <p style="margin: 0 0 16px; line-height: 1.6;">Hi ${safeName},</p>
        <p style="margin: 0 0 24px; line-height: 1.6;">
          A password reset was requested for your BuyFacts administrator account.
          This link can be used once and expires in ${expiresInMinutes} minutes.
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${resetUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Set a new password</a>
        </p>
        <p style="margin: 0 0 8px; font-size: 13px; color: #475569; line-height: 1.6;">
          If the button does not work, copy this address into your browser:<br />
          <span style="word-break: break-all;">${resetUrl}</span>
        </p>
        <p style="margin: 24px 0 0; font-size: 13px; color: #64748b; line-height: 1.6;">
          Did not request this? Ignore this email — your password stays unchanged. If you receive several
          of these unexpectedly, tell your super admin.
        </p>
      </div>
    `,
  });

  return emailRes;
}

/**
 * Send founding client onboarding email with their Client ID and integration guide.
 */
export async function sendClientOnboardingEmail(data: {
  clientId: string;
  name: string;
  email: string;
  company?: string;
}) {
  try {
    const resend = getResendClient();
    const { clientId, name, email, company } = data;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://buyfacts.com";

    const emailRes = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: [email],
      subject: "Welcome to the Qubicorn Panel — Your Client ID is Inside",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Qubicorn Panel — Client Onboarding</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 32px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 2px solid #8b5cf6;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">BuyFacts&reg; Qubicorn</h1>
                  <p style="margin: 4px 0 0 0; color: #a78bfa; font-size: 14px;">Founding Client Panel — Onboarding</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">Welcome, ${escapeHtml(name)}!</h2>
                  <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    Your payment has been confirmed and your Qubicorn Founding Client panel access is now active${company ? ` for <strong>${escapeHtml(company)}</strong>` : ""}.
                  </p>

                  <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Your Client ID</p>
                  <div style="background-color: #0d1117; border: 2px solid #8b5cf6; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 700; color: #a78bfa; letter-spacing: 4px;">${escapeHtml(clientId)}</span>
                  </div>

                  <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px; font-weight: 600;">How to send respondents to Qubicorn</p>
                  <p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                    When directing a respondent from your survey platform to Qubicorn, construct a URL with these three query parameters:
                  </p>
                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin-bottom: 24px; font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #38bdf8; word-break: break-all;">
                    ${escapeHtml(baseUrl)}/cubicon?clientId=${escapeHtml(clientId)}&amp;respondentId={RESPONDENT_ID}&amp;callbackUrl={YOUR_REDIRECT_URL}
                  </div>

                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #21262d; color: #a78bfa; font-size: 13px; font-weight: 600; width: 160px;">clientId</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #21262d; color: #cbd5e1; font-size: 13px;">Your unique panel identifier — always <strong>${escapeHtml(clientId)}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #21262d; color: #a78bfa; font-size: 13px; font-weight: 600;">respondentId</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #21262d; color: #cbd5e1; font-size: 13px;">An 8-digit numeric identifier you assign to each respondent in your system</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #a78bfa; font-size: 13px; font-weight: 600;">callbackUrl</td>
                      <td style="padding: 8px 0; color: #cbd5e1; font-size: 13px;">The URL we redirect the respondent to after the puzzle completes, with their result appended</td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                    After the respondent completes the Qubicorn puzzle, they will be redirected to your <code style="background:#0d1117; padding:2px 6px; border-radius:4px; font-size:13px; color:#38bdf8;">callbackUrl</code> with these parameters appended:
                  </p>
                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin-bottom: 24px; font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #38bdf8; word-break: break-all;">
                    {callbackUrl}?respondentId={ID}&amp;result=pass&amp;ts={timestamp}&amp;sig={hmac_signature}
                  </div>

                  <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                    <p style="margin: 0 0 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">Expect a call from us</p>
                    <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">Our team will be reaching out shortly to welcome you personally, answer any questions, and walk you through integration with your specific survey platform.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px; background-color: #0d1117; border-top: 1px solid #30363d; text-align: center; color: #64748b; font-size: 12px;">
                  &copy; ${new Date().getFullYear()} BuyFacts, Inc. All rights reserved. &bull; Keep your Client ID confidential.
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log("[Resend] Client onboarding email dispatched to", email);
    return emailRes;
  } catch (error) {
    console.error("[Resend] Error sending client onboarding email:", error);
    return null;
  }
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
