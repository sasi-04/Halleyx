import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../models/prisma';
import { ExecutionService } from '../services/executionService';
import { ExecutionStatus } from '@prisma/client';
import { AuthedRequest } from '../middlewares/auth';

let executionService: ExecutionService | null = null;

export const setExecutionService = (service: ExecutionService) => {
  executionService = service;
};

export const startExecution = async (req: AuthedRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { data } = req.body;
    if (!executionService) throw new Error('Execution service not initialized');
    const execution = await executionService.startExecution(
      workflowId,
      data ?? {},
      req.user?.sub,
    );
    res.status(StatusCodes.CREATED).json(execution);
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to start execution' });
  }
};

export const listExecutions = async (req: AuthedRequest, res: Response) => {
  try {
    const { workflowId, status, page = '1', pageSize = '10', mine } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 10;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (workflowId) where.workflow_id = workflowId as string;
    if (status) where.status = status as ExecutionStatus;
    if (mine === 'true' && req.user?.sub) where.triggered_by = req.user.sub;

    const [items, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { started_at: 'desc' },
      }),
      prisma.execution.count({ where }),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? 'Failed to list executions' });
  }
};

export const cancelExecution = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!executionService) throw new Error('Execution service not initialized');
    const execution = await executionService.cancelExecution(id);
    res.json(execution);
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to cancel execution' });
  }
};

export const retryExecution = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!executionService) throw new Error('Execution service not initialized');
    const execution = await executionService.retryExecution(id);
    res.json(execution);
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to retry execution' });
  }
};

export const getExecution = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const execution = await prisma.execution.findUnique({
      where: { id },
      include: { executionLogs: true },
    });
    if (!execution) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? 'Failed to get execution' });
  }
};

export const listExecutionLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logs = await prisma.executionLog.findMany({
      where: { execution_id: id },
      orderBy: { started_at: 'asc' },
    });
    res.json(logs);
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? 'Failed to list execution logs' });
  }
};

export const approveExecutionStep = async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body;
    if (!executionService) throw new Error('Execution service not initialized');
    const approver_id = req.user?.sub;
    if (!approver_id) throw new Error('Not authenticated');
    if (decision !== 'approve' && decision !== 'reject') {
      throw new Error("decision must be 'approve' or 'reject'");
    }
    const execution = await executionService.recordApproval(
      id,
      approver_id,
      decision,
      comment,
    );
    res.json(execution);
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to record approval' });
  }
};

