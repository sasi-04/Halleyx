import { Request, Response } from 'express';
import { prisma } from '../models/prisma';
import { Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

export const createWorkflow = async (req: Request, res: Response) => {
  try {
    const { name, input_schema } = req.body;
    const workflow = await prisma.workflow.create({
      data: {
        name,
        version: 1,
        is_active: false,
        input_schema: input_schema ?? {},
      },
    });
    res.status(201).json(workflow);
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? 'Failed to create workflow' });
  }
};

export const listWorkflows = async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '10', search = '' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 10;
    const skip = (pageNum - 1) * pageSizeNum;

    const where = search
      ? {
          OR: [
            { name: { contains: search as string, mode: Prisma.QueryMode.insensitive } },
            { id: { contains: search as string } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { created_at: 'desc' },
        include: { steps: true },
      }),
      prisma.workflow.count({ where }),
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
      .json({ error: err?.message ?? 'Failed to list workflows' });
  }
};

export const getWorkflow = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: { rules: { orderBy: { priority: 'asc' } } },
        },
      },
    });
    if (!workflow) {
      res.status(404)
      .json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? 'Failed to get workflow' });
  }
};

export const updateWorkflow = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, input_schema, is_active, start_step_id } = req.body;
    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        name,
        input_schema,
        is_active,
        start_step_id,
      },
    });
    res.json(workflow);
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to update workflow' });
  }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.workflow.delete({
      where: { id },
    });
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (err: any) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err?.message ?? 'Failed to delete workflow' });
  }
};

