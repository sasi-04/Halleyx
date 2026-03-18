import { ExecutionStatus, ExecutionLogStatus, StepType } from '@prisma/client';
import { prisma } from '../models/prisma';
import { evaluateRulesForStep } from '../rule-engine/ruleEngine';
import { Server } from 'socket.io';
import { EmailService } from './emailService';
import { UserRole } from '@prisma/client';
import { sendCeoNotification, sendHrNotification, sendManagerNotification } from "./notificationService";

export class ExecutionService {
  constructor(private readonly io?: Server, private readonly email?: EmailService) {}

  private static roleToWorkflowLevel(role: UserRole | undefined | null): number | null {
    if (!role) return null;
    if (role === UserRole.MANAGER) return 1;
    if (role === UserRole.HR) return 2;
    if (role === UserRole.CEO) return 3;
    return null;
  }

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
          // Required debug log for "current level"
          // eslint-disable-next-line no-console
          console.log("CURRENT LEVEL:", approverRole ?? null);

          // Create in-app notification for the approver role (web notifications)
          try {
            const requestId = (execution.data as any)?.requestId as string | undefined;
            const request = requestId
              ? await prisma.request.findUnique({
                  where: { id: requestId },
                  include: { requester: { select: { id: true, name: true, email: true, department: true } } },
                })
              : null;
            const employeeName = request?.requester?.name ?? execution.triggered_by ?? "Employee";

            if (requestId && approverRole === UserRole.MANAGER) {
              await sendManagerNotification(requestId, {
                type: "new_request",
                employeeName,
                requestType: request?.request_type,
                amount: (request?.request_data as any)?.amount,
                priority: (request?.request_data as any)?.priority,
              });
            }
            if (requestId && approverRole === UserRole.HR) {
              await sendHrNotification(requestId, {
                type: "awaiting_verification",
                employeeName,
                requestId,
              });
            }
            if (requestId && approverRole === UserRole.CEO) {
              await sendCeoNotification("awaiting_approval", { requestId });
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("[notifications] failed to create approver notification", err);
          }

          // Keep `Request` table in sync for global panels.
          try {
            const requestId = (execution.data as any)?.requestId as string | undefined;
            if (requestId && approverRole) {
              await prisma.request.update({
                where: { id: requestId },
                data: {
                  current_step_id: step.id,
                  status: "pending" as any,
                  request_data: {
                    ...((await prisma.request.findUnique({ where: { id: requestId }, select: { request_data: true } }))?.request_data as any),
                    next_approver_role: approverRole,
                  },
                },
              });
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("[requests] failed to sync current level", err);
          }

          if (approverRole && this.email) {
            const subject =
              approverRole === UserRole.MANAGER
                ? "New Request Assigned"
                : approverRole === UserRole.HR
                  ? "Request Awaiting Approval"
                  : approverRole === UserRole.CEO
                    ? "Final Approval Required"
                    : "Halleyx Workflow Update";
            const html = `
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <h1>Halleyx Workflow System</h1>
                <p>Hello,</p>
                <p>A request has reached the <strong>${step.name}</strong> stage and is waiting for your approval.</p>
                <p>Status: PENDING<br/>Current Stage: ${approverRole}</p>
              </div>
            `;
            await this.email.notifyRole({ role: approverRole, subject, html });
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

    if (
      execution.status === ExecutionStatus.completed &&
      this.email &&
      (execution.data as any)?.requestId
    ) {
      try {
        // eslint-disable-next-line no-console
        console.log("REQUEST FULLY APPROVED");
        const requestId = (execution.data as any).requestId as string;
        const request = await prisma.request.findUnique({
          where: { id: requestId },
          include: { requester: { select: { name: true, email: true } } },
        });
        if (request?.requester?.email) {
          const workflow = await prisma.workflow.findUnique({
            where: { id: execution.workflow_id },
          });
          await this.email.sendRequestStatusEmail({
            to: request.requester.email,
            name: request.requester.name,
            title:
              ((request.request_data as any)?.title as string) ||
              `${request.request_type} request`,
            stageName: "Completed",
            level: (execution.data as any)?.current_step ?? "Completed",
            status: "APPROVED",
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[email] failed to send completion email", err);
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
            const html = `
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <h2>${subject}</h2>
                <p>Execution <strong>${executionId}</strong> reached notification step: <strong>${stepName}</strong>.</p>
                <p>Role: <strong>${notifyRole}</strong></p>
              </div>
            `;
            await this.email.notifyRole({ role: notifyRole, subject, html });
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

    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { role: true },
    });
    if (!approver) throw new Error("Approver not found");

    const currentLevelRole = (step.metadata as any)?.approverRole as UserRole | undefined;
    // eslint-disable-next-line no-console
    console.log("CURRENT LEVEL:", currentLevelRole ?? null);

    if (currentLevelRole && approver.role !== currentLevelRole && approver.role !== UserRole.ADMIN) {
      throw new Error("Role mismatch for current approval level");
    }

    if (currentLevelRole === UserRole.HR) {
      // eslint-disable-next-line no-console
      console.log("HR APPROVAL ACTION:", (execution.data as any)?.requestId ?? executionId);
    }
    if (currentLevelRole === UserRole.CEO) {
      // eslint-disable-next-line no-console
      console.log("CEO APPROVAL ACTION:", (execution.data as any)?.requestId ?? executionId);
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

    // Advance workflow to the next step on approval, using step rules.
    // Without this, executions would remain stuck on the same approval step.
    if (decision === "approve") {
      const { selectedNextStepId } = evaluateRulesForStep(step.rules, updatedData as any);
      const nextStep = selectedNextStepId
        ? await prisma.step.findUnique({ where: { id: selectedNextStepId }, select: { metadata: true, step_type: true } })
        : null;
      const nextApproverRole = (nextStep?.metadata as any)?.approverRole as UserRole | undefined;

      if (currentLevelRole === UserRole.MANAGER && nextApproverRole === UserRole.HR) {
        // eslint-disable-next-line no-console
        console.log("MOVED TO HR");
      }
      if (currentLevelRole === UserRole.HR && nextApproverRole === UserRole.CEO) {
        // eslint-disable-next-line no-console
        console.log("MOVED TO CEO");
      }

      if ((updatedExecution.data as any)?.requestId) {
        const requestId = (updatedExecution.data as any).requestId as string;
        const nextLevel = ExecutionService.roleToWorkflowLevel(nextApproverRole ?? null);
        if (nextApproverRole) {
          const nextUser = await prisma.user.findFirst({
            where: { role: nextApproverRole },
            select: { email: true },
          });
          if (nextApproverRole === UserRole.MANAGER) console.log("MANAGER EMAIL:", nextUser?.email ?? null);
          if (nextApproverRole === UserRole.HR) console.log("HR EMAIL:", nextUser?.email ?? null);
          if (nextApproverRole === UserRole.CEO) console.log("CEO EMAIL:", nextUser?.email ?? null);
        }

        // Keep request JSON workflow fields in sync for dashboards that read them.
        const existingReq = await prisma.request.findUnique({
          where: { id: requestId },
          select: { request_data: true },
        });
        await prisma.request.update({
          where: { id: requestId },
          data: {
            status: "pending" as any,
            request_data: {
              ...(existingReq?.request_data as any),
              currentLevel: nextLevel,
              next_approver_role: nextApproverRole ?? null,
            },
          },
        });
      }

      await prisma.execution.update({
        where: { id: executionId },
        data: {
          current_step_id: selectedNextStepId,
          status: selectedNextStepId ? ExecutionStatus.in_progress : ExecutionStatus.completed,
          ended_at: selectedNextStepId ? null : new Date(),
        },
      });
    } else {
      // Rejection ends the execution.
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.failed,
          ended_at: new Date(),
        },
      });
    }

    // Update workflow step history (progressHistory) for HR/CEO visibility.
    try {
      const requestId = (execution.data as any)?.requestId as string | undefined;
      if (requestId && currentLevelRole) {
        await prisma.workflowStep.updateMany({
          where: { request_id: requestId, role: currentLevelRole, status: "pending" as any },
          data: {
            status: decision === "approve" ? ("approved" as any) : ("rejected" as any),
            approver_id: approverId,
          },
        });
        if (decision === "reject") {
          await prisma.request.update({
            where: { id: requestId },
            data: { status: "rejected" as any },
          });
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[workflow] failed to update workflowStep history", err);
    }

    if (this.email && (execution.data as any)?.requestId) {
      try {
        const requestId = (execution.data as any).requestId as string;
        const request = await prisma.request.findUnique({
          where: { id: requestId },
          include: { requester: { select: { name: true, email: true } } },
        });
        if (request?.requester?.email) {
          const title =
            ((request.request_data as any)?.title as string) ||
            `${request.request_type} request`;
          const status = decision === "approve" ? "APPROVED" : "REJECTED";
          const stageName = step.name;
          if (decision === "reject") {
            await this.email.sendRequestStatusEmail({
              to: request.requester.email,
              name: request.requester.name,
              title,
              stageName,
              level: (execution.data as any)?.current_step ?? stageName,
              status: "REJECTED",
            });
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[email] failed to send decision email", err);
      }
    }

    await this.runFromCurrentStep(updatedExecution.id);
    return prisma.execution.findUnique({ where: { id: executionId } });
  }

  private emitExecutionUpdate(executionId: string) {
    if (!this.io) return;
    this.io.to(`execution:${executionId}`).emit('execution:update', { executionId });
  }
}

