import { ExecutionStatus, ExecutionLogStatus, StepType } from '@prisma/client';
import { prisma } from '../models/prisma';
import { evaluateRulesForStep } from '../rule-engine/ruleEngine';
import { Server } from 'socket.io';
import { EmailService } from './emailService';
import { UserRole } from '@prisma/client';

export class ExecutionService {
  constructor(private readonly io?: Server, private readonly email?: EmailService) {}

  async startExecution(workflowId: string, data: any, triggeredBy?: string) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, is_active: true },
      include: { steps: true },
    });
    if (!workflow) {
      throw new Error('Workflow not found or inactive');
    }
    if (!workflow.start_step_id) {
      throw new Error('Workflow has no start step');
    }

    const execution = await prisma.execution.create({
      data: {
        workflow_id: workflow.id,
        workflow_version: workflow.version,
        status: ExecutionStatus.in_progress,
        data,
        logs: [],
        current_step_id: workflow.start_step_id,
        triggered_by: triggeredBy ?? null,
      },
    });

    await this.runFromCurrentStep(execution.id);
    return prisma.execution.findUnique({ where: { id: execution.id } });
  }

  async runFromCurrentStep(executionId: string) {
    // simple loop; in a real system you might guard against infinite loops more strictly
    // and move long-running steps to background workers
    let execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });
    if (!execution) throw new Error('Execution not found');

    let safetyCounter = 0;
    const maxIterations = 100;

    while (
      execution.current_step_id &&
      execution.status === ExecutionStatus.in_progress &&
      safetyCounter < maxIterations
    ) {
      safetyCounter += 1;
      const step = await prisma.step.findUnique({
        where: { id: execution.current_step_id },
        include: { rules: true },
      });
      if (!step) {
        execution = await prisma.execution.update({
          where: { id: executionId },
          data: {
            status: ExecutionStatus.failed,
            ended_at: new Date(),
          },
        });
        break;
      }

      const log = await prisma.executionLog.create({
        data: {
          execution_id: execution.id,
          step_name: step.name,
          step_type: step.step_type,
          evaluated_rules: [],
          selected_next_step: null,
          status: ExecutionLogStatus.in_progress,
          approver_id: null,
        },
      });

      try {
        const updatedData = await this.executeStep(
          execution.id,
          step.step_type,
          execution.data,
          step.metadata,
          step.name,
        );
        execution = await prisma.execution.update({
          where: { id: execution.id },
          data: {
            data: updatedData,
          },
        });

        if (step.step_type === StepType.approval) {
          const approverRole = (step.metadata as any)?.approverRole as UserRole | undefined;
          if (approverRole && this.email) {
            const subject = `Approval needed: ${step.name}`;
            const text = `Execution ${execution.id} is waiting for ${approverRole} approval.\n\nStep: ${step.name}\n\nOpen the dashboard to approve/reject.`;
            await this.email.notifyRole({ role: approverRole, subject, text });
          }

          await prisma.executionLog.update({
            where: { id: log.id },
            data: {
              status: ExecutionLogStatus.paused,
              ended_at: new Date(),
              evaluated_rules: [
                {
                  type: "approval_request",
                  approverRole: (step.metadata as any)?.approverRole ?? null,
                },
              ],
            },
          });
          this.emitExecutionUpdate(execution.id);
          break;
        }

        const { evaluations, selectedNextStepId } = evaluateRulesForStep(
          step.rules,
          execution.data as any,
        );

        await prisma.executionLog.update({
          where: { id: log.id },
          data: {
            evaluated_rules: evaluations as any,
            selected_next_step: selectedNextStepId,
            status: ExecutionLogStatus.completed,
            ended_at: new Date(),
          },
        });

        execution = await prisma.execution.update({
          where: { id: execution.id },
          data: {
            current_step_id: selectedNextStepId,
            status: selectedNextStepId ? ExecutionStatus.in_progress : ExecutionStatus.completed,
            ended_at: selectedNextStepId ? null : new Date(),
          },
        });

        this.emitExecutionUpdate(execution.id);
      } catch (err: any) {
        await prisma.executionLog.update({
          where: { id: log.id },
          data: {
            status: ExecutionLogStatus.failed,
            error_message: err?.message ?? 'Step execution failed',
            ended_at: new Date(),
          },
        });
        execution = await prisma.execution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.failed,
            ended_at: new Date(),
            retries: execution.retries + 1,
          },
        });
        this.emitExecutionUpdate(execution.id);
        break;
      }
    }
  }

  private async executeStep(
    executionId: string,
    stepType: StepType,
    data: any,
    metadata: any,
    stepName: string,
  ): Promise<any> {
    switch (stepType) {
      case StepType.task:
        return {
          ...data,
          _system: {
            ...(data._system ?? {}),
            lastTask: {
              at: new Date().toISOString(),
              metadata,
            },
          },
        };
      case StepType.notification:
        if (this.email) {
          const notifyRole = (metadata as any)?.notifyRole as UserRole | undefined;
          if (notifyRole) {
            const subject =
              (metadata as any)?.subject ??
              `Notification: ${stepName}`;
            const text =
              (metadata as any)?.text ??
              `Execution ${executionId} reached notification step: ${stepName}\nRole: ${notifyRole}`;
            await this.email.notifyRole({ role: notifyRole, subject, text });
          }
        }
        await prisma.executionLog.updateMany({
          where: { execution_id: executionId, step_name: stepName, step_type: StepType.notification, status: ExecutionLogStatus.in_progress },
          data: {
            evaluated_rules: [
              {
                type: "notification",
                notifyRole: (metadata as any)?.notifyRole ?? null,
              },
            ],
          },
        });
        return {
          ...data,
          _system: {
            ...(data._system ?? {}),
            lastNotification: {
              at: new Date().toISOString(),
              metadata,
            },
          },
        };
      case StepType.approval:
        return data;
      default:
        return data;
    }
  }

  async retryExecution(executionId: string) {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== ExecutionStatus.failed) {
      throw new Error('Only failed executions can be retried');
    }
    const updated = await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.in_progress,
        retries: execution.retries + 1,
      },
    });
    await this.runFromCurrentStep(updated.id);
    return prisma.execution.findUnique({ where: { id: executionId } });
  }

  async cancelExecution(executionId: string) {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });
    if (!execution) throw new Error('Execution not found');
    if (
      execution.status === ExecutionStatus.completed ||
      execution.status === ExecutionStatus.failed ||
      execution.status === ExecutionStatus.canceled
    ) {
      throw new Error('Execution cannot be canceled in its current state');
    }
    const updated = await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.canceled,
        ended_at: new Date(),
      },
    });
    this.emitExecutionUpdate(updated.id);
    return updated;
  }

  async recordApproval(
    executionId: string,
    approverId: string,
    decision: 'approve' | 'reject',
    comment?: string,
  ) {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });
    if (!execution) throw new Error('Execution not found');
    if (!execution.current_step_id) throw new Error('No current step to approve');

    const step = await prisma.step.findUnique({
      where: { id: execution.current_step_id },
      include: { rules: true },
    });
    if (!step || step.step_type !== StepType.approval) {
      throw new Error('Current step is not an approval step');
    }

    const logs = await prisma.executionLog.findMany({
      where: {
        execution_id: executionId,
        step_name: step.name,
      },
      orderBy: { started_at: 'desc' },
      take: 1,
    });
    const lastLog = logs[0];

    const updatedData = {
      ...(execution.data as any),
      approvals: {
        ...((execution.data as any).approvals ?? {}),
        [step.id]: {
          decision,
          comment,
          at: new Date().toISOString(),
          by: approverId,
        },
      },
    };

    if (lastLog) {
      await prisma.executionLog.update({
        where: { id: lastLog.id },
        data: {
          status: ExecutionLogStatus.completed,
          approver_id: approverId,
          error_message: decision === 'reject' ? 'Rejected by approver' : null,
          ended_at: new Date(),
        },
      });
    }

    const updatedExecution = await prisma.execution.update({
      where: { id: executionId },
      data: {
        data: updatedData,
      },
    });

    await this.runFromCurrentStep(updatedExecution.id);
    return prisma.execution.findUnique({ where: { id: executionId } });
  }

  private emitExecutionUpdate(executionId: string) {
    if (!this.io) return;
    this.io.to(`execution:${executionId}`).emit('execution:update', { executionId });
  }
}

