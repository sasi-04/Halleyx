import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { UserRole } from "@prisma/client";
import * as workflowEngineController from "../controllers/workflowEngineController";

const router = Router();

// All workflow engine routes require authentication
router.use(requireAuth);

// Workflow execution routes
router.post("/start", requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.HR]), workflowEngineController.startWorkflow);
router.post("/process-step", requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.HR, UserRole.CEO]), workflowEngineController.processWorkflowStep);
router.get("/status/:requestId", requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.HR, UserRole.CEO, UserRole.EMPLOYEE]), workflowEngineController.getWorkflowStatus);

// Automation rules management routes (admin only)
router.get("/rules", requireRole([UserRole.ADMIN]), workflowEngineController.getAutomationRules);
router.post("/rules", requireRole([UserRole.ADMIN]), workflowEngineController.createAutomationRule);
router.put("/rules/:ruleId", requireRole([UserRole.ADMIN]), workflowEngineController.updateAutomationRule);
router.delete("/rules/:ruleId", requireRole([UserRole.ADMIN]), workflowEngineController.deleteAutomationRule);
router.post("/rules/:ruleId/toggle", requireRole([UserRole.ADMIN]), workflowEngineController.toggleAutomationRule);
router.post("/rules/:ruleId/test", requireRole([UserRole.ADMIN]), workflowEngineController.testAutomationRule);
router.get("/rules/:ruleId/history", requireRole([UserRole.ADMIN]), workflowEngineController.getRuleExecutionHistory);
router.get("/rules/:ruleId/statistics", requireRole([UserRole.ADMIN]), workflowEngineController.getRuleStatistics);
router.post("/rules/:ruleId/clone", requireRole([UserRole.ADMIN]), workflowEngineController.cloneAutomationRule);
router.get("/rules/export", requireRole([UserRole.ADMIN]), workflowEngineController.exportAutomationRules);
router.post("/rules/import", requireRole([UserRole.ADMIN]), workflowEngineController.importAutomationRules);

export default router;
