import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { UserRole } from "@prisma/client";
import * as ceoController from "../controllers/ceoControllerNew";

const router = Router();

// Dashboard
router.get("/dashboard", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.getCeoDashboard);
router.get("/pending", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.getCeoPendingApprovals);

// Request Actions
router.post("/approve/:id", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.approveCeoRequest);
router.post("/reject/:id", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.rejectCeoRequest);

// Request Details
router.get("/request/:id", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.getCeoRequestDetails);

// Automation Rules
router.get("/check-rules/:requestId", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.checkCeoAutomationRules);

// Audit Logs
router.get("/audit-logs", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.getCeoAuditLogs);

// Legacy endpoints (keeping for compatibility)
router.get("/approvals", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.getCeoPendingApprovals);
router.get("/approvals/:id", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.getCeoRequestDetails);

// Frontend aliases
router.get("/pending-approvals", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.getCeoPendingApprovals);
router.post("/requests/:id/approve", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.approveCeoRequest);
router.post("/requests/:id/reject", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.rejectCeoRequest);
router.get("/decision-history", requireAuth, requireRole([UserRole.CEO, UserRole.ADMIN]), ceoController.getCeoAuditLogs);

export default router;

