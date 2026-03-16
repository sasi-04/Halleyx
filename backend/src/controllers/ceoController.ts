import { Request, Response } from "express";
import * as ceoService from "../services/ceoService";
import { z } from "zod";

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    const data = await ceoService.getDashboardSummary();
    res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
}

export async function getExecutiveApprovals(req: Request, res: Response) {
  try {
    const filters = {
      department: req.query.department as string | undefined,
      priority: req.query.priority as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined
    };
    const data = await ceoService.getExecutiveApprovals(filters);
    res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to load approvals" });
  }
}

export async function getApprovalDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await ceoService.getApprovalDetail(id);
    if (!data) {
      return res.status(404).json({ message: "Request not found" });
    }
    return res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load request detail" });
  }
}

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().max(1000).optional()
});

export async function postExecutiveDecision(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
    }
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    const result = await ceoService.recordExecutiveDecision(id, req.user, parsed.data);
    if (!result) {
      return res.status(404).json({ message: "Request not found or not eligible for CEO decision" });
    }
    return res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to record decision" });
  }
}

export async function getAnalytics(_req: Request, res: Response) {
  try {
    const data = await ceoService.getAnalytics();
    res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to load analytics" });
  }
}

export async function getEscalations(req: Request, res: Response) {
  try {
    const filters = {
      department: req.query.department as string | undefined,
      priority: req.query.priority as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined
    };
    const data = await ceoService.getEscalations(filters);
    res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to load escalations" });
  }
}

export async function getDecisionHistory(req: Request, res: Response) {
  try {
    const filters = {
      department: req.query.department as string | undefined,
      requestType: req.query.requestType as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined
    };
    const data = await ceoService.getDecisionHistory(filters);
    res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to load decision history" });
  }
}

export async function getNotifications(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    const data = await ceoService.getNotifications(req.user.id);
    return res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load notifications" });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    const data = await ceoService.getProfile(req.user.id);
    if (!data) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(100).optional(),
  avatarUrl: z.string().url().optional()
});

export async function updateProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
    }
    const data = await ceoService.updateProfile(req.user.id, parsed.data);
    return res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
}

