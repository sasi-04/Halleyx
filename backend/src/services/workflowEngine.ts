import { prisma } from "../models/prisma";
import { RequestType, RequestStatus, StepType, UserRole } from "@prisma/client";
import { AutomationService } from "./automationService";
import { sendHrNotification, sendManagerNotification, sendCeoNotification, sendItNotification } from "./notificationService";

export interface WorkflowStep {
  step: number;
  name: string;
  approver: UserRole | null;
  status: RequestStatus;
  action?: string;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'lt' | 'gt' | 'eq' | 'ne' | 'in' | 'contains' | 'not_contains';
  value: any;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  requestType: RequestType;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isActive: boolean;
  priority: number;
}

export interface WorkflowAction {
  type: 'approve' | 'skip' | 'notify' | 'update_field' | 'complete';
  target?: string;
  value?: any;
  message?: string;
}

export interface WorkflowExecution {
  id: string;
  requestId: string;
  currentStep: number;
  nextStep: number;
  nextApprover: UserRole | null;
  status: RequestStatus;
  executedAt: Date;
  actions: WorkflowAction[];
  auditLogs: string[];
}

export class WorkflowEngine {
  
  /**
   * Start workflow execution for a new request
   */
  static async startWorkflow(requestId: string): Promise<WorkflowExecution> {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { 
        requester: true
      }
    });

    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    const requestData = request.request_data as any;
    const requestType = request.request_type;

    // Initialize workflow execution
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId,
      currentStep: 1,
      nextStep: 1,
      nextApprover: this.getInitialApprover(requestType, requestData),
      status: RequestStatus.pending,
      executedAt: new Date(),
      actions: [],
      auditLogs: [`Workflow started for ${requestType} request`]
    };

    // Apply automation rules
    await this.applyAutomationRules(request, execution);

    // Update request with workflow state
    await this.updateRequestWorkflow(requestId, execution);

    // Create execution record
    await this.createExecutionRecord(execution);

    // Send initial notifications
    await this.sendWorkflowNotifications(request, execution);

    return execution;
  }

  /**
   * Process workflow step after approval/rejection
   */
  static async processWorkflowStep(
    requestId: string, 
    approvedBy: UserRole, 
    action: 'approve' | 'reject',
    comments?: string
  ): Promise<WorkflowExecution> {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: true }
    });

    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    const requestData = request.request_data as any;
    const currentStep = requestData.current_step || 1;

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId,
      currentStep,
      nextStep: currentStep + 1,
      nextApprover: null,
      status: RequestStatus.in_progress,
      executedAt: new Date(),
      actions: [{
        type: action as any,
        target: approvedBy,
        message: comments
      }],
      auditLogs: [
        `Step ${currentStep} ${action} by ${approvedBy}`,
        comments ? `Comments: ${comments}` : ''
      ].filter(Boolean)
    };

    if (action === 'approve') {
      // Get next step based on workflow rules
      const nextStepInfo = await AutomationService.getNextWorkflowStep(
        request.request_type,
        currentStep,
        requestData.amount,
        requestData
      );

      execution.nextStep = nextStepInfo.step;
      execution.nextApprover = nextStepInfo.approver as UserRole;
      execution.status = ((nextStepInfo as any).status ?? RequestStatus.in_progress) as RequestStatus;

      // Apply automation rules for the next step
      await this.applyAutomationRules(request, execution);

      // Update request data
      const updatedRequestData = {
        ...requestData,
        current_step: nextStepInfo.step,
        next_approver_role: nextStepInfo.approver,
        status: (nextStepInfo as any).status ?? RequestStatus.in_progress,
        [`${approvedBy}_approval_status`]: 'approved',
        [`${approvedBy}_approval_date`]: new Date().toISOString(),
        [`${approvedBy}_comments`]: comments
      };

      await prisma.request.update({
        where: { id: requestId },
        data: { request_data: updatedRequestData }
      });

    } else {
      // Rejection - end workflow
      execution.status = RequestStatus.rejected;
      execution.nextApprover = null;

      await prisma.request.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.rejected,
          request_data: {
            ...requestData,
            status: RequestStatus.rejected,
            next_approver_role: null,
            [`${approvedBy}_approval_status`]: 'rejected',
            [`${approvedBy}_approval_date`]: new Date().toISOString(),
            [`${approvedBy}_comments`]: comments
          }
        }
      });
    }

    // Create execution record
    await this.createExecutionRecord(execution);

    // Send notifications
    await this.sendWorkflowNotifications(request, execution);

    return execution;
  }

  /**
   * Apply automation rules to workflow execution
   */
  private static async applyAutomationRules(
    request: any, 
    execution: WorkflowExecution
  ): Promise<void> {
    const requestData = request.request_data as any;
    const requestType = request.request_type;

    // Get applicable automation rules
    const rules = await this.getApplicableRules(requestType, requestData);

    for (const rule of rules) {
      if (await this.evaluateConditions(rule.conditions, requestData)) {
        for (const action of rule.actions) {
          await this.executeAction(action, request, execution);
        }
      }
    }

    // Apply built-in automation rules
    if (requestType === RequestType.expense) {
      await this.applyExpenseAutomationRules(requestData, execution);
    } else if (requestType === RequestType.onboarding) {
      await this.applyOnboardingAutomationRules(requestData, execution);
    }
  }

  /**
   * Apply expense-specific automation rules
   */
  private static async applyExpenseAutomationRules(
    requestData: any, 
    execution: WorkflowExecution
  ): Promise<void> {
    const amount = requestData.amount || 0;
    const priority = requestData.priority || 'medium';

    // Rule 1: If expense amount < 100, automatically approve manager step
    if (amount < 100 && execution.currentStep === 1) {
      execution.nextStep = 3; // Skip to HR
      execution.nextApprover = UserRole.HR;
      execution.status = RequestStatus.in_progress;
      
      execution.actions.push({
        type: 'approve',
        target: 'manager',
        message: 'Auto-approved: Amount < $100'
      });
      
      execution.auditLogs.push('auto_manager_approval: Amount < $100');
    }

    // Rule 2: If expense amount < 5000, skip CEO approval step
    if (amount < 5000) {
      execution.actions.push({
        type: 'skip',
        target: 'ceo',
        message: 'CEO approval skipped: Amount < $5000'
      });
      
      execution.auditLogs.push('ceo_approval_skipped: Amount < $5000');
    }

    // Rule 3: If priority = low, fast track workflow
    if (priority === 'low') {
      execution.actions.push({
        type: 'update_field',
        target: 'priority',
        value: 'fast_track'
      });
      
      execution.auditLogs.push('workflow_fast_tracked: Priority = low');
    }
  }

  /**
   * Apply onboarding-specific automation rules
   */
  private static async applyOnboardingAutomationRules(
    requestData: any, 
    execution: WorkflowExecution
  ): Promise<void> {
    // When HR approves onboarding request, automatically notify IT team
    if (execution.currentStep === 3 && execution.nextApprover === (UserRole as any).IT) {
      execution.actions.push({
        type: 'notify',
        target: 'it',
        message: 'New employee onboarding requires IT setup'
      });
      
      execution.auditLogs.push('it_notification_sent: HR approved onboarding request');
    }
  }

  /**
   * Get applicable automation rules for request type
   */
  private static async getApplicableRules(
    requestType: RequestType, 
    requestData: any
  ): Promise<WorkflowRule[]> {
    // For now, return built-in rules
    // In future, fetch from database based on configuration
    return this.getBuiltInRules(requestType);
  }

  /**
   * Get built-in automation rules
   */
  private static getBuiltInRules(requestType: RequestType): WorkflowRule[] {
    if (requestType === RequestType.expense) {
      return [
        {
          id: 'expense_auto_approve_small',
          name: 'Auto-approve small expenses',
          description: 'Automatically approve expenses under $100',
          requestType: RequestType.expense,
          conditions: [
            { field: 'amount', operator: 'lt', value: 100 }
          ],
          actions: [
            { type: 'approve', target: 'manager', message: 'Auto-approved: Amount < $100' },
            { type: 'update_field', target: 'current_step', value: 3 },
            { type: 'update_field', target: 'next_approver_role', value: 'hr' }
          ],
          isActive: true,
          priority: 1
        },
        {
          id: 'expense_skip_ceo_large',
          name: 'Skip CEO for moderate expenses',
          description: 'Skip CEO approval for expenses under $5000',
          requestType: RequestType.expense,
          conditions: [
            { field: 'amount', operator: 'lt', value: 5000 }
          ],
          actions: [
            { type: 'skip', target: 'ceo', message: 'CEO approval skipped: Amount < $5000' }
          ],
          isActive: true,
          priority: 2
        },
        {
          id: 'expense_fast_track_low_priority',
          name: 'Fast track low priority requests',
          description: 'Fast track workflow for low priority requests',
          requestType: RequestType.expense,
          conditions: [
            { field: 'priority', operator: 'eq', value: 'low' }
          ],
          actions: [
            { type: 'update_field', target: 'priority', value: 'fast_track' }
          ],
          isActive: true,
          priority: 3
        }
      ];
    } else if (requestType === RequestType.onboarding) {
      return [
        {
          id: 'onboarding_auto_it_setup',
          name: 'Auto-trigger IT setup',
          description: 'Automatically notify IT for new employee setup',
          requestType: RequestType.onboarding,
          conditions: [
            { field: 'current_step', operator: 'eq', value: 3 }
          ],
          actions: [
            { type: 'notify', target: 'it', message: 'New employee onboarding requires IT setup' }
          ],
          isActive: true,
          priority: 1
        }
      ];
    }

    return [];
  }

  /**
   * Evaluate workflow conditions
   */
  private static async evaluateConditions(
    conditions: WorkflowCondition[], 
    requestData: any
  ): Promise<boolean> {
    for (const condition of conditions) {
      const fieldValue = requestData[condition.field];
      let result = false;

      switch (condition.operator) {
        case 'lt':
          result = fieldValue < condition.value;
          break;
        case 'gt':
          result = fieldValue > condition.value;
          break;
        case 'eq':
          result = fieldValue === condition.value;
          break;
        case 'ne':
          result = fieldValue !== condition.value;
          break;
        case 'in':
          result = Array.isArray(condition.value) && condition.value.includes(fieldValue);
          break;
      }

      if (!result) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute workflow action
   */
  private static async executeAction(
    action: WorkflowAction, 
    request: any, 
    execution: WorkflowExecution
  ): Promise<void> {
    switch (action.type) {
      case 'approve':
        execution.actions.push(action);
        execution.auditLogs.push(`auto_approval: ${action.target} - ${action.message}`);
        break;
        
      case 'skip':
        execution.actions.push(action);
        execution.auditLogs.push(`workflow_step_skipped: ${action.target} - ${action.message}`);
        break;
        
      case 'notify':
        execution.actions.push(action);
        execution.auditLogs.push(`notification_sent: ${action.target} - ${action.message}`);
        break;
        
      case 'update_field':
        execution.actions.push(action);
        execution.auditLogs.push(`field_updated: ${action.target} = ${action.value}`);
        break;
        
      case 'complete':
        execution.status = RequestStatus.approved;
        execution.nextApprover = null;
        execution.auditLogs.push(`workflow_completed: ${action.message}`);
        break;
    }
  }

  /**
   * Get initial approver for request type
   */
  private static getInitialApprover(requestType: RequestType, requestData: any): UserRole {
    switch (requestType) {
      case RequestType.expense:
        // Check if auto-approval applies
        if (requestData.amount < 100) {
          return UserRole.HR; // Skip manager, go to HR
        }
        return UserRole.MANAGER;
        
      case RequestType.onboarding:
        return UserRole.MANAGER;
        
      default:
        return UserRole.MANAGER;
    }
  }

  /**
   * Update request with workflow execution data
   */
  private static async updateRequestWorkflow(
    requestId: string, 
    execution: WorkflowExecution
  ): Promise<void> {
    const request = await prisma.request.findUnique({
      where: { id: requestId }
    });

    if (!request) return;

    const requestData = request.request_data as any;
    const updatedRequestData = {
      ...requestData,
      current_step: execution.nextStep,
      next_approver_role: execution.nextApprover,
      status: execution.status,
      workflow_execution_id: execution.id,
      last_executed_at: execution.executedAt
    };

    await prisma.request.update({
      where: { id: requestId },
      data: {
        status: execution.status,
        request_data: updatedRequestData
      }
    });
  }

  /**
   * Create workflow execution record
   */
  private static async createExecutionRecord(execution: WorkflowExecution): Promise<void> {
    try {
      await prisma.executionLog.create({
        data: {
          execution_id: execution.id,
          step_name: `workflow_step_${execution.currentStep}`,
          step_type: StepType.task,
          evaluated_rules: {},
          status: execution.status as any,
          error_message: execution.auditLogs.join('; ')
        }
      });
    } catch {
      // execution_id is a non-UUID in-memory id; log failure silently
    }
  }

  /**
   * Send workflow notifications
   */
  private static async sendWorkflowNotifications(
    request: any, 
    execution: WorkflowExecution
  ): Promise<void> {
    const requestData = request.request_data as any;
    const requesterName = request.requester?.name || 'Unknown';

    if (execution.nextApprover) {
      switch (execution.nextApprover) {
        case UserRole.MANAGER:
          await sendManagerNotification(request.id, {
            type: 'new_request',
            employeeName: requesterName,
            requestType: request.request_type,
            amount: requestData.amount,
            priority: requestData.priority
          });
          break;
          
        case UserRole.HR:
          await sendHrNotification(request.id, {
            type: 'awaiting_verification',
            employeeName: requesterName,
            requestType: request.request_type,
            amount: requestData.amount,
            autoApproved: execution.actions.some(a => a.type === 'approve' && a.target === 'manager')
          });
          break;
          
        case UserRole.CEO:
          await sendCeoNotification(request.id, {
            type: 'awaiting_approval',
            employeeName: requesterName,
            requestType: request.request_type,
            amount: requestData.amount,
            priority: requestData.priority
          });
          break;
          
        case (UserRole as any).IT:
          await sendItNotification(request.id, {
            type: 'setup_required',
            employeeName: requestData.newEmployeeName || requesterName,
            position: requestData.position,
            department: requestData.department,
            joiningDate: requestData.joiningDate
          });
          break;
      }
    }

    // Send completion notification if workflow is complete
    if (execution.status === RequestStatus.approved) {
      await this.sendCompletionNotification(request, execution);
    }
  }

  /**
   * Send completion notification
   */
  private static async sendCompletionNotification(
    request: any, 
    execution: WorkflowExecution
  ): Promise<void> {
    const requestData = request.request_data as any;
    const requesterEmail = request.requester?.email;

    if (requesterEmail) {
      // Send email notification to requester
      // This would integrate with your email service
      console.log(`Completion notification sent to ${requesterEmail}`);
    }
  }

  /**
   * Get workflow status for request
   */
  static async getWorkflowStatus(requestId: string): Promise<any> {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: true }
    });

    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    const requestData = request.request_data as any;
    const currentStep = requestData.current_step || 1;

    return {
      requestId,
      requestType: request.request_type,
      status: request.status,
      currentStep,
      nextApprover: requestData.next_approver_role,
      workflowSteps: this.getWorkflowSteps(request.request_type),
      completedSteps: this.getCompletedSteps(requestData),
      automationApplied: requestData.auto_approval_rules || {},
      lastExecutedAt: requestData.last_executed_at
    };
  }

  /**
   * Get workflow steps for request type
   */
  private static getWorkflowSteps(requestType: RequestType): WorkflowStep[] {
    if (requestType === RequestType.expense) {
      return [
        { step: 1, name: 'Employee Submission', approver: null, status: RequestStatus.completed },
        { step: 2, name: 'Manager Approval', approver: UserRole.MANAGER, status: RequestStatus.pending },
        { step: 3, name: 'HR Verification', approver: UserRole.HR, status: RequestStatus.pending },
        { step: 4, name: 'CEO Approval', approver: UserRole.CEO, status: RequestStatus.pending },
        { step: 5, name: 'Completed', approver: null, status: RequestStatus.completed }
      ];
    } else if (requestType === RequestType.onboarding) {
      return [
        { step: 1, name: 'Employee Submission', approver: null, status: RequestStatus.completed },
        { step: 2, name: 'Manager Approval', approver: UserRole.MANAGER, status: RequestStatus.pending },
        { step: 3, name: 'HR Verification', approver: UserRole.HR, status: RequestStatus.pending },
        { step: 4, name: 'IT Setup', approver: (UserRole as any).IT, status: RequestStatus.pending },
        { step: 5, name: 'Completed', approver: null, status: RequestStatus.completed }
      ];
    }

    return [];
  }

  /**
   * Get completed steps from request data
   */
  private static getCompletedSteps(requestData: any): number[] {
    const completedSteps = [1]; // Employee submission is always completed
    
    if (requestData.manager_approval_status === 'approved') {
      completedSteps.push(2);
    }
    
    if (requestData.hr_approval_status === 'approved') {
      completedSteps.push(3);
    }
    
    if (requestData.ceo_approval_status === 'approved') {
      completedSteps.push(4);
    }
    
    if (requestData.it_setup_status === 'completed') {
      completedSteps.push(4);
    }

    return completedSteps;
  }
}
