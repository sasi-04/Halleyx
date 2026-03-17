import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { RequestType, UserRole } from "@prisma/client";
import { WorkflowEngine } from "../services/workflowEngine";
import { AutomationRulesService } from "../services/automationRulesService";

// ==================== START WORKFLOW ====================

export async function startWorkflow(req: AuthedRequest, res: Response) {
  try {
    const { requestId } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!requestId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Request ID is required" 
      });
    }

    // Start workflow execution
    const execution = await WorkflowEngine.startWorkflow(requestId);

    res.status(StatusCodes.OK).json({
      message: "Workflow started successfully",
      execution
    });
  } catch (error: any) {
    console.error("Error starting workflow:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to start workflow" 
    });
  }
}

// ==================== PROCESS WORKFLOW STEP ====================

export async function processWorkflowStep(req: AuthedRequest, res: Response) {
  try {
    const { requestId, action, comments } = req.body;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!requestId || !action) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Request ID and action are required" 
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Action must be 'approve' or 'reject'" 
      });
    }

    // Process workflow step
    const execution = await WorkflowEngine.processWorkflowStep(
      requestId, 
      userRole as UserRole, 
      action as 'approve' | 'reject',
      comments
    );

    res.status(StatusCodes.OK).json({
      message: `Request ${action}d successfully`,
      execution
    });
  } catch (error: any) {
    console.error("Error processing workflow step:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to process workflow step" 
    });
  }
}

// ==================== GET WORKFLOW STATUS ====================

export async function getWorkflowStatus(req: AuthedRequest, res: Response) {
  try {
    const { requestId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!requestId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Request ID is required" 
      });
    }

    // Get workflow status
    const status = await WorkflowEngine.getWorkflowStatus(requestId);

    res.status(StatusCodes.OK).json({
      message: "Workflow status retrieved successfully",
      status
    });
  } catch (error: any) {
    console.error("Error getting workflow status:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to get workflow status" 
    });
  }
}

// ==================== GET AUTOMATION RULES ====================

export async function getAutomationRules(req: AuthedRequest, res: Response) {
  try {
    const { requestType } = req.query;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    let rules;
    if (requestType) {
      rules = await AutomationRulesService.getRulesByRequestType(requestType as RequestType);
    } else {
      rules = await AutomationRulesService.getAllRules();
    }

    res.status(StatusCodes.OK).json({
      message: "Automation rules retrieved successfully",
      rules,
      count: rules.length
    });
  } catch (error: any) {
    console.error("Error getting automation rules:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to get automation rules" 
    });
  }
}

// ==================== CREATE AUTOMATION RULE ====================

export async function createAutomationRule(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    const ruleData = req.body;

    // Validate rule configuration
    const validation = AutomationRulesService.validateRule(ruleData);
    if (!validation.isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Invalid rule configuration", 
        details: validation.errors 
      });
    }

    // Create rule
    const rule = await AutomationRulesService.createRule(ruleData);

    res.status(StatusCodes.CREATED).json({
      message: "Automation rule created successfully",
      rule
    });
  } catch (error: any) {
    console.error("Error creating automation rule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to create automation rule" 
    });
  }
}

// ==================== UPDATE AUTOMATION RULE ====================

export async function updateAutomationRule(req: AuthedRequest, res: Response) {
  try {
    const { ruleId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!ruleId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Rule ID is required" 
      });
    }

    const updateData = req.body;

    // Validate rule configuration
    const validation = AutomationRulesService.validateRule(updateData);
    if (!validation.isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Invalid rule configuration", 
        details: validation.errors 
      });
    }

    // Update rule
    const rule = await AutomationRulesService.updateRule(ruleId, updateData);

    res.status(StatusCodes.OK).json({
      message: "Automation rule updated successfully",
      rule
    });
  } catch (error: any) {
    console.error("Error updating automation rule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to update automation rule" 
    });
  }
}

// ==================== DELETE AUTOMATION RULE ====================

export async function deleteAutomationRule(req: AuthedRequest, res: Response) {
  try {
    const { ruleId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!ruleId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Rule ID is required" 
      });
    }

    // Delete rule
    await AutomationRulesService.deleteRule(ruleId);

    res.status(StatusCodes.OK).json({
      message: "Automation rule deleted successfully"
    });
  } catch (error: any) {
    console.error("Error deleting automation rule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to delete automation rule" 
    });
  }
}

// ==================== TOGGLE AUTOMATION RULE ====================

export async function toggleAutomationRule(req: AuthedRequest, res: Response) {
  try {
    const { ruleId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!ruleId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Rule ID is required" 
      });
    }

    // Toggle rule
    const rule = await AutomationRulesService.toggleRule(ruleId);

    res.status(StatusCodes.OK).json({
      message: `Automation rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`,
      rule
    });
  } catch (error: any) {
    console.error("Error toggling automation rule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to toggle automation rule" 
    });
  }
}

// ==================== TEST AUTOMATION RULE ====================

export async function testAutomationRule(req: AuthedRequest, res: Response) {
  try {
    const { ruleId } = req.params;
    const { testData } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!ruleId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Rule ID is required" 
      });
    }

    // Get rule
    const rules = await AutomationRulesService.getAllRules();
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        error: "Rule not found" 
      });
    }

    // Test rule
    const result = await AutomationRulesService.testRule(rule, testData);

    res.status(StatusCodes.OK).json({
      message: "Rule test completed",
      result
    });
  } catch (error: any) {
    console.error("Error testing automation rule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to test automation rule" 
    });
  }
}

// ==================== GET RULE EXECUTION HISTORY ====================

export async function getRuleExecutionHistory(req: AuthedRequest, res: Response) {
  try {
    const { ruleId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!ruleId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Rule ID is required" 
      });
    }

    // Get execution history
    const history = await AutomationRulesService.getRuleExecutionHistory(ruleId);

    res.status(StatusCodes.OK).json({
      message: "Rule execution history retrieved successfully",
      history,
      count: history.length
    });
  } catch (error: any) {
    console.error("Error getting rule execution history:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to get rule execution history" 
    });
  }
}

// ==================== GET RULE STATISTICS ====================

export async function getRuleStatistics(req: AuthedRequest, res: Response) {
  try {
    const { ruleId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!ruleId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Rule ID is required" 
      });
    }

    // Get rule statistics
    const statistics = await AutomationRulesService.getRuleStatistics(ruleId);

    res.status(StatusCodes.OK).json({
      message: "Rule statistics retrieved successfully",
      statistics
    });
  } catch (error: any) {
    console.error("Error getting rule statistics:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to get rule statistics" 
    });
  }
}

// ==================== CLONE AUTOMATION RULE ====================

export async function cloneAutomationRule(req: AuthedRequest, res: Response) {
  try {
    const { ruleId } = req.params;
    const { newName } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!ruleId || !newName) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Rule ID and new name are required" 
      });
    }

    // Clone rule
    const clonedRule = await AutomationRulesService.cloneRule(ruleId, newName);

    res.status(StatusCodes.CREATED).json({
      message: "Automation rule cloned successfully",
      rule: clonedRule
    });
  } catch (error: any) {
    console.error("Error cloning automation rule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to clone automation rule" 
    });
  }
}

// ==================== EXPORT AUTOMATION RULES ====================

export async function exportAutomationRules(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    // Export rules
    const rules = await AutomationRulesService.exportRules();

    res.status(StatusCodes.OK).json({
      message: "Automation rules exported successfully",
      rules,
      exportedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error exporting automation rules:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to export automation rules" 
    });
  }
}

// ==================== IMPORT AUTOMATION RULES ====================

export async function importAutomationRules(req: AuthedRequest, res: Response) {
  try {
    const { rules } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }

    if (!rules || !Array.isArray(rules)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: "Rules array is required" 
      });
    }

    // Import rules
    const result = await AutomationRulesService.importRules(rules);

    res.status(StatusCodes.OK).json({
      message: "Automation rules import completed",
      ...result
    });
  } catch (error: any) {
    console.error("Error importing automation rules:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: error?.message || "Failed to import automation rules" 
    });
  }
}
