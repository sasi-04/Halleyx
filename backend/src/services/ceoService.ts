import { prisma } from "../models/prisma";
import { RequestStatus, RequestType } from "@prisma/client";

/**
 * CEO Service - uses the current Prisma schema (Request, AuditLog, Notification models).
 * This replaces the legacy ceoService that referenced non-existent models
 * (WorkflowRequest, ExecutiveDecision, etc.).
 */

export async function getDashboardSummary() {
  const [pendingCeoApprovals, highPriorityRequests, totalToday, completedWorkflows] =
    await Promise.all([
      prisma.request.count({
        where: {
          status: { in: [RequestStatus.in_progress, RequestStatus.pending] },
          request_data: { path: ["next_approver_role"], equals: "ceo" },
        },
      }),
      prisma.request.count({
        where: {
          request_data: { path: ["priority"], equals: "high" },
          status: { in: [RequestStatus.in_progress, RequestStatus.pending] },
        },
      }),
      prisma.request.count({
        where: {
          created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.request.count({ where: { status: RequestStatus.completed } }),
    ]);

  const recentDecisions = await prisma.auditLog.findMany({
    where: { action: { in: ["ceo_approved", "ceo_rejected"] } },
    orderBy: { timestamp: "desc" },
    take: 5,
    include: {
      user: { select: { id: true, name: true, email: true } },
      request: { select: { id: true, request_type: true, status: true } },
    },
  });

  const escalatedRequests = await prisma.request.findMany({
    where: {
      status: { in: [RequestStatus.in_progress, RequestStatus.pending] },
      request_data: { path: ["next_approver_role"], equals: "ceo" },
    },
    orderBy: { created_at: "desc" },
    take: 5,
    include: {
      requester: { select: { id: true, name: true, email: true, department: true } },
    },
  });

  return {
    cards: {
      pendingCeoApprovals,
      highPriorityRequests,
      totalRequestsToday: totalToday,
      completedWorkflows,
    },
    recentDecisions,
    escalatedRequests,
  };
}

export interface ApprovalFilters {
  department?: string;
  priority?: string;
  from?: string;
  to?: string;
}

export async function getExecutiveApprovals(filters: ApprovalFilters) {
  const where: any = {
    status: { in: [RequestStatus.in_progress, RequestStatus.pending] },
    request_data: { path: ["next_approver_role"], equals: "ceo" },
  };
  if (filters.department) {
    where.requester = { department: filters.department };
  }
  if (filters.from || filters.to) {
    where.created_at = {};
    if (filters.from) where.created_at.gte = new Date(filters.from);
    if (filters.to) where.created_at.lte = new Date(filters.to);
  }

  return prisma.request.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      requester: { select: { id: true, name: true, email: true, department: true } },
    },
  });
}

export async function getApprovalDetail(id: string) {
  return prisma.request.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true, department: true } },
      auditLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { timestamp: "desc" },
      },
    },
  });
}

export interface DecisionHistoryFilters {
  department?: string;
  requestType?: string;
  from?: string;
  to?: string;
}

export async function getDecisionHistory(filters: DecisionHistoryFilters) {
  const where: any = {
    action: { in: ["ceo_approved", "ceo_rejected"] },
  };
  if (filters.from || filters.to) {
    where.timestamp = {};
    if (filters.from) where.timestamp.gte = new Date(filters.from);
    if (filters.to) where.timestamp.lte = new Date(filters.to);
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      request: { select: { id: true, request_type: true, status: true } },
    },
    orderBy: { timestamp: "desc" },
  });
}

export async function getAnalytics() {
  const allRequests = await prisma.request.findMany({
    select: { id: true, request_type: true, status: true, created_at: true, updated_at: true },
  });

  const expenseByStatus = allRequests
    .filter((r) => r.request_type === RequestType.expense)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

  const ceoDecisions = await prisma.auditLog.findMany({
    where: { action: { in: ["ceo_approved", "ceo_rejected"] } },
    select: { action: true },
  });

  const approvedCount = ceoDecisions.filter((d) => d.action === "ceo_approved").length;
  const rejectedCount = ceoDecisions.filter((d) => d.action === "ceo_rejected").length;

  return {
    expenseByStatus,
    approvalsVsRejections: { approved: approvedCount, rejected: rejectedCount },
    totalRequests: allRequests.length,
  };
}

export async function getNotifications(ceoId: string) {
  const notifications = await prisma.notification.findMany({
    where: { user_id: ceoId },
    orderBy: { created_at: "desc" },
    take: 20,
  });
  return notifications;
}

export async function getEscalations(filters: ApprovalFilters) {
  return getExecutiveApprovals(filters);
}

export async function recordExecutiveDecision(
  requestId: string,
  user: any,
  payload: { decision: "APPROVED" | "REJECTED"; comment?: string }
) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) return null;

  const { applyExecutiveDecision } = await import("../workflow-engine/workflowEngine");
  return applyExecutiveDecision(requestId, payload.decision, user?.sub ?? user?.id, payload.comment);
}

export async function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, department: true, created_at: true },
  });
}

export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string; password?: string }
) {
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.password) updateData.password = data.password;
  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, department: true },
  });
}
