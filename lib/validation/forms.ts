import { z } from "zod";

/**
 * Free/public email provider domain blacklist.
 * Section 8 requires blocking free public email domains for the founding-client inquiry
 * and enforcing that a business email address is supplied.
 */
export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "aim.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "mail.com",
  "email.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "fastmail.com",
  "tutanota.com",
  "tuta.io",
  "inbox.com",
  "mail.ru",
  "hushmail.com",
]);

/**
 * Helper to test whether an email belongs to a business domain (not free public webmail).
 */
export function isBusinessEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || !domain.includes(".")) return false;
  return !FREE_EMAIL_DOMAINS.has(domain);
}

/**
 * General Contact Us Schema (Section 9.1)
 * Required: Full Name, Business Email, Message, and Age Certification.
 * Includes hidden anti-automation honeypot field.
 */
export const ContactInquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters."),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(254, "Email is too long."),
  company: z.string().trim().max(100).optional().default(""),
  interest: z.string().trim().max(100).optional().default("General Inquiry"),
  message: z
    .string()
    .trim()
    .min(5, "Message must be at least 5 characters.")
    .max(5000, "Message cannot exceed 5,000 characters."),
  isEighteen: z
    .boolean()
    .refine((val) => val === true, "You must certify that you are 18 years of age or older."),
  // Hidden anti-automation honeypot: if filled by a bot, the submission is rejected
  hp_website: z
    .string()
    .max(0, "Anti-automation check triggered.")
    .optional()
    .default(""),
});

export type ContactInquiryInput = z.infer<typeof ContactInquirySchema>;

/**
 * Founding Client Inquiry Schema (Section 8)
 * Requires business email domain and explicit US-based organization confirmation.
 */
export const FoundingClientSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required.")
      .max(60, "First name is too long."),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required.")
      .max(60, "Last name is too long."),
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address.")
      .refine(
        isBusinessEmail,
        "A business email address is required. Free email domains (e.g., gmail.com, yahoo.com) are not accepted for founding-client inquiries."
      ),
    emailConfirm: z.string().trim().email("Please confirm your email address."),
    company: z.string().trim().max(100).optional().default(""),
    phone: z.string().trim().max(30).optional().default(""),
    urgency: z.enum(["Low", "Medium", "High"]).optional().default("Medium"),
    requestConfirmation: z.boolean().optional().default(true),
    isEighteen: z
      .boolean()
      .refine((val) => val === true, "You must certify that you are 18 years of age or older."),
    isUsBased: z
      .boolean()
      .refine((val) => val === true, "You must confirm that your organization is US based."),
    notes: z.string().trim().max(2000).optional().default(""),
    selectedAreas: z.any().optional().default({}),
    priorityScore: z.number().optional().default(0),
    hp_website: z
      .string()
      .max(0, "Anti-automation check triggered.")
      .optional()
      .default(""),
  })
  .refine((data) => data.email.toLowerCase() === data.emailConfirm.toLowerCase(), {
    message: "Email addresses do not match.",
    path: ["emailConfirm"],
  });

export type FoundingClientInput = z.infer<typeof FoundingClientSchema>;

/**
 * Feedback Schema (Section 9.4)
 * Requires Name, Email, and Comment so feedback is not anonymous.
 */
export const FeedbackSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required so feedback is not anonymous.")
    .max(100, "Name cannot exceed 100 characters."),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(254, "Email is too long."),
  comment: z
    .string()
    .trim()
    .min(3, "Comment must be at least 3 characters.")
    .max(3000, "Comment cannot exceed 3,000 characters."),
  rating: z
    .number()
    .int()
    .min(0)
    .max(5)
    .optional()
    .default(0),
  sessionId: z.string().trim().optional().default(""),
  hp_website: z
    .string()
    .max(0, "Anti-automation check triggered.")
    .optional()
    .default(""),
});

export type FeedbackInput = z.infer<typeof FeedbackSchema>;

/**
 * Share Schema (Section 9.3)
 */
export const ShareSchema = z.object({
  senderName: z
    .string()
    .trim()
    .min(1, "Sender name is required.")
    .max(100),
  senderEmail: z
    .string()
    .trim()
    .email("Please provide a valid sender email address."),
  receiverName: z
    .string()
    .trim()
    .min(1, "Recipient name is required.")
    .max(100),
  receiverEmail: z
    .string()
    .trim()
    .email("Please provide a valid recipient email address."),
  message: z.string().trim().max(1000).optional().default(""),
  sharePlatform: z.string().trim().optional().default("email"),
  shareUrl: z.string().trim().optional().default(""),
  sessionId: z.string().trim().optional().default(""),
  hp_website: z
    .string()
    .max(0, "Anti-automation check triggered.")
    .optional()
    .default(""),
});

export type ShareInput = z.infer<typeof ShareSchema>;
