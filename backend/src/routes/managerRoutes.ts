import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { UserRole } from "@prisma/client";
import * as managerController from "../controllers/managerControllerNew";

const router = Router();

// Manager-specific routes (accessible by manager and admin)
router.get("/dashboard", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), managerController.getManagerDashboard);
router.get("/pending", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), managerController.getManagerPendingApprovals);
router.post("/approve/:id", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), managerController.approveManagerRequest);
router.post("/reject/:id", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), managerController.rejectManagerRequest);
router.post("/request-info/:id", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), managerController.requestMoreInformation);
router.get("/request/:id", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), managerController.getManagerRequestDetails);
router.get("/team-requests", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), managerController.getManagerTeamRequests);
router.get("/notifications", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), managerController.getManagerNotifications);
router.get("/audit-logs", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), managerController.getManagerAuditLogs);

export default router;
