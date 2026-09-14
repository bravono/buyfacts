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

    const subject = "Action Required: Verify your email to complete your BuyFacts inquiry";
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
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 32px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 2px solid #3b82f6;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">BuyFacts</h1>
                  <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">The Early Recognition Company</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">Hello ${escapeHtml(name)},</h2>
                  <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    Your inquiry is currently on hold. To protect our research communications and confirm your identity, please click the button below to verify your email address.
                  </p>
                  <p style="margin: 0 0 24px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                    Once verified, your message will be immediately delivered to the BuyFacts team, and you will hear back within 48 hours.
                  </p>

                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${verificationUrl}" target="_blank" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">
                      Verify My Email Address
                    </a>
                  </div>

                  <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                      <strong>Note:</strong> This verification link will remain valid for <strong>24 hours</strong>. If the link expires, you may request a new link at any time. If verification is not completed, your pending submission will not be sent to BuyFacts.
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
}) {
  try {
    const resend = getResendClient();
    const { email, name, token, hoursRemaining = 12 } = data;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dev.buyfacts.com";
    const verificationUrl = `${baseUrl}/api/verify-email?token=${encodeURIComponent(token)}`;

    const subject = `Reminder: ${hoursRemaining} hours remaining to verify your BuyFacts inquiry`;
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

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
