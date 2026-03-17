import { Request, Response } from 'express';
import { prisma } from '../models/prisma';
import { StatusCodes } from 'http-status-codes';
import { StepType } from '@prisma/client';

export const createStep = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { name, step_type, order, metadata } = req.body;
    const step = await prisma.step.create({
      data: {
        workflow_id: workflowId,
        name,
        step_type: step_type as StepType,
        order,
        metadata: metadata ?? {},
      },
    });
    res.status(StatusCodes.CREATED).json(step);
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to create step' });
  }
};

export const listStepsForWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const steps = await prisma.step.findMany({
      where: { workflow_id: workflowId },
      orderBy: { order: 'asc' },
      include: { rules: { orderBy: { priority: 'asc' } } },
    });
    res.json(steps);
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? 'Failed to list steps' });
  }
};

export const updateStep = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, step_type, order, metadata } = req.body;
    const step = await prisma.step.update({
      where: { id },
      data: {
        name,
        step_type: step_type as StepType,
        order,
        metadata,
      },
    });
    res.json(step);
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to update step' });
  }
};

export const deleteStep = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.step.delete({ where: { id } });
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to delete step' });
  }
};

