import { prisma } from "../models/prisma";
import { RequestStatus } from "@prisma/client";

/**
 * Workflow Engine helpers for CEO escalation logic.
 * Uses the current Prisma schema (Request model).
 */

export interface EscalationEligibility {
  requiresCeo: boolean;
  reason?: string;
}

export function getEscalationEligibility(request: {
  id: string;
  request_data: any;
}): EscalationEligibility {
  const data = request.request_data as any;
  const amount = data?.amount ?? 0;
  const priority = data?.priority ?? "medium";

  if (data?.next_approver_role === "ceo") {
    return { requiresCeo: true, reason: "Workflow routing requires CEO approval" };
  }

  if (amount > 5000) {
    return { requiresCeo: true, reason: "High value expense requires CEO approval" };
  }

  if (priority === "high") {
    return { requiresCeo: true, reason: "High priority request requires CEO approval" };
  }

  return { requiresCeo: false };
}

export async function applyExecutiveDecision(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  ceoId: string,
  comment?: string
): Promise<{ id: string; status: RequestStatus }> {
  const newStatus =
    decision === "APPROVED" ? RequestStatus.completed : RequestStatus.rejected;

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      status: newStatus,
      request_data: {
        ...(await prisma.request.findUnique({ where: { id: requestId } }).then((r) => r?.request_data as any ?? {})),
        ceo_approval_status: decision === "APPROVED" ? "approved" : "rejected",
        ceo_decision_date: new Date().toISOString(),
        ceo_id: ceoId,
        ceo_comments: comment,
        next_approver_role: null,
      },
    },
    select: { id: true, status: true },
  });

  return updated;
}
