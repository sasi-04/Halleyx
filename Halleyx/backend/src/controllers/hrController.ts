import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { RequestType, RequestStatus, StepType, UserRole } from "@prisma/client";
import { sendHrNotification, sendCeoNotification, sendItNotification } from "../services/notificationService";
import { AuditService } from "../services/auditService";

function normalizeOnboardingData(data: any) {
  return {
    employee_name: data?.employee_name ?? data?.employeeName ?? null,
    department: data?.department ?? null,
    role: data?.role ?? null,
    start_date: data?.start_date ?? data?.startDate ?? null,
    manager: data?.manager ?? null,
    notes: data?.notes ?? null,
    identity_proof_url: data?.identity_proof_url ?? data?.identityProofUrl ?? null,
    education_certificates_url:
      data?.education_certificates_url ?? data?.educationCertificatesUrl ?? null,
    offer_letter_url: data?.offer_letter_url ?? data?.offerLetterUrl ?? null,
    other_attachments: data?.other_attachments ?? data?.otherAttachments ?? null,
  };
}

export async function getHrOnboardingQueue(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const recent = await prisma.execution.findMany({
      where: { status: "in_progress", current_step_id: { not: null } },
      orderBy: { started_at: "desc" },
      take: 200,
      include: { triggeredByUser: { select: { id: true, name: true, email: true } } },
    });

    const stepIds = Array.from(new Set(recent.map((e) => e.current_step_id).filter(Boolean))) as string[];
    const steps = await prisma.step.findMany({
      where: { id: { in: stepIds }, step_type: StepType.approval },
      select: { id: true, name: true, metadata: true, workflow_id: true },
    });
    const stepById = new Map(steps.map((s) => [s.id, s]));

    const executionIds = recent.map((e) => e.id);
    const requests = await prisma.request.findMany({
      where: { execution_id: { in: executionIds }, request_type: RequestType.onboarding },
      include: { requester: { select: { id: true, name: true, email: true, department: true } } },
    });
    const requestByExec = new Map(requests.map((r) => [r.execution_id!, r]));

    const items = recent
      .map((ex) => {
        const step = ex.current_step_id ? stepById.get(ex.current_step_id) : null;
        if (!step) return null;
        const approverRole = (step.metadata as any)?.approverRole as UserRole | undefined;
        if (approverRole !== UserRole.HR && role !== UserRole.ADMIN) return null;

        const request = requestByExec.get(ex.id);
        if (!request) return null;

        const data = normalizeOnboardingData(request.request_data);
        return {
          execution_id: ex.id,
          request_id: request.id,
          submitted_by: request.requester?.name ?? ex.triggeredByUser?.name ?? "Unknown",
          status: ex.status,
          current_step: step.name,
          submitted_at: request.created_at,
          ...data,
        };
      })
      .filter(Boolean);

    res.json({ items });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load onboarding queue" });
  }
}

export async function getHrReviewData(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { executionId } = req.params;
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        executionLogs: { orderBy: { started_at: "asc" } },
        workflow: { include: { steps: { orderBy: { order: "asc" } } } },
        triggeredByUser: { select: { id: true, name: true, email: true, department: true } },
      },
    });
    if (!execution) return res.status(StatusCodes.NOT_FOUND).json({ error: "Execution not found" });

    const request = await prisma.request.findUnique({
      where: { execution_id: executionId },
      include: { requester: { select: { id: true, name: true, email: true, department: true } } },
    });
    if (!request || request.request_type !== RequestType.onboarding) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Onboarding request not found" });
    }

    const step = execution.current_step_id
      ? await prisma.step.findUnique({ where: { id: execution.current_step_id }, select: { metadata: true } })
      : null;
    const approverRole = (step?.metadata as any)?.approverRole as UserRole | undefined;
    if (approverRole && approverRole !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Not authorized to review this request" });
    }

    res.json({
      execution,
      request,
      employee: execution.triggeredByUser ?? request.requester,
      onboarding: normalizeOnboardingData(request.request_data),
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load review data" });
  }
}

export async function getHrStats(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const queue = await prisma.execution.findMany({
      where: { status: "in_progress", current_step_id: { not: null } },
      select: { id: true, current_step_id: true },
    });
    const stepIds = [...new Set(queue.map((e) => e.current_step_id).filter(Boolean))] as string[];
    const steps = await prisma.step.findMany({
      where: { id: { in: stepIds }, step_type: StepType.approval },
      select: { id: true, metadata: true },
    });
    const stepById = new Map(steps.map((s) => [s.id, s]));

    const executionIds = queue.map((e) => e.id);
    const onboardingRequests = await prisma.request.findMany({
      where: { execution_id: { in: executionIds }, request_type: RequestType.onboarding },
      select: { execution_id: true, request_data: true },
    });
    const onboardingExecIds = new Set(onboardingRequests.map((r) => r.execution_id).filter(Boolean) as string[]);

    let pendingOnboarding = 0;
    let docsPending = 0;

    for (const ex of queue) {
      if (!onboardingExecIds.has(ex.id)) continue;
      const step = ex.current_step_id ? stepById.get(ex.current_step_id) : null;
      if (!step) continue;
      const approverRole = (step.metadata as any)?.approverRole;
      if (approverRole !== UserRole.HR && role !== UserRole.ADMIN) continue;
      pendingOnboarding += 1;
      docsPending += 1;
    }

    const [completedOnboardings, rejectedOnboardings] = await Promise.all([
      prisma.request.count({ where: { request_type: RequestType.onboarding, status: "completed" as any } }),
      prisma.request.count({ where: { request_type: RequestType.onboarding, status: "rejected" as any } }),
    ]);

    res.json({
      pendingOnboardingRequests: pendingOnboarding,
      documentsPendingVerification: docsPending,
      completedOnboardings,
      rejectedOnboardings,
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load stats" });
  }
}

export async function getHrHistory(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { department, status, page = "1", pageSize = "20" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = { request_type: RequestType.onboarding };
    if (status) where.status = status;
    if (department) where.request_data = { path: ["department"], equals: department };

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { updated_at: "desc" },
        include: { requester: { select: { id: true, name: true, email: true, department: true } } },
      }),
      prisma.request.count({ where }),
    ]);

    const enriched = items.map((r) => {
      const data = normalizeOnboardingData(r.request_data);
      return {
        id: r.id,
        execution_id: r.execution_id,
        status: r.status,
        completed_at: r.updated_at,
        ...data,
      };
    });

    res.json({ items: enriched, total, page: pageNum, pageSize: pageSizeNum });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load history" });
  }
}

// New HR Panel functions

export async function getHrDashboard(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    // Get all requests where next_approver_role = HR
    const pendingRequests = await prisma.request.findMany({
      where: {
        status: { in: ["in_progress", "pending"] },
        request_data: {
          path: ["next_approver_role"],
          equals: "HR"
        }
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true }
        }
      }
    });

    const approvedByHr = await prisma.request.count({
      where: {
        status: "approved",
        request_data: {
          path: ["last_approved_by"],
          equals: "HR"
        }
      }
    });

    const rejectedByHr = await prisma.request.count({
      where: {
        status: "rejected",
        request_data: {
          path: ["last_rejected_by"],
          equals: "HR"
        }
      }
    });

    const onboardingInProgress = await prisma.request.count({
      where: {
        request_type: RequestType.onboarding,
        status: { in: ["in_progress", "approved"] }
      }
    });

    res.json({
      pendingReviews: pendingRequests.length,
      approvedByHr,
      rejectedByHr,
      onboardingInProgress
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load dashboard" });
  }
}

export async function getHrPendingReviews(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const requests = await prisma.request.findMany({
      where: {
        status: { in: ["in_progress", "pending"] },
        request_data: {
          path: ["next_approver_role"],
          equals: "HR"
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
        receiptAttachment: requestData?.receipt_url || null,
        managerApprovalStatus: requestData?.manager_approval_status || "pending",
        submittedDate: request.created_at,
        currentWorkflowStep: requestData?.current_step || 2,
        ...requestData
      };
    });

    res.json({ requests: enrichedRequests });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load pending reviews" });
  }
}

export async function approveHrRequest(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
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
    const amount = requestData?.amount || 0;
    const requestType = request.request_type;

    // Apply automation rules
    if (requestType === RequestType.expense) {
      if (amount < 5000) {
        // HR can finalize approval
        await prisma.request.update({
          where: { id },
          data: {
            status: RequestStatus.approved,
            request_data: {
              ...requestData,
              current_step: "completed",
              next_approver_role: null,
              last_approved_by: "hr",
              hr_approval_date: new Date().toISOString(),
              hr_comments: comments
            }
          }
        });

        // Add audit log
        await AuditService.log(id, "hr_approved", req.user!.sub, comments);

        // Send notification to employee
        await sendHrNotification(request.requested_by, "expense_approved", { requestId: id });

        return res.json({ message: "Expense request approved and finalized" });
      } else {
        // Forward to CEO for amounts >= 5000
        await prisma.request.update({
          where: { id },
          data: {
            status: RequestStatus.in_progress,
            request_data: {
              ...requestData,
              current_step: 4,
              next_approver_role: "CEO",
              hr_approval_status: "approved",
              hr_approval_date: new Date().toISOString(),
              hr_comments: comments,
              hr_id: req.user?.sub
            }
          }
        });

        // Create workflow step record for CEO approval
        const ceoUser = await prisma.user.findFirst({
          where: { role: UserRole.CEO },
          select: { id: true, name: true, email: true }
        });

        if (ceoUser) {
          await prisma.executionLog.create({
            data: {
              execution_id: `req_${id}`,
              step_name: 'CEO Approval',
              step_type: 'approval',
              evaluated_rules: {},
              status: RequestStatus.pending,
              approver_id: ceoUser.id,
              error_message: null
            } as any
          });
        }

        // Add audit log
        await AuditService.log(id, "hr_forwarded_to_ceo", req.user!.sub, comments);

        // Send notification to CEO
        await sendCeoNotification("expense_awaiting_ceo_approval", { requestId: id });

        return res.json({ message: "Expense request forwarded to CEO" });
      }
    } else if (requestType === RequestType.onboarding) {
      // Onboarding workflow: Employee -> Manager -> HR -> IT Setup -> Completed
      await prisma.request.update({
        where: { id },
        data: {
          status: "approved",
          request_data: {
            ...requestData,
            current_step: "it_setup",
            next_approver_role: "it",
            hr_verified_date: new Date().toISOString(),
            hr_comments: comments
          }
        }
      });

      // Add audit log
      await AuditService.log(id, "hr_verified_onboarding", req.user!.sub, comments);

      // Send notification to IT team
      await sendItNotification("onboarding_it_setup_required", { requestId: id });

      return res.json({ message: "Onboarding request verified and forwarded to IT" });
    }

    res.json({ message: "Request approved" });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to approve request" });
  }
}

export async function rejectHrRequest(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
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
        status: RequestStatus.rejected,
        request_data: {
          ...requestData,
          next_approver_role: null,
          last_rejected_by: "hr",
          hr_rejection_date: new Date().toISOString(),
          hr_rejection_reason: reason,
          hr_comments: comments
        }
      }
    });

    // Add audit log
    await AuditService.log(id, "hr_rejected", req.user!.sub, comments);

    // Send notification to employee
    await sendHrNotification(request.requested_by, "request_rejected", { requestId: id, reason });

    res.json({ message: "Request rejected" });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to reject request" });
  }
}

export async function verifyHrDocuments(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { id } = req.params;
    const { verified, comments } = req.body;

    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    const requestData = request.request_data as any;

    await prisma.request.update({
      where: { id },
      data: {
        request_data: {
          ...requestData,
          documents_verified: verified,
          document_verification_date: new Date().toISOString(),
          hr_verification_comments: comments
        }
      }
    });

    // Add audit log
    await AuditService.log(id, "hr_verified_documents", req.user!.sub, comments);

    res.json({ message: `Documents ${verified ? "verified" : "verification failed"}` });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to verify documents" });
  }
}

export async function requestMoreInformation(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { id } = req.params;
    const { informationRequired, deadline } = req.body;

    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    const requestData = request.request_data as any;

    await prisma.request.update({
      where: { id },
      data: {
        request_data: {
          ...requestData,
          information_requested: informationRequired,
          information_request_date: new Date().toISOString(),
          information_deadline: deadline,
          status: "pending_information"
        }
      }
    });

    // Add audit log
    await AuditService.log(id, "hr_requested_information", req.user!.sub, informationRequired);

    // Send notification to employee
    await sendHrNotification(request.requested_by, "information_requested", { requestId: id, informationRequired, deadline });

    res.json({ message: "Information request sent to employee" });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to request information" });
  }
}

export async function forwardToCeo(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }

    const requestData = request.request_data as any;

    await prisma.request.update({
      where: { id },
      data: {
        request_data: {
          ...requestData,
          current_step: 3,
          next_approver_role: "CEO",
          hr_forwarded_date: new Date().toISOString(),
          hr_forward_reason: reason
        }
      }
    });

    // Add audit log
    await AuditService.log(id, "hr_forwarded_to_ceo", req.user!.sub, reason);

    // Send notification to CEO
    await sendCeoNotification("request_awaiting_ceo_approval", { requestId: id });

    res.json({ message: "Request forwarded to CEO" });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to forward to CEO" });
  }
}

export async function getHrRequestDetails(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
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

export async function getHrAuditLogs(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const { requestId, page = "1", pageSize = "20" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (requestId) where.request_id = requestId;

    // This would need an audit_logs table - for now using execution logs
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

// Helper functions



