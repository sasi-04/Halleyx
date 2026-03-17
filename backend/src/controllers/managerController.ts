import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { StepType, UserRole } from "@prisma/client";

export async function getManagerPendingApprovals(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    const managerDept = req.user?.department ?? undefined;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const recent = await prisma.execution.findMany({
      where: {
        status: "in_progress",
        current_step_id: { not: null },
      },
      orderBy: { started_at: "desc" },
      take: 100,
      include: {
        triggeredByUser: { select: { id: true, name: true, email: true, department: true } },
      },
    });

    const stepIds = Array.from(new Set(recent.map((e) => e.current_step_id).filter(Boolean))) as string[];
    const steps = await prisma.step.findMany({
      where: { id: { in: stepIds }, step_type: StepType.approval },
      select: { id: true, name: true, step_type: true, metadata: true, workflow_id: true },
    });
    const stepById = new Map(steps.map((s) => [s.id, s]));

    const executionIds = recent.map((e) => e.id);
    const requests = await prisma.request.findMany({
      where: { execution_id: { in: executionIds } },
      include: { requester: { select: { id: true, name: true, email: true, department: true } } },
    });
    const requestByExec = new Map(requests.map((r) => [r.execution_id!, r]));

    const items = recent
      .map((ex) => {
        const step = ex.current_step_id ? stepById.get(ex.current_step_id) : null;
        if (!step) return null;
        const approverRole = (step.metadata as any)?.approverRole as UserRole | undefined;
        if (!approverRole || approverRole !== role) return null;

        const request = requestByExec.get(ex.id);
        const employee = ex.triggeredByUser ?? request?.requester;
        const reqData = (request?.request_data ?? ex.data) as any;

        if (managerDept && employee?.department && employee.department !== managerDept) {
          return null;
        }

        const amount = reqData?.amount ?? null;
        const priority = reqData?.priority ?? "Medium";

        return {
          execution_id: ex.id,
          request_id: request?.id,
          workflow_id: ex.workflow_id,
          current_step_id: ex.current_step_id,
          step_name: step.name,
          employee_name: employee?.name ?? "Unknown",
          employee_email: employee?.email,
          request_type: request?.request_type ?? (ex.workflow_id ? "expense" : "unknown"),
          amount,
          priority,
          submitted_at: ex.started_at,
          request_data: reqData,
        };
      })
      .filter(Boolean);

    res.json({ items });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load approvals" });
  }
}

export async function getManagerTeamRequests(req: AuthedRequest, res: Response) {
  try {
    const managerDept = req.user?.department ?? undefined;
    const { requestType, status, page = "1", pageSize = "20" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (requestType) where.request_type = requestType;
    if (status) where.status = status;
    if (managerDept) {
      where.requester = { department: managerDept };
    }

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { created_at: "desc" },
        include: {
          requester: { select: { id: true, name: true, email: true, department: true } },
        },
      }),
      prisma.request.count({ where }),
    ]);

    const enriched = await Promise.all(
      items.map(async (r) => {
        let currentStepName = null;
        if (r.current_step_id) {
          const step = await prisma.step.findUnique({
            where: { id: r.current_step_id },
            select: { name: true },
          });
          currentStepName = step?.name;
        }
        const exec = r.execution_id
          ? await prisma.execution.findUnique({
              where: { id: r.execution_id },
              select: { status: true },
            })
          : null;
        const derivedStatus = exec?.status === "completed" ? "completed" : exec?.status === "failed" || exec?.status === "canceled" ? "rejected" : r.status;
        return {
          ...r,
          currentStepName,
          derivedStatus,
          amount: (r.request_data as any)?.amount,
        };
      }),
    );

    res.json({ items: enriched, total, page: pageNum, pageSize: pageSizeNum });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load team requests" });
  }
}

export async function getManagerApprovalHistory(req: AuthedRequest, res: Response) {
  try {
    const approverId = req.user?.sub;
    if (!approverId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const { page = "1", pageSize = "20" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const logs = await prisma.executionLog.findMany({
      where: {
        approver_id: approverId,
        step_type: StepType.approval,
      },
      orderBy: { started_at: "desc" },
      skip,
      take: pageSizeNum,
      include: {
        execution: {
          include: {
            triggeredByUser: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    const executionIds = logs.map((l) => l.execution_id);
    const requests = await prisma.request.findMany({
      where: { execution_id: { in: executionIds } },
    });
    const requestByExec = new Map(requests.map((r) => [r.execution_id!, r]));

    const workflowIds = [...new Set(logs.map((l) => l.execution?.workflow_id).filter(Boolean))] as string[];
    const steps = await prisma.step.findMany({
      where: { workflow_id: { in: workflowIds } },
      select: { id: true, name: true, workflow_id: true },
    });
    const stepByName = new Map(steps.map((s) => [`${s.workflow_id}:${s.name}`, s.id]));

    const items = logs.map((log) => {
      const request = requestByExec.get(log.execution_id);
      const exec = log.execution;
      const stepId = exec ? stepByName.get(`${exec.workflow_id}:${log.step_name}`) : null;
      const approvalComment = stepId ? ((exec?.data as any)?.approvals ?? {})[stepId]?.comment : null;
      const decision = log.error_message?.toLowerCase().includes("reject") ? "rejected" : "approved";

      return {
        id: log.id,
        execution_id: log.execution_id,
        request_id: request?.id,
        step_name: log.step_name,
        decision,
        comment: approvalComment ?? null,
        employee_name: exec?.triggeredByUser?.name ?? "Unknown",
        request_type: request?.request_type,
        amount: (request?.request_data as any)?.amount ?? (exec?.data as any)?.amount,
        reviewed_at: log.ended_at ?? log.started_at,
      };
    });

    const total = await prisma.executionLog.count({
      where: { approver_id: approverId, step_type: StepType.approval },
    });

    res.json({ items, total, page: pageNum, pageSize: pageSizeNum });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load approval history" });
  }
}

export async function getManagerStats(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    const managerDept = req.user?.department ?? undefined;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const recent = await prisma.execution.findMany({
      where: { status: "in_progress", current_step_id: { not: null } },
      select: { id: true, current_step_id: true, triggered_by: true },
    });

    const stepIds = [...new Set(recent.map((e) => e.current_step_id).filter(Boolean))] as string[];
    const steps = await prisma.step.findMany({
      where: { id: { in: stepIds }, step_type: StepType.approval },
      select: { id: true, metadata: true },
    });
    const stepById = new Map(steps.map((s) => [s.id, s]));

    let pendingApprovals = 0;
    for (const ex of recent) {
      const step = ex.current_step_id ? stepById.get(ex.current_step_id) : null;
      if (!step) continue;
      const approverRole = (step.metadata as any)?.approverRole;
      if (approverRole !== role) continue;
      if (managerDept && ex.triggered_by) {
        const user = await prisma.user.findUnique({
          where: { id: ex.triggered_by },
          select: { department: true },
        });
        if (user?.department !== managerDept) continue;
      }
      pendingApprovals++;
    }

    const approverId = req.user?.sub;
    const [approvedCount, rejectedCount, teamTotal] = await Promise.all([
      prisma.executionLog.count({
        where: {
          approver_id: approverId,
          step_type: StepType.approval,
          error_message: null,
        },
      }),
      prisma.executionLog.count({
        where: {
          approver_id: approverId,
          step_type: StepType.approval,
          error_message: { not: null },
        },
      }),
      prisma.request.count({
        where: managerDept ? { requester: { department: managerDept } } : {},
      }),
    ]);

    res.json({
      pendingApprovals,
      approvedRequests: approvedCount,
      rejectedRequests: rejectedCount,
      teamRequests: teamTotal,
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load stats" });
  }
}

export async function getManagerReviewData(req: AuthedRequest, res: Response) {
  try {
    const { executionId } = req.params;
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

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

    const step = execution.current_step_id
      ? await prisma.step.findUnique({
          where: { id: execution.current_step_id },
          select: { metadata: true, name: true },
        })
      : null;
    const approverRole = (step?.metadata as any)?.approverRole;
    if (approverRole && approverRole !== role && role !== "ADMIN") {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Not authorized to review this request" });
    }

    res.json({
      execution,
      request,
      employee: execution.triggeredByUser ?? request?.requester,
      requestData: request?.request_data ?? execution.data,
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load review data" });
  }
}
