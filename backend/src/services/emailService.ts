import nodemailer from "nodemailer";
import { prisma } from "../models/prisma";
import { UserRole } from "@prisma/client";

export class EmailService {
  private readonly enabled: boolean;
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor() {
    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT || "587");
    const secure = String(process.env.EMAIL_SECURE || "false") === "true";
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    this.from = process.env.EMAIL_FROM || "Halleyx Workflows <no-reply@halleyx.local>";

    this.enabled = Boolean(host && user && pass);
    this.transporter = this.enabled
      ? nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
        })
      : null;
  }

  async notifyRole(params: {
    role: UserRole;
    subject: string;
    text: string;
  }) {
    const recipients = await prisma.user.findMany({
      where: { role: params.role },
      select: { email: true, name: true },
    });
    const to = recipients.map((r) => r.email).filter(Boolean);
    if (to.length === 0) return { delivered: false, reason: "no_recipients" as const };

    if (!this.enabled || !this.transporter) {
      // fallback for local dev without SMTP
      // eslint-disable-next-line no-console
      console.log("[email:dev]", { to, subject: params.subject, text: params.text });
      return { delivered: false, reason: "smtp_not_configured" as const, to };
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: params.subject,
      text: params.text,
    });
    return { delivered: true, to };
  }
}

