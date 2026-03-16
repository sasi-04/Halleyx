import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { RequestType } from '@prisma/client';
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
