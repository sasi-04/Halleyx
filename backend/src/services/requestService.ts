import { prisma } from '../models/prisma';
import { RequestType, RequestStatus, UserRole } from '@prisma/client';
import { ExecutionService } from './executionService';

export class RequestService {
  constructor(private readonly executionService: ExecutionService) {}

  async createAndSubmit(
    requestType: RequestType,
    workflowId: string,
    requestedBy: string,
    requestData: Record<string, any>,
  ) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, is_active: true },
      include: { steps: true },
    });
    if (!workflow) throw new Error('Workflow not found or inactive');

    const normalizedData = this.normalizeRequestData(requestType, requestData);
    
    // Create request record with proper initial status
    const request = await prisma.request.create({
      data: {
        request_type: requestType,
        workflow_id: workflowId,
        requested_by: requestedBy,
        status: RequestStatus.pending,
        request_data: {
          ...normalizedData,
          current_step: 1,
          next_approver_role: 'manager',
          employee_submission_status: 'completed',
          employee_submission_date: new Date().toISOString(),
          manager_approval_status: 'pending'
        },
      },
    });

    // Find manager user for assignment
    const manager = await prisma.user.findFirst({
      where: { 
        role: UserRole.MANAGER,
        // Optional: filter by department if needed
        ...(normalizedData.department && { department: normalizedData.department })
      },
      select: { id: true, name: true, email: true }
    });

    if (!manager) {
      // Clean up the created request since we can't proceed
      await prisma.request.delete({
        where: { id: request.id }
      });
      throw new Error('Manager role not configured in system');
    }

    // Create workflow step record for manager approval
    await prisma.executionLog.create({
      data: {
        execution_id: `req_${request.id}`,
        request_id: request.id,
        step_name: 'Manager Approval',
        step_type: 'approval',
        status: RequestStatus.pending,
        approver_id: manager.id,
        error_message: null
      }
    });

    // Update request with manager assignment - keep status as pending
    await prisma.request.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.pending, // Keep as pending until manager acts
        request_data: {
          ...normalizedData,
          current_step: 2,
          next_approver_role: 'manager',
          employee_submission_status: 'completed',
          employee_submission_date: new Date().toISOString(),
          manager_approval_status: 'pending',
          assigned_manager_id: manager.id,
          assigned_manager_name: manager.name
        }
      }
    });

    return prisma.request.findUnique({
      where: { id: request.id },
      include: { requester: { select: { id: true, name: true, email: true } } },
    });
  }

  private normalizeRequestData(
    requestType: RequestType,
    data: Record<string, any>,
  ): Record<string, any> {
    if (requestType === RequestType.expense) {
      return {
        amount: Number(data.amount) || 0,
        country: String(data.country ?? ''),
        department: String(data.department ?? ''),
        priority: String(data.priority ?? 'Medium'),
        description: String(data.description ?? ''),
        receipt_url: String(data.receipt_url ?? ''),
      };
    }
    if (requestType === RequestType.onboarding) {
      return {
        employee_name: String(data.employee_name ?? data.employeeName ?? ''),
        department: String(data.department ?? ''),
        role: String(data.role ?? ''),
        start_date: String(data.start_date ?? data.startDate ?? ''),
        manager: String(data.manager ?? ''),
        notes: String(data.notes ?? ''),
        employeeName: String(data.employee_name ?? data.employeeName ?? ''),
        startDate: String(data.start_date ?? data.startDate ?? ''),
      };
    }
    return data;
  }

  async listByUser(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where: { requested_by: userId },
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          requester: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.request.count({ where: { requested_by: userId } }),
    ]);

    const itemsWithExecution = await Promise.all(
      items.map(async (r) => {
        let execution = null;
        if (r.execution_id) {
          execution = await prisma.execution.findUnique({
            where: { id: r.execution_id },
            select: { status: true, current_step_id: true },
          });
        }
        const status = this.deriveStatus(r, execution);
        let currentStepName = null;
        if (r.current_step_id || execution?.current_step_id) {
          const stepId = r.current_step_id || execution?.current_step_id;
          const step = await prisma.step.findUnique({
            where: { id: stepId! },
            select: { name: true },
          });
          currentStepName = step?.name ?? null;
        }
        return {
          ...r,
          derivedStatus: status,
          currentStepName,
        };
      }),
    );

    return { items: itemsWithExecution, total, page, pageSize };
  }

  async getById(id: string, userId?: string) {
    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    });
    if (!request) return null;
    if (userId && request.requested_by !== userId) return null;

    const execution = request.execution_id
      ? await prisma.execution.findUnique({
          where: { id: request.execution_id },
          include: {
            executionLogs: { orderBy: { started_at: 'asc' } },
            workflow: { select: { name: true, steps: { orderBy: { order: 'asc' } } } },
          },
        })
      : null;

    const derivedStatus = this.deriveStatus(request, execution);
    return {
      ...request,
      derivedStatus,
      execution,
    };
  }

  private deriveStatus(
    request: { status: RequestStatus; execution_id: string | null },
    execution: { status: string } | null,
  ): RequestStatus {
    if (!execution) return request.status;
    const es = execution.status as string;
    if (es === 'completed') return RequestStatus.completed;
    if (es === 'failed' || es === 'canceled') return RequestStatus.rejected;
    return request.status;
  }

  async getStats(userId: string) {
    const requests = await prisma.request.findMany({
      where: { requested_by: userId },
    });

    const withExec = await Promise.all(
      requests.map(async (r) => {
        const exec = r.execution_id
          ? await prisma.execution.findUnique({
              where: { id: r.execution_id },
              select: { status: true },
            })
          : null;
        return this.deriveStatus(r, exec);
      }),
    );

    const pending = withExec.filter((s) => s === RequestStatus.pending || s === RequestStatus.in_progress).length;
    const approved = withExec.filter((s) => s === RequestStatus.completed).length;
    const rejected = withExec.filter((s) => s === RequestStatus.rejected).length;

    return { pending, approved, rejected };
  }

  async syncRequestStatus(requestId: string) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });
    if (!request?.execution_id) return request;

    const execution = await prisma.execution.findUnique({
      where: { id: request.execution_id },
    });
    if (!execution) return request;

    const derived = this.deriveStatus(request, execution);
    if (derived !== request.status) {
      return prisma.request.update({
        where: { id: requestId },
        data: { status: derived },
      });
    }
    return request;
  }
}
