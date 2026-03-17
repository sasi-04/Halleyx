import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { SimpleRequestStatus, UserRole } from "@prisma/client";

async function listPendingApprovalsForRole(role: UserRole) {
  const requests = await prisma.request.findMany({
    where: {
      simple_status: SimpleRequestStatus.PENDING,
      currentLevel: role as any,
    },
    orderBy: { created_at: "desc" },
    take: 200,
    include: { createdBy: { select: { id: true, name: true, email: true, department: true } } },
  });

  return {
    items: requests.map((r) => ({
      execution_id: null,
      request_id: r.id,
      request_title: r.title ?? "Request",
      type: r.type ?? null,
      created_by: r.createdBy?.name ?? "Unknown",
      current_status: r.simple_status ?? "PENDING",
    })),
  };
}

export async function getHrPendingApprovals(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.HR && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }
    res.json(await listPendingApprovalsForRole(UserRole.HR));
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load HR approval queue" });
  }
}

export async function getCeoPendingApprovals(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.CEO && role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }
    res.json(await listPendingApprovalsForRole(UserRole.CEO));
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load CEO approval queue" });
  }
}

