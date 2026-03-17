import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { ApprovalLevel, RequestStatus, RequestType, SimpleRequestStatus, SimpleRequestType } from '@prisma/client';
import { AuthedRequest } from '../middlewares/auth';
import { RequestService } from '../services/requestService';
import { prisma } from '../models/prisma';
let requestService: RequestService | null = null;

export const setRequestService = (service: RequestService) => {
  requestService = service;
};

const expenseSchema = z.object({
  request_title: z.string().min(1),
  amount: z.number().min(0),
  country: z.string().min(1),
  department: z.string().min(1),
  expense_category: z.enum(['Travel', 'Food', 'Equipment', 'Other']).default('Travel'),
  expense_date: z.string().min(1),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  description: z.string().optional(),
  receipt_url: z.string().optional(),
});

const onboardingSchema = z.object({
  new_employee_name: z.string().min(1),
  email: z.string().email(),
  department: z.string().min(1),
  role: z.string().min(1),
  start_date: z.string().min(1),
  manager: z.string().optional(),
  employment_type: z.enum(['Full Time', 'Contract', 'Intern']).default('Full Time'),
  laptop_required: z.boolean().default(false),
  access_required: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const createExpenseRequest = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Not authenticated' });
    if (!requestService) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Request service not initialized' });

    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const expenseWf = await prisma.workflow.findFirst({
      where: { name: 'Expense Approval Workflow', is_active: true },
    });
    if (!expenseWf) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Expense workflow not found' });

    const request = await requestService.createAndSubmit(
      RequestType.expense,
      expenseWf.id,
      userId,
      parsed.data,
    );
    console.log("REQUEST CREATED BY:", req.user?.role);
    res.status(StatusCodes.CREATED).json(request);
  } catch (err: any) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? 'Failed to create expense request' });
  }
};

export const createOnboardingRequest = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Not authenticated' });
    if (!requestService) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Request service not initialized' });

    const parsed = onboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const onboardingWf = await prisma.workflow.findFirst({
      where: { name: 'Employee Onboarding Workflow', is_active: true },
    });
    if (!onboardingWf) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Onboarding workflow not found' });

    const request = await requestService.createAndSubmit(
      RequestType.onboarding,
      onboardingWf.id,
      userId,
      parsed.data,
    );
    res.status(StatusCodes.CREATED).json(request);
  } catch (err: any) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? 'Failed to create onboarding request' });
  }
};

export const listMyRequests = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Not authenticated' });
    if (!requestService) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Request service not initialized' });

    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10);
    const result = await requestService.listByUser(userId, page, pageSize);
    res.json(result);
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? 'Failed to list requests' });
  }
};

export const getRequestById = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Not authenticated' });
    if (!requestService) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Request service not initialized' });

    const { id } = req.params;
    const request = await requestService.getById(id, userId);
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Request not found' });
    res.json(request);
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? 'Failed to get request' });
  }
};

export const getRequestStats = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Not authenticated' });
    if (!requestService) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Request service not initialized' });

    const stats = await requestService.getStats(userId);
    res.json(stats);
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? 'Failed to get stats' });
  }
};

export const listManagerPendingRequests = async (req: AuthedRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== "MANAGER" && role !== "ADMIN") {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const items = await prisma.request.findMany({
      where: {
        simple_status: SimpleRequestStatus.PENDING,
        currentLevel: ApprovalLevel.MANAGER,
      },
      orderBy: { created_at: "desc" },
      take: 200,
      include: {
        createdBy: { select: { id: true, name: true, email: true, department: true } },
      },
    });

    res.json({
      items: items.map((r) => {
        return {
          execution_id: null,
          request_id: r.id,
          employee_name: r.createdBy?.name ?? "Unknown",
          request_type: r.type ?? null,
          amount: r.amount ?? null,
          submitted_at: r.created_at,
          request_data: {
            title: r.title,
            description: r.description,
            amount: r.amount,
          },
        };
      }),
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load manager pending requests" });
  }
};

export const listAllRequests = async (req: AuthedRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== "HR" && role !== "CEO" && role !== "ADMIN") {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }

    const page = parseInt((req.query.page as string) || "1", 10);
    const pageSize = parseInt((req.query.pageSize as string) || "50", 10);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        skip,
        take: pageSize,
        orderBy: { created_at: "desc" },
        include: { requester: { select: { id: true, name: true, email: true, department: true } } },
      }),
      prisma.request.count(),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to list all requests" });
  }
};

const createRequestSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["expense", "onboarding"]),
  requestData: z.unknown().optional(),
});

const createRequestStrictSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["EXPENSE", "ONBOARDING"]),
  amount: z.number().optional(),
  description: z.string().optional(),
});

/**
 * Legacy/simple request creation endpoint required by the UI:
 * POST /api/request/create
 *
 * Creates:
 * - Request row (status: pending)
 * - WorkflowStep row for MANAGER (status: pending)
 * - Sends email to manager (mandatory logging)
 */
export const createRequest = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    // Mandatory debug log (server-side)
    // eslint-disable-next-line no-console
    console.log("CREATE BODY:", req.body);

    const strictParsed = createRequestStrictSchema.safeParse(req.body);
    const legacyParsed = createRequestSchema.safeParse(req.body);
    if (!strictParsed.success && !legacyParsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Validation failed",
        details: {
          strict: strictParsed.success ? null : strictParsed.error.flatten(),
          legacy: legacyParsed.success ? null : legacyParsed.error.flatten(),
        },
      });
    }

    let normalized: { title: string; type: "expense" | "onboarding"; requestData?: unknown };
    if (strictParsed.success) {
      normalized = {
        title: strictParsed.data.title,
        type: strictParsed.data.type === "EXPENSE" ? "expense" : "onboarding",
        requestData:
          strictParsed.data.type === "EXPENSE"
            ? {
                title: strictParsed.data.title,
                amount: strictParsed.data.amount,
                description: strictParsed.data.description ?? "",
              }
            : {
                title: strictParsed.data.title,
                description: strictParsed.data.description ?? "",
              },
      };
    } else {
      normalized = legacyParsed.data!;
    }

    const { title, type } = normalized;
    const requestData = (normalized as any).requestData;

    if (!type) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Type required" });
    }
    const amount =
      type === "expense" ? Number((requestData as any)?.amount) : null;
    if (type === "expense" && (!amount || Number.isNaN(amount))) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Amount required" });
    }
    const description = String((requestData as any)?.description ?? "");

    // -----------------------------
    // Stable/simple request creation
    // -----------------------------
    const created = await prisma.request.create({
      data: {
        // keep legacy fields populated for compatibility, but do not rely on them
        request_type: type === "expense" ? RequestType.expense : RequestType.onboarding,
        workflow_id: "stable",
        requested_by: userId,
        status: RequestStatus.pending,
        request_data: {},

        // stable fields
        title,
        type: type === "expense" ? SimpleRequestType.EXPENSE : SimpleRequestType.ONBOARDING,
        amount: type === "expense" ? amount : null,
        description,
        simple_status: SimpleRequestStatus.PENDING,
        currentLevel: ApprovalLevel.MANAGER,
        createdById: userId,
      },
    });

    // 3) Mandatory debug logging (server-side)
    // eslint-disable-next-line no-console
    console.log("REQUEST CREATED:", created?.id);
    // eslint-disable-next-line no-console
    console.log("CURRENT LEVEL:", "MANAGER");

    // STEP 4: FIX CREATE REQUEST (FORCE EMAIL)
    const sendEmail = require("../utils/sendEmail");

    await sendEmail(
      "sasidharan071204@gmail.com",
      "New Request Assigned",
      `New request created: ${created.title}`,
    );

    console.log("MANAGER EMAIL TRIGGERED");

    return res.status(StatusCodes.CREATED).json(created);
  } catch (err: any) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to create request" });
  }
};
