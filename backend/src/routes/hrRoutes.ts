import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { UserRole } from "@prisma/client";
import * as hrController from "../controllers/hrController";

const router = Router();

// All HR routes require authentication and HR role
router.use(requireAuth, requireRole([UserRole.HR, UserRole.ADMIN]));

// Dashboard
router.get("/dashboard", hrController.getHrDashboard);
router.get("/pending", hrController.getHrPendingReviews);

// Request Actions
router.post("/approve/:id", hrController.approveHrRequest);
router.post("/reject/:id", hrController.rejectHrRequest);
router.post("/verify/:id", hrController.verifyHrDocuments);
router.post("/request-info/:id", hrController.requestMoreInformation);
router.post("/forward-ceo/:id", hrController.forwardToCeo);

// Request Details
router.get("/request/:id", hrController.getHrRequestDetails);

// Onboarding specific
router.get("/onboarding-queue", hrController.getHrOnboardingQueue);
router.get("/review/:executionId", hrController.getHrReviewData);

// Stats and History
router.get("/stats", hrController.getHrStats);
router.get("/history", hrController.getHrHistory);

// Audit Logs
router.get("/audit-logs", hrController.getHrAuditLogs);

export default router;
