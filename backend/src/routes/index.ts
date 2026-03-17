import { Router } from 'express';
import {
  createWorkflow,
  listWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '../controllers/workflowController';
import {
  createStep,
  listStepsForWorkflow,
  updateStep,
  deleteStep,
} from '../controllers/stepController';
import {
  createRule,
  listRulesForStep,
  updateRule,
  deleteRule,
} from '../controllers/ruleController';
import {
  cancelExecution,
  getExecution,
  listExecutionLogs,
  listExecutions,
  approveExecutionStep,
  retryExecution,
  startExecution,
} from '../controllers/executionController';
import {
  explainExecutionLogs,
  generateRuleFromDescription,
  suggestWorkflowFromDescription,
} from '../controllers/aiController';
import { login, register, updateProfile } from "../controllers/authController";
import { requireAuth, requireRole } from "../middlewares/auth";
import { UserRole } from "@prisma/client";
import { getNotifications, getPendingApprovals } from "../controllers/dashboardController";
import {
  createExpenseRequest,
  createOnboardingRequest,
  listMyRequests,
  getRequestById,
  getRequestStats,
} from "../controllers/requestController";
import {
  getManagerPendingApprovals,
  getManagerTeamRequests,
  getManagerApprovalHistory,
  getManagerStats,
  getManagerReviewData,
} from "../controllers/managerController";
import {
  getHrOnboardingQueue,
  getHrReviewData,
  getHrStats,
  getHrHistory,
} from "../controllers/hrController";

const router = Router();

// Auth
router.post("/auth/register", register);
router.post("/auth/login", login);
router.patch("/auth/profile", requireAuth, updateProfile);

// Workflows
router.post("/workflows", requireAuth, requireRole([UserRole.ADMIN]), createWorkflow);
router.get("/workflows", requireAuth, listWorkflows);
router.get("/workflows/:id", requireAuth, getWorkflow);
router.put("/workflows/:id", requireAuth, requireRole([UserRole.ADMIN]), updateWorkflow);
router.delete("/workflows/:id", requireAuth, requireRole([UserRole.ADMIN]), deleteWorkflow);

// Steps
router.post("/workflows/:workflowId/steps", requireAuth, requireRole([UserRole.ADMIN]), createStep);
router.get("/workflows/:workflowId/steps", requireAuth, listStepsForWorkflow);
router.put("/steps/:id", requireAuth, requireRole([UserRole.ADMIN]), updateStep);
router.delete("/steps/:id", requireAuth, requireRole([UserRole.ADMIN]), deleteStep);

// Rules
router.post("/steps/:stepId/rules", requireAuth, requireRole([UserRole.ADMIN]), createRule);
router.get("/steps/:stepId/rules", requireAuth, listRulesForStep);
router.put("/rules/:id", requireAuth, requireRole([UserRole.ADMIN]), updateRule);
router.delete("/rules/:id", requireAuth, requireRole([UserRole.ADMIN]), deleteRule);

// Executions
router.post("/workflows/:workflowId/execute", requireAuth, startExecution);
router.get("/executions", requireAuth, listExecutions);
router.get("/executions/:id", requireAuth, getExecution);
router.get("/executions/:id/logs", requireAuth, listExecutionLogs);
router.post("/executions/:id/cancel", requireAuth, cancelExecution);
router.post("/executions/:id/retry", requireAuth, retryExecution);
router.post("/executions/:id/approve", requireAuth, approveExecutionStep);

// AI
router.post("/ai/generate-rule", requireAuth, generateRuleFromDescription);
router.post("/ai/explain-logs", requireAuth, explainExecutionLogs);
router.post("/ai/suggest-workflow", requireAuth, suggestWorkflowFromDescription);

// Dashboard helpers
router.get("/dashboard/pending-approvals", requireAuth, getPendingApprovals);
router.get("/dashboard/notifications", requireAuth, getNotifications);

// Manager panel
router.get("/manager/pending-approvals", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerPendingApprovals);
router.get("/manager/team-requests", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerTeamRequests);
router.get("/manager/approval-history", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerApprovalHistory);
router.get("/manager/stats", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerStats);
router.get("/manager/review/:executionId", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerReviewData);

// HR panel
router.get("/hr/onboarding-queue", requireAuth, requireRole([UserRole.HR, UserRole.ADMIN]), getHrOnboardingQueue);
router.get("/hr/review/:executionId", requireAuth, requireRole([UserRole.HR, UserRole.ADMIN]), getHrReviewData);
router.get("/hr/stats", requireAuth, requireRole([UserRole.HR, UserRole.ADMIN]), getHrStats);
router.get("/hr/history", requireAuth, requireRole([UserRole.HR, UserRole.ADMIN]), getHrHistory);

// Employee requests
router.post("/requests/expense", requireAuth, createExpenseRequest);
router.post("/requests/onboarding", requireAuth, createOnboardingRequest);
router.get("/requests", requireAuth, listMyRequests);
router.get("/requests/stats", requireAuth, getRequestStats);
router.get("/requests/:id", requireAuth, getRequestById);

export default router;

