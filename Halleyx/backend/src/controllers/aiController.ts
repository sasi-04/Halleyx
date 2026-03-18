import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import OpenAI from 'openai';
import { prisma } from '../models/prisma';

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

export const generateRuleFromDescription = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!client) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: 'OPENAI_API_KEY not configured' });
    }
    const { description, fields } = req.body;
    const prompt = `You are helping define workflow routing rules.\nAvailable fields (with types) are: ${JSON.stringify(
      fields ?? [],
    )}.\nGenerate a single condition expression using the following operators only: ==, !=, <, >, <=, >=, &&, ||, and functions contains(field,value), startsWith(field,value), endsWith(field,value).\nDo not include any explanation, only output the raw expression.\nNatural language: "${description}".`;

    const completion = await client.responses.create({
      model: MODEL,
      input: prompt,
    });

    const text =
      completion.output[0].type === 'message'
        ? completion.output[0].content[0].type === 'output_text'
          ? completion.output[0].content[0].text
          : ''
        : '';

    res.json({
      candidate_condition: text.trim(),
    });
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? 'Failed to generate rule' });
  }
};

export const explainExecutionLogs = async (req: Request, res: Response) => {
  try {
    if (!client) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: 'OPENAI_API_KEY not configured' });
    }
    const { executionId } = req.body;
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { executionLogs: true, workflow: true },
    });
    if (!execution) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: 'Execution not found' });
    }

    const prompt = `You are an assistant explaining workflow executions.\nWorkflow: ${execution.workflow.name} (version ${execution.workflow_version}).\nStatus: ${execution.status}.\nInput data: ${JSON.stringify(
      execution.data,
    )}.\nExecution logs: ${JSON.stringify(
      execution.executionLogs,
    )}.\nExplain in a concise, non-technical way what happened step by step and why the workflow ended in its final status.`;

    const completion = await client.responses.create({
      model: MODEL,
      input: prompt,
    });

    const text =
      completion.output[0].type === 'message'
        ? completion.output[0].content[0].type === 'output_text'
          ? completion.output[0].content[0].text
          : ''
        : '';

    res.json({ explanation: text.trim() });
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? 'Failed to explain logs' });
  }
};

export const suggestWorkflowFromDescription = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!client) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: 'OPENAI_API_KEY not configured' });
    }
    const { description } = req.body;
    const prompt = `Design a workflow automation given this description: "${description}".\nReturn strict JSON with this shape:\n{\n  "name": string,\n  "steps": [\n    { "name": string, "step_type": "task" | "approval" | "notification", "metadata": object }\n  ],\n  "rules": [\n    { "fromStep": string, "condition": string, "nextStep": string | null, "priority": number, "is_default": boolean }\n  ]\n}\nDo not include any commentary, only the JSON. Conditions must use the allowed operators and functions as in the previous instructions.`;

    const completion = await client.responses.create({
      model: MODEL,
      input: prompt,
    });

    const text =
      completion.output[0].type === 'message'
        ? completion.output[0].content[0].type === 'output_text'
          ? completion.output[0].content[0].text
          : ''
        : '';

    const json = JSON.parse(text);
    res.json(json);
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err?.message ?? 'Failed to suggest workflow' });
  }
};

