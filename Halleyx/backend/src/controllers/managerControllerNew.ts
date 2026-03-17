import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { RequestType, RequestStatus, UserRole, StepType } from "@prisma/client";
import { AutomationService } from "../services/automationService";
import { sendHrNotification } from "../services/notificationService";
import { AuditService } from "../services/auditService";

// Validation schemas
const approveRequestSchema = z.object({
  comments: z.string().optional()
});

const rejectRequestSchema = z.object({
  reason: z.string().min(1),
  comments: z.string().optional()
});

// ==================== MANAGER DASHBOARD ====================

export async function getManagerDashboard(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    const managerDept = req.user?.department;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.MANAGER && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Manager access required" });
    }

    // Get pending approvals for this manager
    const pendingApprovals = await getPendingApprovalsCount(req.user?.sub || "", managerDept ?? undefined);

    // Get approval statistics
    const approverId = req.user?.sub;
    const [approvedCount, rejectedCount, escalatedCount] = await Promise.all([
      prisma.executionLog.count({
        where: {
          approver_id: approverId,
          step_type: StepType.approval,
          error_message: null // Approved requests
        }
      }),
      prisma.executionLog.count({
        where: {
          approver_id: approverId,
          step_type: StepType.approval,
          error_message: { not: null } // Rejected requests
        }
      }),
      prisma.request.count({
        where: {
          request_data: {
            path: ["next_approver_role"],
            equals: "ceo"
          },
          status: RequestStatus.in_progress
        }
      })
    ]);

    // Get team requests count
    const teamRequests = await prisma.request.count({
      where: managerDept ? { requester: { department: managerDept } } : {}
    });

    res.json({
      pendingApprovals,
      approvedRequests: approvedCount,
      rejectedRequests: rejectedCount,
      escalatedRequests: escalatedCount,
      teamRequests
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load dashboard" });
  }
}

// ==================== PENDING APPROVALS ====================

export async function getManagerPendingApprovals(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    const managerDept = req.user?.department;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.MANAGER && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Manager access required" });
    }

    const { page = "1", pageSize = "20", search = "" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    // Get requests where next_approver_role = manager and manager_approval_status = pending
    const requests = await prisma.request.findMany({
      where: {
        status: { in: [RequestStatus.pending, RequestStatus.in_progress] },
        AND: [
          {
            request_data: {
              path: ["next_approver_role"],
              equals: "manager"
            }
          },
          {
            request_data: {
              path: ["manager_approval_status"],
              equals: "pending"
            }
          }
        ]
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true }
        }
      },
      orderBy: { created_at: "desc" }
    });

    // Filter by department if manager is not admin
    const filteredRequests = managerDept && role !== UserRole.ADMIN
      ? requests.filter(req => req.requester?.department === managerDept)
      : requests;

    // Enrich requests with workflow information
    const enrichedRequests = await Promise.all(
      filteredRequests.map(async (request) => {
        const requestData = request.request_data as any;
        
        // Get current step information
        let currentStepName = null;
        let nextApproverRole = requestData?.next_approver_role || null;
        
        if (request.current_step_id) {
          const step = await prisma.step.findUnique({
            where: { id: request.current_step_id },
            select: { name: true, metadata: true }
          });
          if (step) {
            currentStepName = step.name;
            const stepApproverRole = (step.metadata as any)?.approverRole;
            if (stepApproverRole) {
              nextApproverRole = stepApproverRole;
            }
          }
        }

        return {
          requestId: request.id,
          employeeName: request.requester?.name || "Unknown",
          department: request.requester?.department || "Unknown",
          requestType: request.request_type,
          amount: requestData?.amount || 0,
          priority: requestData?.priority || "medium",
          submittedDate: request.created_at,
          currentWorkflowStep: requestData?.current_step || 1,
          currentStepName,
          status: request.status,
          nextApproverRole,
          // Include relevant request data
          ...(request.request_type === RequestType.expense && {
            receiptUrl: requestData?.receipt_url,
            description: requestData?.description
          }),
          ...(request.request_type === RequestType.onboarding && {
            employeeName: requestData?.employee_name,
            role: requestData?.role,
            startDate: requestData?.start_date,
            manager: requestData?.manager
          })
        };
      })
    );

    // Apply pagination
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedRequests = enrichedRequests.slice(startIndex, endIndex);

    res.json({
      requests: paginatedRequests,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total: filteredRequests.length,
        totalPages: Math.ceil(filteredRequests.length / pageSizeNum)
      }
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load pending approvals" });
  }
}

// ==================== APPROVE REQUEST ====================

export async function approveManagerRequest(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.MANAGER && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Manager access required" });
    }

    const { id } = req.params;
    const parsed = approveRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Validation failed", details: parsed.error.flatten() });
    }

    const { comments } = parsed.data;

    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: true }
    });

    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    const requestData = request.request_data as any;
    const amount = requestData?.amount || 0;
    const requestType = request.request_type;

    // Check if this should be auto-approved
    const shouldAutoApprove = AutomationService.shouldAutoApproveManager(amount);

    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        status: RequestStatus.in_progress,
        request_data: {
          ...requestData,
          current_step: shouldAutoApprove ? 3 : 3, // Move to HR step
          next_approver_role: "hr",
          manager_approval_status: shouldAutoApprove ? "auto_approved" : "approved",
          manager_approval_date: new Date().toISOString(),
          manager_comments: comments,
          manager_id: req.user?.sub,
          // Set auto approval flag if applicable
          auto_approval_rules: {
            manager_auto_approved: shouldAutoApprove,
            amount_threshold: amount < 100
          }
        }
      }
    });

    // Create workflow step record for HR verification
    const hrUser = await prisma.user.findFirst({
      where: { role: UserRole.HR },
      select: { id: true, name: true, email: true }
    });

    if (hrUser) {
      await prisma.executionLog.create({
        data: {
          execution_id: `req_${id}`,
          step_name: 'HR Verification',
          step_type: 'approval',
          evaluated_rules: {},
          status: RequestStatus.pending,
          approver_id: hrUser.id,
          error_message: null
        } as any
      });
    }

    // Create audit log
    const auditAction = shouldAutoApprove ? "auto_manager_approval" : "manager_approved";
    await AuditService.log(id, auditAction, req.user!.sub, comments);

    // Send notification to HR
    await sendNotificationToHR("new_request_awaiting_verification", {
      requestId: id,
      requestType,
      employeeName: request.requester?.name,
      amount,
      department: requestData?.department,
      autoApproved: shouldAutoApprove,
      comments
    });

    const message = shouldAutoApprove 
      ? "Request auto-approved and forwarded to HR"
      : "Request approved and forwarded to HR";

    res.json({
      message,
      request: updatedRequest
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to approve request" });
  }
}

// ==================== REJECT REQUEST ====================

export async function rejectManagerRequest(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.MANAGER && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Manager access required" });
    }

    const { id } = req.params;
    const parsed = rejectRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Validation failed", details: parsed.error.flatten() });
    }

    const { reason, comments } = parsed.data;

    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: true }
    });

    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    const requestData = request.request_data as any;

    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        status: RequestStatus.rejected,
        request_data: {
          ...requestData,
          next_approver_role: null,
          manager_rejection_date: new Date().toISOString(),
          manager_rejection_reason: reason,
          manager_comments: comments,
          manager_id: req.user?.sub
        }
      }
    });

    // Create audit log
    await AuditService.log(id, "manager_rejected", req.user!.sub, comments || reason);

    // Send notification to employee
    await sendNotificationToEmployee(request.requested_by, "request_rejected", {
      requestId: id,
      requestType: request.request_type,
      reason,
      comments
    });

    res.json({
      message: "Request rejected",
      request: updatedRequest
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to reject request" });
  }
}

// ==================== REQUEST MORE INFORMATION ====================

export async function requestMoreInformation(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.MANAGER && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Manager access required" });
    }

    const { id } = req.params;
    const { informationRequired, deadline, comments } = req.body;

    const request = await prisma.request.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    const requestData = request.request_data as any;

    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        request_data: {
          ...requestData,
          information_requested: informationRequired,
          information_request_date: new Date().toISOString(),
          information_deadline: deadline,
          status: "pending_information",
          manager_comments: comments
        }
      }
    });

    // Create audit log
    await AuditService.log(id, "manager_requested_information", req.user!.sub, informationRequired);

    // Send notification to employee
    await sendNotificationToEmployee(request.requested_by, "information_requested", {
      requestId: id,
      informationRequired,
      deadline
    });

    res.json({
      message: "Information request sent to employee",
      request: updatedRequest
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to request more information" });
  }
}

// ==================== VIEW REQUEST DETAILS ====================

export async function getManagerRequestDetails(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.MANAGER && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Manager access required" });
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

    // Get execution information
    const execution = request.execution_id
      ? await prisma.execution.findUnique({
          where: { id: request.execution_id },
          include: {
            executionLogs: { orderBy: { started_at: "asc" } },
            workflow: { include: { steps: { orderBy: { order: "asc" } } } }
          }
        })
      : null;

    // Get current step information
    let currentStep = null;
    if (execution && execution.current_step_id) {
      currentStep = await prisma.step.findUnique({
        where: { id: execution.current_step_id },
        select: { name: true, metadata: true }
      });
    }

    res.json({
      request,
      execution,
      currentStep,
      requestData: request.request_data
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load request details" });
  }
}

// ==================== TEAM REQUESTS ====================

export async function getManagerTeamRequests(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    const managerDept = req.user?.department;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.MANAGER && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Manager access required" });
    }

    const { page = "1", pageSize = "20", status, requestType } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (status) where.status = status as RequestStatus;
    if (requestType) where.request_type = requestType as RequestType;
    if (managerDept && role !== UserRole.ADMIN) {
      where.requester = { department: managerDept };
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { created_at: "desc" },
        include: {
          requester: {
            select: { id: true, name: true, email: true, department: true }
          }
        }
      }),
      prisma.request.count({ where })
    ]);

    // Enrich requests with workflow information
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const requestData = request.request_data as any;
        
        let currentStepName = null;
        let currentStep = requestData?.current_step || 1;
        
        if (request.current_step_id) {
          const step = await prisma.step.findUnique({
            where: { id: request.current_step_id },
            select: { name: true, metadata: true }
          });
          if (step) {
            currentStepName = step.name;
          }
        }

        const exec = request.execution_id
          ? await prisma.execution.findUnique({
              where: { id: request.execution_id },
              select: { status: true }
            })
          : null;
        const derivedStatus = exec?.status === "completed" ? "completed" : exec?.status === "failed" || exec?.status === "canceled" ? "rejected" : request.status;

        return {
          ...request,
          currentStepName,
          derivedStatus,
          amount: requestData?.amount || 0,
          priority: requestData?.priority || "medium"
        };
      })
    );

    res.json({
      requests: enrichedRequests,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load team requests" });
  }
}

// ==================== MANAGER NOTIFICATIONS ====================

export async function getManagerNotifications(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const { page = "1", pageSize = "20", unreadOnly = "false" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    // Get manager's notifications from execution logs
    const notifications = await prisma.executionLog.findMany({
      where: {
        approver_id: userId,
        step_type: StepType.approval
      },
      skip,
      take: pageSizeNum,
      orderBy: { started_at: "desc" },
      include: {
        execution: {
          include: {
            triggeredByUser: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    // Transform into notification format
    const formattedNotifications = notifications.map(log => ({
      id: log.id,
      type: log.step_name.replace("manager_", ""),
      message: getNotificationMessage(log.step_name, log.execution?.triggeredByUser?.name),
      requestId: log.execution_id,
      timestamp: log.started_at,
      read: false, // Would come from notifications table in real implementation
      execution: log.execution
    }));

    res.json({
      notifications: formattedNotifications,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load notifications" });
  }
}

// ==================== MANAGER AUDIT LOGS ====================

export async function getManagerAuditLogs(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const { page = "1", pageSize = "50", requestId, action } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 50;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = { approver_id: userId };
    if (requestId) where.execution_id = requestId as string;
    if (action) where.step_name = action as string;

    const [logs, total] = await Promise.all([
      prisma.executionLog.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { started_at: "desc" }
      }),
      prisma.executionLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load audit logs" });
  }
}

// ==================== HELPER FUNCTIONS ====================

async function getPendingApprovalsCount(userId: string, managerDept?: string) {
  const recent = await prisma.execution.findMany({
    where: {
      status: "in_progress",
      current_step_id: { not: null }
    },
    select: { id: true, current_step_id: true, triggered_by: true }
  });

  const stepIds = [...new Set(recent.map((e) => e.current_step_id).filter(Boolean))] as string[];
  const steps = await prisma.step.findMany({
    where: { id: { in: stepIds }, step_type: StepType.approval },
    select: { id: true, metadata: true }
  });
  const stepById = new Map(steps.map((s) => [s.id, s]));

  let pendingApprovals = 0;
  for (const ex of recent) {
    const step = ex.current_step_id ? stepById.get(ex.current_step_id) : null;
    if (!step) continue;
    const approverRole = (step.metadata as any)?.approverRole;
    if (approverRole !== UserRole.MANAGER) continue;
    
    if (managerDept && ex.triggered_by) {
      const user = await prisma.user.findUnique({
        where: { id: ex.triggered_by },
        select: { department: true }
      });
      if (user?.department !== managerDept) continue;
    }
    pendingApprovals++;
  }

  return pendingApprovals;
}



async function sendNotificationToHR(type: string, data: any) {
  try {
    // Get HR users
    const hrUsers = await prisma.user.findMany({
      where: { role: UserRole.HR },
      select: { id: true, name: true, email: true }
    });

    // Send notifications to all HR users
    for (const hrUser of hrUsers) {
      await sendHrNotification(hrUser.id, type, data);
    }
  } catch (error) {
    console.error('Failed to send HR notification:', error);
  }
}

async function sendNotificationToEmployee(userId: string, type: string, data: any) {
  try {
    await sendHrNotification(userId, type, data);
  } catch (error) {
    console.error('Failed to send employee notification:', error);
  }
}

function getNotificationMessage(action: string, userName?: string, requestType?: string): string {
  switch (action) {
    case "manager_approved":
      return `${userName} approved your ${requestType} request`;
    case "manager_rejected":
      return `${userName} rejected your ${requestType} request`;
    case "auto_manager_approval":
      return `Your ${requestType} request was auto-approved`;
    case "new_request_awaiting_verification":
      return `New request requires your verification`;
    case "request_rejected":
      return `Your request has been rejected`;
    case "request_approved":
      return `Your request has been approved`;
    default:
      return `Update on your request`;
  }
}
