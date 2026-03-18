import nodemailer from "nodemailer";
import { prisma } from "../models/prisma";
import { UserRole } from "@prisma/client";
import { getFixedApproverEmail } from "../config/approverDirectory";

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class EmailService {
  private readonly enabled: boolean;
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly smtpUser: string | null;

  constructor() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    this.smtpUser = user ? String(user) : null;
    // Prefer the real Gmail user as "from" to avoid Gmail rejections.
    this.from = process.env.EMAIL_FROM || this.smtpUser || "no-reply@halleyx.local";

    this.enabled = Boolean(user && pass);
    this.transporter = this.enabled
      ? nodemailer.createTransport({
          service: "gmail",
          auth: { user, pass },
        })
      : null;

    // Never fail silently: log explicit SMTP status at startup.
    // eslint-disable-next-line no-console
    console.log("[email] smtp", {
      enabled: this.enabled,
      user: this.smtpUser,
    });
    if (this.enabled && this.transporter) {
      this.transporter
        .verify()
        .then(() => {
          // eslint-disable-next-line no-console
          console.log("[email] smtp verified");
        })
        .catch((err: any) => {
          // eslint-disable-next-line no-console
          console.error("[email] smtp verify failed", err?.message ?? err);
        });
    }
  }

  async sendEmail(to: string | string[], subject: string, html: string) {
    const recipients = Array.isArray(to) ? to : [to].filter(Boolean);
    if (recipients.length === 0) {
      // eslint-disable-next-line no-console
      console.warn("[email] no recipients provided");
      return { delivered: false, reason: "no_recipients" as const };
    }

    if (!this.enabled || !this.transporter) {
      // eslint-disable-next-line no-console
      console.log("[email:dev] SMTP not configured", {
        to: recipients,
        subject,
        htmlPreview: html.slice(0, 120),
      });
      return { delivered: false, reason: "smtp_not_configured" as const, to: recipients };
    }

    try {
      await this.transporter.sendMail({
        from: `"Halleyx Workflow" <${this.from}>`,
        to: recipients,
        subject,
        html,
      });
      // eslint-disable-next-line no-console
      console.log("[email] sent", { to: recipients, subject });
      // Required debug log format (per your checklist)
      // eslint-disable-next-line no-console
      console.log("EMAIL SUCCESS:", recipients.join(", "));
      return { delivered: true, to: recipients };
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[email] send failed", { to: recipients, subject, error: err?.message });
      // Required debug log format (per your checklist)
      // eslint-disable-next-line no-console
      console.error("EMAIL FAILED:", err);
      return { delivered: false, reason: "send_failed" as const, error: err?.message };
    }
  }

  async notifyRole(params: {
    role: UserRole;
    subject: string;
    html: string;
  }) {
    // Hard enforcement for workflow approvers (exact emails mandated)
    const fixed = getFixedApproverEmail(params.role);
    if (fixed) {
      // eslint-disable-next-line no-console
      console.log(`[email] fixed recipient for ${params.role}:`, fixed);
      return this.sendEmail(fixed, params.subject, params.html);
    }

    // Fallback (other roles): notify all users with that role
    const recipients = await prisma.user.findMany({
      where: { role: params.role },
      select: { email: true },
    });
    const to = recipients.map((r) => r.email).filter(Boolean);
    if (to.length === 0) return { delivered: false, reason: "no_recipients" as const };

    return this.sendEmail(to, params.subject, params.html);
  }

  async sendRequestStatusEmail(params: {
    to: string;
    name: string;
    title: string;
    stageName: string;
    level: number | string;
    status: "APPROVED" | "PENDING" | "REJECTED";
  }) {
    if (!params.to) return { delivered: false, reason: "no_recipient" as const };

    const subject = "Halleyx Workflow Update";

    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0f172a; padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #020617; border-radius: 12px; border: 1px solid #1e293b;">
          <tr>
            <td style="padding: 20px 24px; border-bottom: 1px solid #1e293b; background: linear-gradient(135deg,#1d4ed8,#22c55e); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 20px; color: #f9fafb;">Halleyx Workflow System</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 12px; font-size: 14px; color: #e5e7eb;">
                Hello ${params.name || "User"},
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; color: #cbd5f5;">
                Your request "<strong>${params.title}</strong>" has been updated.
              </p>
              <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 0 0 16px;">
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #9ca3af; width: 140px;">Status:</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #e5e7eb;">${params.status}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #9ca3af;">Current Stage:</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #e5e7eb;">${params.stageName}</td>
                </tr>
              </table>
              <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">
                You can view full details and track progress in the Halleyx Workflow Studio.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 20px; border-top: 1px solid #1e293b;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #9ca3af;">
                Thank you,
              </p>
              <p style="margin: 0; font-size: 12px; color: #e5e7eb;">
                Halleyx Team
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;

    return this.sendEmail(params.to, subject, html);
  }
}

// Stable/simple helper API used by the forced request flow.
// Uses the singleton instance created in `app.ts` when possible,
// but can also be imported in controllers safely.
let emailServiceSingleton: EmailService | null = null;
function getEmailServiceSingleton() {
  // Important: `dotenv.config()` is executed in `app.ts` at runtime,
  // but imports (and module-level singletons) are evaluated before that.
  // Lazily constructing ensures env vars are available.
  if (!emailServiceSingleton) emailServiceSingleton = new EmailService();
  return emailServiceSingleton;
}

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const result = await getEmailServiceSingleton().sendEmail(to, subject, html);
    // eslint-disable-next-line no-console
    if (result.delivered) console.log("EMAIL SENT:", to);
    return result;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("EMAIL ERROR:", err);
    throw err;
  }
}

