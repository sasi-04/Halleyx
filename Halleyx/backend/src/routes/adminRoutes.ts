import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { UserRole } from "@prisma/client";
import * as adminController from "../controllers/adminController";

const router = Router();

// ==================== DASHBOARD ====================
router.get("/dashboard", requireAuth, requireRole([UserRole.ADMIN]), adminController.getAdminDashboard);

// ==================== USER MANAGEMENT ====================
router.post("/users", requireAuth, requireRole([UserRole.ADMIN]), adminController.createUser);
router.get("/users", requireAuth, requireRole([UserRole.ADMIN]), adminController.getUsers);
router.put("/users/:id", requireAuth, requireRole([UserRole.ADMIN]), adminController.updateUser);
router.delete("/users/:id", requireAuth, requireRole([UserRole.ADMIN]), adminController.deleteUser);
router.post("/users/:id/reset-password", requireAuth, requireRole([UserRole.ADMIN]), adminController.resetUserPassword);

// ==================== WORKFLOW BUILDER ====================
router.post("/workflows", requireAuth, requireRole([UserRole.ADMIN]), adminController.createWorkflow);
router.get("/workflows", requireAuth, requireRole([UserRole.ADMIN]), adminController.getWorkflows);
router.put("/workflows/:id", requireAuth, requireRole([UserRole.ADMIN]), adminController.updateWorkflow);
router.delete("/workflows/:id", requireAuth, requireRole([UserRole.ADMIN]), adminController.deleteWorkflow);
router.post("/workflows/:workflowId/steps", requireAuth, requireRole([UserRole.ADMIN]), adminController.addWorkflowStep);

// ==================== AUTOMATION RULES ====================
router.post("/rules", requireAuth, requireRole([UserRole.ADMIN]), adminController.createAutomationRule);
router.get("/rules", requireAuth, requireRole([UserRole.ADMIN]), adminController.getAutomationRules);
router.put("/rules/:id", requireAuth, requireRole([UserRole.ADMIN]), adminController.updateAutomationRule);
router.delete("/rules/:id", requireAuth, requireRole([UserRole.ADMIN]), adminController.deleteAutomationRule);

// ==================== DEPARTMENTS ====================
router.get("/departments", requireAuth, requireRole([UserRole.ADMIN]), adminController.getDepartments);

// ==================== SYSTEM EXECUTIONS ====================
router.get("/executions", requireAuth, requireRole([UserRole.ADMIN]), adminController.getSystemExecutions);

// ==================== AUDIT LOGS ====================
router.get("/audit-logs", requireAuth, requireRole([UserRole.ADMIN]), adminController.getAuditLogs);

// ==================== ANALYTICS ====================
router.get("/analytics", requireAuth, requireRole([UserRole.ADMIN]), adminController.getAnalytics);

// ==================== FRONTEND ALIASES ====================
router.get("/automation-rules", requireAuth, requireRole([UserRole.ADMIN]), adminController.getAutomationRules);
router.post("/automation-rules", requireAuth, requireRole([UserRole.ADMIN]), adminController.createAutomationRule);
router.patch("/automation-rules/:id", requireAuth, requireRole([UserRole.ADMIN]), adminController.updateAutomationRule);
router.delete("/automation-rules/:id", requireAuth, requireRole([UserRole.ADMIN]), adminController.deleteAutomationRule);
router.get("/stats", requireAuth, requireRole([UserRole.ADMIN]), adminController.getAdminDashboard);

export default router;
