import { sendEmail as sendEmailFromService } from "../services/emailService";

// CommonJS-friendly export (so `require("../utils/sendEmail")` returns the function)
export = sendEmailFromService;
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string) {
  try {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!user || !pass) {
      // eslint-disable-next-line no-console
      console.error("EMAIL FAILED:", "Missing EMAIL_USER/EMAIL_PASS in env");
      return;
    }

    await getTransporter().sendMail({
      from: user,
      to,
      subject,
      text,
    });

    // eslint-disable-next-line no-console
    console.log("EMAIL SUCCESS:", to);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("EMAIL FAILED:", err);
  }
}

