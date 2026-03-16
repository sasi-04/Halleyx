import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { RequestType, RequestStatus, StepType, UserRole } from "@prisma/client";
import { sendHrNotification, sendCeoNotification } from "../services/notificationService";
import { AutomationService } from "../services/automationService";
import { AuditService } from "../services/auditService";

// CEO Dashboard
export async function getCeoDashboard(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.CEO && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    // Get all requests where next_approver_role = ceo
    const pendingCeoApprovals = await prisma.request.findMany({
      where: {
        status: { in: ["in_progress", "pending"] },
        request_data: {
          path: ["next_approver_role"],
          equals: "ceo"
        }
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true }
        }
      }
    });

    const approvedByCeo = await prisma.request.count({
      where: {
        status: "approved",
        request_data: {
          path: ["last_approved_by"],
          equals: "ceo"
        }
      }
    });

    const rejectedByCeo = await prisma.request.count({
      where: {
        status: "rejected",
        request_data: {
          path: ["last_rejected_by"],
          equals: "ceo"
        }
      }
    });

    const highPriorityRequests = await prisma.request.count({
      where: {
        request_data: {
          path: ["priority"],
          equals: "high"
        },
        status: { in: ["in_progress", "pending"] }
      }
    });

    res.json({
      pendingCeoApprovals: pendingCeoApprovals.length,
      approvedByCeo,
      rejectedByCeo,
      highPriorityRequests
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load CEO dashboard" });
  }
}

// Pending CEO Approvals
export async function getCeoPendingApprovals(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.CEO && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const requests = await prisma.request.findMany({
      where: {
        status: { in: ["in_progress", "pending"] },
        request_data: {
          path: ["next_approver_role"],
          equals: "ceo"
        }
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true }
        }
      },
      orderBy: { created_at: "desc" }
    });

    const enrichedRequests = requests.map(request => {
      const requestData = request.request_data as any;
      return {
        requestId: request.id,
        employeeName: request.requester?.name || "Unknown",
        department: request.requester?.department || "Unknown",
        requestType: request.request_type,
        amount: requestData?.amount || 0,
        priority: requestData?.priority || "medium",
        managerDecision: requestData?.manager_approval_status || "pending",
        hrDecision: requestData?.hr_approval_status || "pending",
        submittedDate: request.created_at,
        currentWorkflowStep: requestData?.current_step || 3,
        ...requestData
      };
    });

    res.json({ requests: enrichedRequests });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load pending CEO approvals" });
  }
}

// CEO Approve Request
export async function approveCeoRequest(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.CEO && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { id } = req.params;
    const { comments } = req.body;

    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: true }
    });

    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    const requestData = request.request_data as any;

    // Update request to approved and completed
    await prisma.request.update({
      where: { id },
      data: {
        status: RequestStatus.completed,
        request_data: {
          ...requestData,
          current_step: 5,
          next_approver_role: null,
          ceo_approval_status: "approved",
          ceo_approval_date: new Date().toISOString(),
          ceo_comments: comments,
          ceo_id: req.user?.sub,
          workflow_completed_date: new Date().toISOString(),
          workflow_status: "completed"
        }
      }
    });

    // Create final workflow step record for completion
    await prisma.executionLog.create({
      data: {
        execution_id: `req_${id}`,
        request_id: id,
        step_name: 'Completed',
        step_type: StepType.completion,
        status: RequestStatus.completed,
        approver_id: req.user?.sub,
        error_message: null
      }
    });

    // Add audit logs
    await AuditService.log(id, "ceo_approved", req.user!.sub, comments);
    await AuditService.log(id, "workflow_completed", req.user!.sub, "Workflow completed after CEO approval");

    // Send notification to employee
    await sendHrNotification(request.requested_by, "ceo_approved", { 
      requestId: id, 
      message: "Your request has been approved by the CEO" 
    });

    res.json({ message: "Request approved and workflow completed" });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to approve request" });
  }
}

// CEO Reject Request
export async function rejectCeoRequest(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.CEO && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { id } = req.params;
    const { reason, comments } = req.body;

    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    const requestData = request.request_data as any;

    await prisma.request.update({
      where: { id },
      data: {
        status: "rejected",
        request_data: {
          ...requestData,
          next_approver_role: null,
          last_rejected_by: "ceo",
          ceo_rejection_date: new Date().toISOString(),
          ceo_rejection_reason: reason,
          ceo_comments: comments
        }
      }
    });

    // Add audit log
    await AuditService.log(id, "ceo_rejected", req.user!.sub, comments);

    // Send notification to employee
    await sendHrNotification(request.requested_by, "ceo_rejected", { 
      requestId: id, 
      reason 
    });

    res.json({ message: "Request rejected" });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to reject request" });
  }
}

// Get CEO Request Details
export async function getCeoRequestDetails(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.CEO && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { id } = req.params;

    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true }
        }
      }
    });

    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    res.json({ request });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load request details" });
  }
}

// CEO Audit Logs
export async function getCeoAuditLogs(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.CEO && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { requestId, page = "1", pageSize = "20" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (requestId) where.request_id = requestId;

    // Filter for CEO-related actions
    if (!requestId) {
      where.action = {
        in: ["ceo_approved", "ceo_rejected", "workflow_completed"]
      };
    }

    const logs = await prisma.executionLog.findMany({
      where,
      skip,
      take: pageSizeNum,
      orderBy: { started_at: "desc" },
      include: {
        approver: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({ logs });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load audit logs" });
  }
}

// CEO Automation Rules Check
export async function checkCeoAutomationRules(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.CEO && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { requestId } = req.params;

    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    const requestData = request.request_data as any;
    const amount = requestData?.amount || 0;
    const priority = requestData?.priority || "medium";

    // Check automation rules
    const shouldSkipCeo = AutomationService.shouldSkipCEOApproval(amount, priority);
    const shouldAutoApproveManager = AutomationService.shouldAutoApproveManager(amount);

    res.json({
      shouldSkipCeo,
      shouldAutoApproveManager,
      amount,
      priority,
      recommendation: shouldSkipCeo ? "CEO approval can be skipped" : "CEO approval required"
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to check automation rules" });
  }
}


