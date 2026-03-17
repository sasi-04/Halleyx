import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { UserRole } from "@prisma/client";
import * as employeeController from "../controllers/employeeController";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const router = Router();

// All employee routes require authentication
router.use(requireAuth);

// Employee-specific routes (accessible by employee, manager, hr, ceo, admin)
router.post("/expense-request", upload.single('receipt'), requireRole([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR, UserRole.CEO, UserRole.ADMIN]), employeeController.createExpenseRequest);
router.post("/onboarding-request", requireRole([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR, UserRole.CEO, UserRole.ADMIN]), employeeController.createOnboardingRequest);
router.get("/requests", requireRole([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR, UserRole.CEO, UserRole.ADMIN]), employeeController.getMyRequests);
router.delete("/requests/:id", requireRole([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR, UserRole.CEO, UserRole.ADMIN]), employeeController.deleteMyRequest);
router.get("/notifications", requireRole([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR, UserRole.CEO, UserRole.ADMIN]), employeeController.getMyNotifications);
router.get("/audit-logs", requireRole([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR, UserRole.CEO, UserRole.ADMIN]), employeeController.getMyAuditLogs);

export default router;
