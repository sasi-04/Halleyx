import { prisma } from '../models/prisma';
import { RequestType, RequestStatus, UserRole } from '@prisma/client';
import { ExecutionService } from './executionService';
import { sendManagerNotification } from "./notificationService";
import { EmailService } from "./emailService";
import bcrypt from "bcrypt";

export class RequestService {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly email?: EmailService,
  ) {}

  async createAndSubmit(
    requestType: RequestType,
    workflowId: string,
    requestedBy: string,
    requestData: Record<string, any>,
  ) {
    console.log("[requests] Request received", { requestType, workflowId, requestedBy });
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, is_active: true },
      include: { steps: true },
    });
    if (!workflow) throw new Error('Workflow not found or inactive');

    // Ensure manager exists (critical for routing + email)
    const managerEmail = "sasidharan071204@gmail.com";
    let manager = await prisma.user.findUnique({
      where: { email: managerEmail.toLowerCase() },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!manager) {
      // fallback: any manager
      manager = await prisma.user.findFirst({
        where: { role: UserRole.MANAGER },
        select: { id: true, name: true, email: true, role: true },
      });
    }
    if (!manager) {
      // Create the required manager user if missing
      const password = process.env.INITIAL_USER_PASSWORD || "Halleyx123!";
      const hashed = await bcrypt.hash(password, 10);
      manager = await prisma.user.create({
        data: {
          name: "Manager User",
          email: managerEmail.toLowerCase(),
          password: hashed,
          role: UserRole.MANAGER,
        },
        select: { id: true, name: true, email: true, role: true },
      });
    }
    // Mandatory debug log
    // eslint-disable-next-line no-console
    console.log("MANAGER EMAIL:", manager?.email);

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
          currentLevel: 1,
          current_step: 1,
          next_approver_role: UserRole.MANAGER,
          employee_submission_status: 'completed',
          employee_submission_date: new Date().toISOString(),
          manager_approval_status: 'pending'
        },
      },
    });

    console.log("[requests] Request saved", { requestId: request.id });
    // Mandatory debug logs
    // eslint-disable-next-line no-console
    console.log("REQUEST CREATED:", request.id);
    // eslint-disable-next-line no-console
    console.log("ASSIGNED TO MANAGER:", manager.email);
    // eslint-disable-next-line no-console
    console.log("CURRENT LEVEL:", UserRole.MANAGER);

    // Create workflow level rows for this request (strict 1–3 levels as required).
    await prisma.workflowStep.createMany({
      data: [
        {
          request_id: request.id,
          level: 1,
          role: UserRole.MANAGER,
          approver_id: manager.id,
          status: RequestStatus.pending,
        },
        {
          request_id: request.id,
          level: 2,
          role: UserRole.HR,
          approver_id: null,
          status: RequestStatus.pending,
        },
        {
          request_id: request.id,
          level: 3,
          role: UserRole.CEO,
          approver_id: null,
          status: RequestStatus.pending,
        },
      ],
    });
    console.log("[workflow] workflow_step_created", { requestId: request.id });

    // Explicit manager email trigger (mandatory requirement)
    try {
      if (this.email && manager?.email) {
        await this.email.sendEmail(
          manager.email,
          "New Request Assigned",
          "You have a new request to approve",
        );
        // eslint-disable-next-line no-console
        console.log("EMAIL SENT TO MANAGER");
      } else {
        // eslint-disable-next-line no-console
        console.log("[email] skipped (service not configured or manager email missing)");
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[email] failed to send manager assignment email", err?.message ?? err);
    }

    // Start a real workflow execution (creates `Execution` row, pauses at approval step).
    // Include the request id in execution data so panels can associate records reliably.
    const execution = await this.executionService.startExecution(
      workflowId,
      { ...normalizedData, requestId: request.id, requestType },
      requestedBy,
    );
    if (!execution) throw new Error("Failed to start execution");

    console.log("[requests] Execution started", { requestId: request.id, executionId: execution.id });

    // Link request to execution so manager/HR/CEO queues can find it.
    await prisma.request.update({
      where: { id: request.id },
      data: {
        execution_id: execution.id,
        current_step_id: execution.current_step_id,
        status: RequestStatus.pending,
        request_data: {
          ...(request.request_data as any),
          current_step: 2,
          next_approver_role: UserRole.MANAGER,
        },
      },
    });

    // In-app notification for managers (stored in `Notification` table).
    await sendManagerNotification(request.id, {
      type: "new_request",
      employeeName: (normalizedData as any)?.employee_name ?? (normalizedData as any)?.employeeName,
      requestType: requestType,
      amount: (normalizedData as any)?.amount,
      priority: (normalizedData as any)?.priority,
    });
    console.log("[requests] Manager notification created", { requestId: request.id });

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
        title: String(data.request_title ?? data.requestTitle ?? data.title ?? ''),
        amount: Number(data.amount) || 0,
        country: String(data.country ?? ''),
        department: String(data.department ?? ''),
        priority: String(data.priority ?? 'Medium'),
        description: String(data.description ?? ''),
        receipt_url: String(data.receipt_url ?? data.receiptUrl ?? ''),
        created_at: data.created_at ?? new Date().toISOString(),
      };
    }
    if (requestType === RequestType.onboarding) {
      return {
        title: String(data.title ?? 'Onboarding Request'),
        employee_id: String(data.employee_id ?? data.employeeId ?? ''),
        employee_name: String(data.employee_name ?? data.employeeName ?? ''),
        department: String(data.department ?? ''),
        role: String(data.role ?? data.position ?? ''),
        start_date: String(data.start_date ?? data.startDate ?? data.joiningDate ?? ''),
        manager: String(data.manager ?? ''),
        notes: String(data.notes ?? ''),
        created_at: data.created_at ?? new Date().toISOString(),
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
