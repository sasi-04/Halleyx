import { prisma } from "../models/prisma";
import { RequestType, UserRole } from "@prisma/client";
import { WorkflowRule, WorkflowCondition, WorkflowAction } from "./workflowEngine";

export class AutomationRulesService {
  
  /**
   * Create a new automation rule (using existing Rule model)
   */
  static async createRule(ruleData: Omit<WorkflowRule, 'id'>): Promise<WorkflowRule> {
    // For now, store rules in memory or create a simple JSON structure
    // In a full implementation, you'd extend the schema
    const rule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...ruleData
    };

    // Store as a simple record for now
    await this.storeRuleInMemory(rule);
    return rule;
  }

  /**
   * Get all automation rules (from memory/storage)
   */
  static async getAllRules(): Promise<WorkflowRule[]> {
    return this.getStoredRules();
  }

  /**
   * Get rules by request type
   */
  static async getRulesByRequestType(requestType: RequestType): Promise<WorkflowRule[]> {
    const allRules = await this.getStoredRules();
    return allRules.filter(rule => 
      rule.requestType === requestType && rule.isActive
    );
  }

  /**
   * Update an automation rule
   */
  static async updateRule(
    ruleId: string, 
    updateData: Partial<WorkflowRule>
  ): Promise<WorkflowRule> {
    const rules = await this.getStoredRules();
    const ruleIndex = rules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const updatedRule = { ...rules[ruleIndex], ...updateData };
    rules[ruleIndex] = updatedRule;
    
    await this.storeRulesInMemory(rules);
    return updatedRule;
  }

  /**
   * Delete an automation rule
   */
  static async deleteRule(ruleId: string): Promise<void> {
    const rules = await this.getStoredRules();
    const filteredRules = rules.filter(rule => rule.id !== ruleId);
    await this.storeRulesInMemory(filteredRules);
  }

  /**
   * Toggle rule active status
   */
  static async toggleRule(ruleId: string): Promise<WorkflowRule> {
    const rules = await this.getStoredRules();
    const rule = rules.find(r => r.id === ruleId);
    
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    rule.isActive = !rule.isActive;
    await this.storeRulesInMemory(rules);
    return rule;
  }

  /**
   * Test a rule against sample data
   */
  static async testRule(
    rule: WorkflowRule, 
    testData: any
  ): Promise<{ matches: boolean; executedActions: WorkflowAction[] }> {
    const matches = await this.evaluateConditions(rule.conditions, testData);
    const executedActions = matches ? rule.actions : [];

    return { matches, executedActions };
  }

  /**
   * Evaluate rule conditions
   */
  private static async evaluateConditions(
    conditions: WorkflowCondition[], 
    testData: any
  ): Promise<boolean> {
    for (const condition of conditions) {
      const fieldValue = testData[condition.field];
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
        case 'contains':
          result = typeof fieldValue === 'string' && fieldValue.includes(condition.value);
          break;
        case 'not_contains':
          result = typeof fieldValue === 'string' && !fieldValue.includes(condition.value);
          break;
      }

      if (!result) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get rule execution history
   */
  static async getRuleExecutionHistory(ruleId: string): Promise<any[]> {
    const executions = await prisma.executionLog.findMany({
      where: {
        error_message: {
          contains: ruleId
        }
      },
      orderBy: { started_at: 'desc' },
      take: 100
    });

    return executions.map(exec => ({
      id: exec.id,
      requestId: exec.execution_id,
      executedAt: exec.started_at,
      status: exec.status,
      message: exec.error_message
    }));
  }

  /**
   * Clone a rule
   */
  static async cloneRule(ruleId: string, newName: string): Promise<WorkflowRule> {
    const rules = await this.getStoredRules();
    const originalRule = rules.find(rule => rule.id === ruleId);
    
    if (!originalRule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const clonedRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      description: `${originalRule.description} (Cloned)`,
      requestType: originalRule.requestType,
      conditions: originalRule.conditions,
      actions: originalRule.actions,
      isActive: false, // Start inactive
      priority: originalRule.priority
    };

    rules.push(clonedRule);
    await this.storeRulesInMemory(rules);
    return clonedRule;
  }

  /**
   * Get rule statistics
   */
  static async getRuleStatistics(ruleId: string): Promise<any> {
    const executions = await prisma.executionLog.findMany({
      where: {
        error_message: {
          contains: ruleId
        }
      }
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const lastExecuted = executions.length > 0 ? executions[0].started_at : null;

    return {
      ruleId,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      lastExecuted
    };
  }

  /**
   * Export rules to JSON
   */
  static async exportRules(): Promise<any[]> {
    const rules = await this.getStoredRules();
    return rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      requestType: rule.requestType,
      conditions: rule.conditions,
      actions: rule.actions,
      isActive: rule.isActive,
      priority: rule.priority,
      exportedAt: new Date().toISOString()
    }));
  }

  /**
   * Import rules from JSON
   */
  static async importRules(rulesData: any[]): Promise<{ imported: number; errors: string[] }> {
    const results = { imported: 0, errors: [] as string[] };

    for (const ruleData of rulesData) {
      try {
        await this.createRule({
          name: ruleData.name,
          description: ruleData.description,
          requestType: ruleData.requestType,
          conditions: ruleData.conditions,
          actions: ruleData.actions,
          isActive: ruleData.isActive || false,
          priority: ruleData.priority || 999
        });
        results.imported++;
      } catch (error: any) {
        results.errors.push(`Failed to import rule "${ruleData.name}": ${error?.message ?? 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Validate rule configuration
   */
  static validateRule(rule: Partial<WorkflowRule>): { isValid: boolean; errors: string[] } {
    const errors = [];

    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Rule name is required');
    }

    if (!rule.requestType) {
      errors.push('Request type is required');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push('At least one action is required');
    }

    // Validate conditions
    if (rule.conditions) {
      for (const condition of rule.conditions) {
        if (!condition.field) {
          errors.push('Condition field is required');
        }
        if (!condition.operator) {
          errors.push('Condition operator is required');
        }
        if (condition.value === undefined || condition.value === null) {
          errors.push('Condition value is required');
        }
      }
    }

    // Validate actions
    if (rule.actions) {
      for (const action of rule.actions) {
        if (!action.type) {
          errors.push('Action type is required');
        }
        if (action.type === 'update_field' && !action.target) {
          errors.push('Action target is required for update_field actions');
        }
        if (action.type === 'notify' && !action.target) {
          errors.push('Action target is required for notify actions');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // In-memory storage for rules (in production, use database)
  private static storedRules: WorkflowRule[] = [
    // Built-in expense rules
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
    },
    // Built-in onboarding rules
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

  private static async getStoredRules(): Promise<WorkflowRule[]> {
    return this.storedRules;
  }

  private static async storeRulesInMemory(rules: WorkflowRule[]): Promise<void> {
    this.storedRules = rules;
  }

  private static async storeRuleInMemory(rule: WorkflowRule): Promise<void> {
    this.storedRules.push(rule);
  }
}
