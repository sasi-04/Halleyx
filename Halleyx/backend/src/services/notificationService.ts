import { prisma } from "../models/prisma";
import { UserRole } from "@prisma/client";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  requestId?: string,
): Promise<void> {
  await prisma.notification.create({
    data: {
      user_id: userId,
      type,
      title,
      message,
      request_id: requestId ?? null,
    },
  });
}

async function notifyByRole(
  role: UserRole,
  type: string,
  title: string,
  message: string,
  requestId?: string,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role },
    select: { id: true },
  });
  await Promise.all(users.map((u) => createNotification(u.id, type, title, message, requestId)));
}

export async function sendManagerNotification(
  requestId: string,
  data: { type: string; employeeName?: string; requestType?: string; amount?: number; priority?: string },
): Promise<void> {
  const title = data.type === "new_request" ? "New Approval Request" : "Request Update";
  const message =
    `${data.employeeName ?? "An employee"} submitted a ${data.requestType ?? "workflow"} request` +
    (data.amount != null ? ` for ₹${data.amount}` : "") +
    (data.priority ? ` (${data.priority} priority)` : "");

  await notifyByRole(UserRole.MANAGER, data.type, title, message, requestId);
}

export async function sendHrNotification(
  requestIdOrUserId: string,
  typeOrData: string | { type: string; [key: string]: any },
  data?: any,
): Promise<void> {
  const isThreeArgForm = typeof typeOrData === "string";
  const type = isThreeArgForm ? (typeOrData as string) : (typeOrData as any).type;
  const notifData = isThreeArgForm ? (data ?? {}) : typeOrData;
  const targetUserId = isThreeArgForm ? requestIdOrUserId : null;

  let title = "HR Notification";
  let message = "There has been an update on a request.";

  if (type === "awaiting_verification" || type === "new_request_awaiting_verification") {
    title = "New Request Awaiting Verification";
    message = `${notifData.employeeName ?? "An employee"} request requires HR verification.`;
  } else if (type === "request_rejected" || type === "ceo_rejected") {
    title = "Request Rejected";
    message = `Request ${notifData.requestId ?? ""} has been rejected. Reason: ${notifData.reason ?? "N/A"}`;
  } else if (type === "ceo_approved") {
    title = "Request Approved by CEO";
    message = notifData.message || `Request ${notifData.requestId ?? ""} has been approved by the CEO.`;
  }

  if (targetUserId) {
    await createNotification(targetUserId, type, title, message, notifData.requestId);
  } else {
    await notifyByRole(UserRole.HR, type, title, message, notifData.requestId ?? requestIdOrUserId);
  }
}

export async function sendCeoNotification(typeOrRequestId: string, data?: any): Promise<void> {
  const type = data ? typeOrRequestId : "ceo_notification";
  const notifData = data ?? { requestId: typeOrRequestId };

  const title = "Request Awaiting CEO Approval";
  const message = `Request ${notifData.requestId ?? ""} has been forwarded for your approval.`;
  await notifyByRole(UserRole.CEO, type, title, message, notifData.requestId);
}

export async function sendItNotification(typeOrRequestId: string, data?: any): Promise<void> {
  const type = data ? typeOrRequestId : "it_notification";
  const notifData = data ?? { requestId: typeOrRequestId };

  const title = "IT Setup Required";
  const message = `New employee onboarding requires IT setup. Request: ${notifData.requestId ?? ""}`;
  await notifyByRole(UserRole.IT, type, title, message, notifData.requestId);
}
