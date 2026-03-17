import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { RequestType, RequestStatus, UserRole } from "@prisma/client";
import { WorkflowEngine } from "../services/workflowEngine";
import { sendHrNotification } from "../services/notificationService";
import { AutomationService } from "../services/automationService";
import { AuditService } from "../services/auditService";

// Validation schemas
const expenseRequestSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().default("USD"),
  department: z.string().min(1, "Department is required"),
  expenseCategory: z.enum(["travel", "food", "equipment", "software", "other"]),
  expenseDate: z.string().min(1, "Expense date is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  description: z.string().min(1, "Description is required"),
});

const onboardingRequestSchema = z.object({
  newEmployeeName: z.string().min(1, "New employee name is required"),
  email: z.string().email("Valid email is required"),
  position: z.string().min(1, "Position is required"),
  department: z.string().min(1, "Department is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  employmentType: z.enum(["full_time", "contract", "intern"]),
  managerName: z.string().min(1, "Manager name is required"),
  laptopRequired: z.boolean().default(true),
  accessNeeded: z.array(z.string()).min(1, "At least one access option is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().optional(),
});

// ==================== CREATE EXPENSE REQUEST ====================

export async function createExpenseRequest(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    // Handle form data (for file upload)
    let body: any;
    if (req.is('multipart/form-data')) {
      // For multipart form data, fields are in req.body
      body = req.body;
      
      // Parse numeric fields from strings
      if (body.amount) body.amount = parseFloat(body.amount);
    } else {
      body = req.body;
    }

    const parsed = expenseRequestSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const { requestTitle, amount, currency, department, expenseCategory, expenseDate, priority, description } = parsed.data;

    // Get user info for department and validation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, department: true }
    });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }

    // Find or create expense workflow
    let workflow = await prisma.workflow.findFirst({
      where: { name: "Expense Approval Workflow", is_active: true }
    });

    if (!workflow) {
      // Create expense workflow if it doesn't exist
      workflow = await createExpenseWorkflow();
    }

    // Check automatic approval rules
    const shouldAutoApproveManager = AutomationService.shouldAutoApproveManager(amount);
    const shouldSkipCEO = AutomationService.shouldSkipCEOApproval(amount, priority);

    // Handle receipt file if uploaded
    let receiptUrl = null;
    if ((req as any).file) {
      // In a real implementation, you would upload to cloud storage and get URL
      receiptUrl = `/uploads/${(req as any).file.filename}`;
    }

    // Prepare request data
    const requestData = {
      employeeId: user.id,
      employeeName: user.name,
      requestTitle,
      amount,
      currency: currency || "USD",
      department: department || user.department,
      expenseCategory,
      expenseDate,
      priority,
      description,
      receiptUrl,
      current_step: shouldAutoApproveManager ? 2 : 1, // Skip to HR if auto-approved
      next_approver_role: shouldAutoApproveManager ? "hr" : "manager",
      manager_approval_status: shouldAutoApproveManager ? "auto_approved" : "pending",
      skip_ceo_approval: shouldSkipCEO,
      auto_approval_rules: {
        manager_auto_approved: shouldAutoApproveManager,
        ceo_approval_skipped: shouldSkipCEO
      }
    };

    // Create request
    const request = await prisma.request.create({
      data: {
        request_type: RequestType.expense,
        workflow_id: workflow.id,
        requested_by: userId,
        status: RequestStatus.pending,
        request_data: requestData
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true }
        }
      }
    });

    // Start workflow engine
    await WorkflowEngine.startWorkflow(request.id);

    // Create audit log
    await AuditService.log(request.id, "employee_created_expense_request", userId);

    // Send notification to manager
    await notifyApprovers("manager", request.id, "expense_request_created", {
      employeeName: user.name,
      amount: amount.toString(),
      department: department || user.department
    });

    res.status(StatusCodes.CREATED).json({
      message: shouldAutoApproveManager 
        ? "Expense request created and auto-approved by manager" 
        : "Expense request created and sent to manager for approval",
      request
    });
  } catch (err: any) {
    console.error("Error creating expense request:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: err?.message ?? "Failed to create expense request" 
    });
  }
}

// ==================== CREATE ONBOARDING REQUEST ====================

export async function createOnboardingRequest(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const parsed = onboardingRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const { 
      newEmployeeName, email, position, department, joiningDate, employmentType, 
      managerName, laptopRequired, accessNeeded, priority, notes
    } = parsed.data;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, department: true }
    });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }

    // Find or create the onboarding workflow
    let workflow = await prisma.workflow.findFirst({
      where: { name: "Employee Onboarding Workflow", is_active: true }
    });

    if (!workflow) {
      workflow = await createOnboardingWorkflow();
    }

    // Prepare request data
    const requestData = {
      employeeId: user.id,
      employeeName: user.name,
      newEmployeeName,
      email,
      position,
      department,
      joiningDate,
      employmentType,
      managerName,
      laptopRequired,
      accessNeeded,
      priority,
      notes,
      requested_by_name: user.name,
      requested_by_email: user.email,
      current_step: 1,
      next_approver_role: "manager",
      manager_approval_status: "pending"
    };

    // Create request
    const request = await prisma.request.create({
      data: {
        request_type: RequestType.onboarding,
        workflow_id: workflow.id,
        requested_by: userId,
        status: RequestStatus.pending,
        request_data: requestData
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true }
        }
      }
    });

    // Start workflow engine
    await WorkflowEngine.startWorkflow(request.id);

    // Create audit log
    await AuditService.log(request.id, "employee_created_onboarding_request", userId);

    // Send notification to manager
    await notifyApprovers("manager", request.id, "onboarding_request_created", {
      employeeName: user.name,
      newEmployeeName,
      department,
      position
    });

    res.status(StatusCodes.CREATED).json({
      message: "Onboarding request created and sent to manager for approval",
      request
    });
  } catch (err: any) {
    console.error("Error creating onboarding request:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: err?.message ?? "Failed to create onboarding request" 
    });
  }
}

// ==================== VIEW MY REQUESTS ====================

export async function getMyRequests(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const { page = "1", pageSize = "20", status, requestType } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = { requested_by: userId };
    if (status) where.status = status as RequestStatus;
    if (requestType) where.request_type = requestType as RequestType;

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
        let nextApproverRole = null;

        // Get current step information
        if (request.current_step_id) {
          const step = await prisma.step.findUnique({
            where: { id: request.current_step_id },
            select: { name: true, metadata: true }
          });
          if (step) {
            currentStepName = step.name;
            nextApproverRole = (step.metadata as any)?.approverRole || null;
          }
        }

        return {
          id: request.id,
          requestType: request.request_type,
          status: request.status,
          currentStep: requestData?.current_step || 1,
          currentStepName,
          nextApproverRole: nextApproverRole || requestData?.next_approver_role,
          createdDate: request.created_at,
          updatedDate: request.updated_at,
          amount: requestData?.amount || 0,
          priority: requestData?.priority || "medium",
          department: requestData?.department || request.requester?.department,
          description: requestData?.description || requestData?.notes || "",
          employeeName: request.requester?.name,
          // Include relevant request data
          ...(request.request_type === RequestType.expense && {
            amount: requestData?.amount,
            receiptUrl: requestData?.receipt_url
          }),
          ...(request.request_type === RequestType.onboarding && {
            employeeName: requestData?.employee_name,
            role: requestData?.role,
            startDate: requestData?.start_date
          })
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
    console.error("Error fetching requests:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: err?.message ?? "Failed to fetch requests" 
    });
  }
}

// ==================== DELETE MY REQUEST ====================

export async function deleteMyRequest(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const requestId = req.params.id;
    
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (!requestId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "Request ID is required" });

    // Find the request and verify ownership
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      select: { requested_by: true, status: true }
    });

    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    // Verify the request belongs to the authenticated user
    if (request.requested_by !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "You can only delete your own requests" });
    }

    // Only allow deletion of requests that are not already approved or in final stages
    if (request.status === RequestStatus.approved || request.status === RequestStatus.completed) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Cannot delete approved or completed requests" 
      });
    }

    // Delete related records first (execution logs, audit logs)
    await prisma.executionLog.deleteMany({
      where: { execution_id: requestId }
    });

    // Delete the request
    await prisma.request.delete({
      where: { id: requestId }
    });

    // Create audit log for the deletion
    await AuditService.log(requestId, "employee_deleted_request", userId);

    res.json({ 
      message: "Request deleted successfully" 
    });
  } catch (err: any) {
    console.error("Error deleting request:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: err?.message ?? "Failed to delete request" 
    });
  }
}

// ==================== VIEW NOTIFICATIONS ====================

export async function getMyNotifications(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const { page = "1", pageSize = "20", unreadOnly = "false" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    // For now, we'll derive notifications from execution logs
    // In a real implementation, you'd have a dedicated notifications table
    const where: any = {};
    if (unreadOnly === "true") {
      // This would need a read status field in a real notifications table
      where.step_name = { in: ["employee_action_request_created", "manager_approved", "hr_approved", "ceo_approved"] };
    }

    const notifications = await prisma.executionLog.findMany({
      where,
      skip,
      take: pageSizeNum,
      orderBy: { started_at: "desc" },
      include: {
        approver: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    // Transform into notification format
    const formattedNotifications = notifications.map(log => ({
      id: log.id,
      type: log.step_name.replace("employee_action_", ""),
      message: getNotificationMessage(log.step_name.replace("employee_action_", ""), log.approver?.name),
      requestId: log.execution_id,
      timestamp: log.started_at,
      read: false, // Would come from notifications table in real implementation
      user: log.approver
    }));

    res.json({
      notifications: formattedNotifications,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (err: any) {
    console.error("Error fetching notifications:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: err?.message ?? "Failed to fetch notifications" 
    });
  }
}

// ==================== VIEW AUDIT LOGS ====================

export async function getMyAuditLogs(req: AuthedRequest, res: Response) {
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
    console.error("Error fetching audit logs:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: err?.message ?? "Failed to fetch audit logs" 
    });
  }
}

// ==================== HELPER FUNCTIONS ====================

async function createExpenseWorkflow() {
  const workflow = await prisma.workflow.create({
    data: {
      name: "Expense Approval Workflow",
      version: 1,
      is_active: true,
      input_schema: {
        amount: "number",
        department: "string",
        priority: "string",
        description: "string",
        receipt_url: "string"
      }
    }
  });

  // Create workflow steps
  const managerStep = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Manager Approval",
      step_type: "approval",
      order: 1,
      metadata: { approverRole: "manager" }
    }
  });

  const hrStep = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "HR Verification",
      step_type: "approval",
      order: 2,
      metadata: { approverRole: "hr" }
    }
  });

  const ceoStep = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "CEO Approval",
      step_type: "approval",
      order: 3,
      metadata: { approverRole: "ceo" }
    }
  });

  // Set start step
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { start_step_id: managerStep.id }
  });

  return workflow;
}

async function createOnboardingWorkflow() {
  const workflow = await prisma.workflow.create({
    data: {
      name: "Employee Onboarding Workflow",
      version: 1,
      is_active: true,
      input_schema: {
        employee_name: "string",
        department: "string",
        role: "string",
        start_date: "string",
        manager: "string"
      }
    }
  });

  // Create workflow steps
  const managerStep = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Manager Approval",
      step_type: "approval",
      order: 1,
      metadata: { approverRole: "manager" }
    }
  });

  const hrStep = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "HR Verification",
      step_type: "approval",
      order: 2,
      metadata: { approverRole: "hr" }
    }
  });

  const itStep = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "IT Setup",
      step_type: "task",
      order: 3,
      metadata: { approverRole: "it" }
    }
  });

  // Set start step
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { start_step_id: managerStep.id }
  });

  return workflow;
}



async function notifyApprovers(role: string, requestId: string, type: string, data: any) {
  try {
    // Get users with the specified role
    const approvers = await prisma.user.findMany({
      where: { role: role.toUpperCase() as UserRole },
      select: { id: true, name: true, email: true }
    });

    // Send notifications to all approvers
    for (const approver of approvers) {
      await sendHrNotification(approver.id, type, {
        requestId,
        ...data
      });
    }
  } catch (error) {
    console.error('Failed to send notifications:', error);
  }
}

function getNotificationMessage(action: string, userName?: string, requestType?: string): string {
  switch (action) {
    case "request_created":
      return `${userName} submitted a new ${requestType} request`;
    case "manager_approved":
      return `Manager approved your ${requestType} request`;
    case "manager_rejected":
      return `Manager rejected your ${requestType} request`;
    case "hr_approved":
      return `HR approved your ${requestType} request`;
    case "hr_rejected":
      return `HR rejected your ${requestType} request`;
    case "ceo_approved":
      return `CEO approved your ${requestType} request`;
    case "ceo_rejected":
      return `CEO rejected your ${requestType} request`;
    case "workflow_completed":
      return `Your ${requestType} request has been completed`;
    default:
      return `Update on your ${requestType} request`;
  }
}
