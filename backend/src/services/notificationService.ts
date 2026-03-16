import nodemailer from "nodemailer";
import { prisma } from "../models/prisma";
import { UserRole } from "@prisma/client";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
  port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: (process.env.SMTP_USER || process.env.EMAIL_USER)
    ? {
        user: process.env.SMTP_USER || process.env.EMAIL_USER || "",
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || ""
      }
    : undefined
});

// ==================== IN-APP NOTIFICATION ====================

/**
 * Create an in-app notification for a specific user and optionally send email.
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  requestId?: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        request_id: requestId ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create in-app notification:", error);
  }
}

/**
 * Notify all users with a specific role.
 */
async function notifyByRole(
  role: UserRole,
  type: string,
  title: string,
  message: string,
  requestId?: string
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true, email: true },
    });
    for (const user of users) {
      await createNotification(user.id, type, title, message, requestId);
    }
  } catch (error) {
    console.error(`Failed to notify ${role} users:`, error);
  }
}

// ==================== ROLE-SPECIFIC NOTIFICATIONS ====================

export async function sendManagerNotification(
  requestId: string,
  data: {
    type: string;
    employeeName?: string;
    requestType?: string;
    amount?: number;
    priority?: string;
  }
): Promise<void> {
  const title = data.type === "new_request"
    ? "New Approval Request"
    : "Request Update";
  const message =
    `${data.employeeName ?? "An employee"} submitted a ${data.requestType ?? "workflow"} request` +
    (data.amount ? ` for $${data.amount}` : "") +
    (data.priority ? ` (${data.priority} priority)` : "");

  await notifyByRole(UserRole.MANAGER, data.type, title, message, requestId);
}

export async function sendHrNotification(
  requestIdOrUserId: string,
  typeOrData: string | { type: string; [key: string]: any },
  data?: any
): Promise<void> {
  // Handle both 2-arg and 3-arg call signatures for backwards compatibility
  let type: string;
  let notifData: any;
  let targetUserId: string | null = null;

  if (typeof typeOrData === "string") {
    // 3-arg form: sendHrNotification(userId, type, data)
    type = typeOrData;
    notifData = data ?? {};
    targetUserId = requestIdOrUserId;
  } else {
    // 2-arg form: sendHrNotification(requestId, { type, ... })
    type = typeOrData.type;
    notifData = typeOrData;
  }

  let title = "HR Notification";
  let message = "There has been an update on a request.";

  switch (type) {
    case "awaiting_verification":
    case "new_request_awaiting_verification":
      title = "New Request Awaiting Verification";
      message = `${notifData.employeeName ?? "An employee"} request requires HR verification.`;
      break;
    case "expense_approved":
      title = "Expense Approved";
      message = `Expense request ${notifData.requestId ?? ""} has been approved.`;
      break;
    case "request_rejected":
    case "ceo_rejected":
      title = "Request Rejected";
      message = `Request ${notifData.requestId ?? ""} has been rejected. Reason: ${notifData.reason ?? "N/A"}`;
      break;
    case "information_requested":
      title = "Additional Information Required";
      message = `Additional information is required for request ${notifData.requestId ?? ""}.`;
      break;
    case "ceo_approved":
      title = "Request Approved by CEO";
      message = notifData.message || `Request ${notifData.requestId ?? ""} has been approved by the CEO.`;
      break;
    default:
      title = "Request Update";
      message = `Update on request ${notifData.requestId ?? ""}.`;
  }

  if (targetUserId) {
    await createNotification(targetUserId, type, title, message, notifData.requestId);
  } else {
    // Notify all HR users
    await notifyByRole(UserRole.HR, type, title, message, notifData.requestId ?? requestIdOrUserId);
  }
}

export async function sendCeoNotification(
  requestIdOrType: string,
  data?: any
): Promise<void> {
  let type: string;
  let notifData: any;

  if (data) {
    // 2-arg: sendCeoNotification(type, data)
    type = requestIdOrType;
    notifData = data;
  } else {
    // 1-arg: sendCeoNotification(requestId, { type, ... })
    type = "ceo_notification";
    notifData = { requestId: requestIdOrType };
  }

  let title = "CEO Notification";
  let message = "A request requires your attention.";

  switch (type) {
    case "awaiting_approval":
    case "expense_awaiting_ceo_approval":
    case "request_awaiting_ceo_approval":
      title = "Request Awaiting CEO Approval";
      message = `Request ${notifData.requestId ?? ""} has been forwarded for your approval.`;
      break;
    default:
      title = "CEO Action Required";
      message = `Request ${notifData.requestId ?? ""} requires your attention.`;
  }

  await notifyByRole(UserRole.CEO, type, title, message, notifData.requestId);
}

export async function sendItNotification(
  requestIdOrType: string,
  data?: any
): Promise<void> {
  let type: string;
  let notifData: any;

  if (data) {
    type = requestIdOrType;
    notifData = data;
  } else {
    type = "it_notification";
    notifData = { requestId: requestIdOrType };
  }

  let title = "IT Action Required";
  let message = "IT action is required for a workflow.";

  switch (type) {
    case "setup_required":
    case "onboarding_it_setup_required":
      title = "IT Setup Required";
      message = `New employee onboarding requires IT setup. Request: ${notifData.requestId ?? ""}`;
      break;
  }

  await notifyByRole(UserRole.IT, type, title, message, notifData.requestId);
}

// ==================== EMAIL NOTIFICATIONS ====================

export async function sendEscalationEmail(workflow: any) {
  if (!process.env.CEO_EMAIL) return;
  const subject = `Escalated ${workflow.requestType} request ${workflow.id}`;
  const text = `A request has been escalated for your approval.\n\n` +
    `Employee: ${workflow.employeeName}\n` +
    `Department: ${workflow.department}\n` +
    `Amount: ${workflow.amount ?? "N/A"}\n` +
    `Priority: ${workflow.priority}\n` +
    `Reason: ${workflow.escalationReason ?? "Escalated by workflow rules"}\n`;

  try {
    await transport.sendMail({
      from: process.env.NOTIFICATIONS_FROM || process.env.EMAIL_FROM || "no-reply@workflow.local",
      to: process.env.CEO_EMAIL,
      subject,
      text
    });
  } catch (error) {
    console.error("Failed to send escalation email:", error);
  }
}

export async function sendDecisionEmail(
  workflow: any,
  decision: string,
  comment?: string
) {
  const to = process.env.DEFAULT_EMPLOYEE_EMAIL;
  if (!to) return;
  const subject = `Your request ${workflow.id} was ${decision === "APPROVED" ? "approved" : "rejected"} by CEO`;
  const text =
    `Your ${workflow.requestType.toLowerCase()} request has been ${decision.toLowerCase()} by the CEO.\n\n` +
    (comment ? `Comment: ${comment}\n\n` : "") +
    `Current status: ${workflow.status}\n`;

  try {
    await transport.sendMail({
      from: process.env.NOTIFICATIONS_FROM || process.env.EMAIL_FROM || "no-reply@workflow.local",
      to,
      subject,
      text
    });
  } catch (error) {
    console.error("Failed to send decision email:", error);
  }
}
