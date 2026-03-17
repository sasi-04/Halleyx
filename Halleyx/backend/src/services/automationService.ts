import { prisma } from "../models/prisma";
import { RequestType } from "@prisma/client";

export class AutomationService {
  
  /**
   * Apply automation rules for expense requests
   */
  static async applyExpenseAutomationRules(requestId: string, amount: number) {
    const requestData: any = {};
    
    // Rule: If expense amount < 100, Manager approval should be automatic
    if (amount < 100) {
      requestData.manager_approval_status = "auto_approved";
      requestData.manager_approval_date = new Date().toISOString();
      requestData.current_step = 2; // Skip to HR
      requestData.next_approver_role = "hr";
      requestData.status = "in_progress";
    }
    
    // Rule: If expense amount < 5000, CEO step should be skipped
    if (amount < 5000) {
      requestData.skip_ceo_approval = true;
    }
    
    return requestData;
  }
  
  /**
   * Apply automation rules for onboarding requests
   */
  static async applyOnboardingAutomationRules(requestId: string) {
    const requestData: any = {};
    
    // Rule: Automatically trigger IT setup after HR approval
    requestData.auto_trigger_it_setup = true;
    
    return requestData;
  }
  
  /**
   * Check if manager approval should be automatic
   */
  static shouldAutoApproveManager(amount: number): boolean {
    return amount < 100;
  }
  
  /**
   * Check if CEO approval should be skipped
   */
  static shouldSkipCEOApproval(amount: number, priority?: string): boolean {
    // Skip CEO if amount < 5000 OR priority is low
    return amount < 5000 || priority === "low";
  }
  
  /**
   * Check if CEO approval is required
   */
  static requiresCeoApproval(amount: number, priority?: string): boolean {
    // CEO approval required if amount >= 5000 AND priority is not low
    return amount >= 5000 && priority !== "low";
  }
  
  /**
   * Get next step in workflow based on automation rules
   */
  static async getNextWorkflowStep(
    requestType: RequestType, 
    currentStep: number, 
    amount?: number,
    requestData?: any
  ) {
    switch (requestType) {
      case RequestType.expense:
        return this.getExpenseWorkflowStep(currentStep, amount || 0);
      
      case RequestType.onboarding:
        return this.getOnboardingWorkflowStep(currentStep);
      
      default:
        return { step: currentStep + 1, approver: null };
    }
  }
  
  private static getExpenseWorkflowStep(currentStep: number, amount: number) {
    // Employee (1) -> Manager (2) -> HR (3) -> CEO (4) -> Completed
    switch (currentStep) {
      case 1: // Employee submitted
        if (this.shouldAutoApproveManager(amount)) {
          return { step: 3, approver: "hr", status: "in_progress" };
        }
        return { step: 2, approver: "manager", status: "in_progress" };
      
      case 2: // Manager approved
        return { step: 3, approver: "hr", status: "in_progress" };
      
      case 3: // HR approved
        if (this.shouldSkipCEOApproval(amount)) {
          return { step: 5, approver: null, status: "approved" };
        }
        return { step: 4, approver: "ceo", status: "in_progress" };
      
      case 4: // CEO approved
        return { step: 5, approver: null, status: "approved" };
      
      default:
        return { step: currentStep + 1, approver: null, status: "completed" };
    }
  }
  
  private static getOnboardingWorkflowStep(currentStep: number) {
    // Employee (1) -> Manager (2) -> HR (3) -> IT Setup (4) -> Completed (5)
    switch (currentStep) {
      case 1: // Employee submitted
        return { step: 2, approver: "manager", status: "in_progress" };
      
      case 2: // Manager approved
        return { step: 3, approver: "hr", status: "in_progress" };
      
      case 3: // HR approved
        return { step: 4, approver: "it", status: "approved" };
      
      case 4: // IT setup completed
        return { step: 5, approver: null, status: "completed" };
      
      default:
        return { step: currentStep + 1, approver: null, status: "completed" };
    }
  }
  
  /**
   * Process automatic approvals
   */
  static async processAutomaticApprovals(requestId: string) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: true }
    });
    
    if (!request) return null;
    
    const requestData = request.request_data as any;
    const amount = requestData?.amount || 0;
    
    // Apply automation rules
    const automationData = await this.applyExpenseAutomationRules(requestId, amount);
    
    // Update request with automation data
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        request_data: {
          ...requestData,
          ...automationData
        }
      }
    });
    
    return updatedRequest;
  }
}
