import { Request, Response } from 'express';
import { prisma } from '../models/prisma';
import { StatusCodes } from 'http-status-codes';

export const createRule = async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const { condition, next_step_id, priority, is_default } = req.body;
    const rule = await prisma.rule.create({
      data: {
        step_id: stepId,
        condition,
        next_step_id: next_step_id ?? null,
        priority,
        is_default: Boolean(is_default),
      },
    });
    res.status(StatusCodes.CREATED).json(rule);
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to create rule' });
  }
};

export const listRulesForStep = async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const rules = await prisma.rule.findMany({
      where: { step_id: stepId },
      orderBy: { priority: 'asc' },
    });
    res.json(rules);
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? 'Failed to list rules' });
  }
};

export const updateRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { condition, next_step_id, priority, is_default } = req.body;
    const rule = await prisma.rule.update({
      where: { id },
      data: {
        condition,
        next_step_id: next_step_id ?? null,
        priority,
        is_default: Boolean(is_default),
      },
    });
    res.json(rule);
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to update rule' });
  }
};

export const deleteRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.rule.delete({ where: { id } });
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to delete rule' });
  }
};

