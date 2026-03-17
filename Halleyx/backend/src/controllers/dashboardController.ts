import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { StepType, UserRole } from "@prisma/client";

export async function getPendingApprovals(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const recent = await prisma.execution.findMany({
      where: {
        status: "in_progress",
        current_step_id: { not: null },
      },
      orderBy: { started_at: "desc" },
      take: 50,
    });

    const stepIds = Array.from(new Set(recent.map((e) => e.current_step_id).filter(Boolean))) as string[];
    const steps = await prisma.step.findMany({
      where: { id: { in: stepIds }, step_type: StepType.approval },
      select: { id: true, name: true, step_type: true, metadata: true, workflow_id: true },
    });
    const stepById = new Map(steps.map((s) => [s.id, s]));

    const items = recent
      .map((ex) => {
        const step = ex.current_step_id ? stepById.get(ex.current_step_id) : null;
        if (!step) return null;
        const approverRole = (step.metadata as any)?.approverRole as UserRole | undefined;
        if (!approverRole || approverRole !== role) return null;
        return {
          execution_id: ex.id,
          workflow_id: ex.workflow_id,
          current_step_id: ex.current_step_id,
          step_name: step.name,
          started_at: ex.started_at,
        };
      })
      .filter(Boolean);

    res.json({ items });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load approvals" });
  }
}

export async function getNotifications(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    // Demo-friendly approach: scan recent execution logs for notification steps and surface those targeted to your role.
    const logs = await prisma.executionLog.findMany({
      where: { step_type: StepType.notification },
      orderBy: { started_at: "desc" },
      take: 100,
      select: {
        id: true,
        execution_id: true,
        step_name: true,
        evaluated_rules: true,
        started_at: true,
      },
    });

    const items = logs
      .map((l) => {
        const meta = (l.evaluated_rules as any[])?.find((x) => x?.type === "notification") ?? null;
        const notifyRole = meta?.notifyRole as UserRole | undefined;
        if (!notifyRole || notifyRole !== role) return null;
        return {
          id: l.id,
          execution_id: l.execution_id,
          step_name: l.step_name,
          notifyRole,
          at: l.started_at,
        };
      })
      .filter(Boolean);

    res.json({ items });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load notifications" });
  }
}

export async function getNotificationsByUserId(req: AuthedRequest, res: Response) {
  try {
    const authUserId = req.user?.sub;
    if (!authUserId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    const { userId } = req.params;

    if (authUserId !== userId && req.user?.role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Not authorized to view these notifications" });
    }

    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    res.json({ notifications });
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? "Failed to load user notifications" });
  }
}

