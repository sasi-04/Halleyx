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
import { getNotifications, getPendingApprovals, getNotificationsByUserId } from "../controllers/dashboardController";
import {
  createExpenseRequest,
  createOnboardingRequest,
  createRequest,
  listMyRequests,
  getRequestById,
  getRequestStats,
  listAllRequests,
  listManagerPendingRequests,
} from "../controllers/requestController";
import { deleteMyRequest } from "../controllers/employeeController";
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
import { getCeoPendingApprovals, getHrPendingApprovals } from "../controllers/approvalQueueController";
import { approveOrRejectRequest } from "../controllers/requestApprovalController";
import employeeRouter from "./employeeRoutes";

const router = Router();

// STEP 3: FORCE EMAIL SYSTEM TEST (ISOLATED)
router.get("/force-email-test", async (req, res) => {
  console.log("ROUTE HIT");

  const nodemailer = require("nodemailer");
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.error("EMAIL FAILED FULL ERROR:", {
      message: "Missing credentials",
      hasUser: Boolean(user),
      hasPass: Boolean(pass),
    });
    return res.send("EMAIL FAILED - CHECK TERMINAL");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: user,
      to: "sasidharan071204@gmail.com",
      subject: "FORCE TEST EMAIL",
      text: "This email MUST arrive. If not, config is wrong.",
    });

    console.log("EMAIL SUCCESS:", info.response);

    res.send("EMAIL SENT SUCCESSFULLY");
  } catch (err) {
    console.error("EMAIL FAILED FULL ERROR:", err);

    res.send("EMAIL FAILED - CHECK TERMINAL");
  }
});

// STEP 3: TEST EMAIL DIRECTLY (CRITICAL)
router.get("/test-email", async (req, res) => {
  const sendEmail = require("../utils/sendEmail");

  await sendEmail(
    "sasidharan071204@gmail.com",
    "TEST EMAIL",
    "If you see this, email works",
  );

  res.send("TEST DONE");
});

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
router.get("/notifications/:userId", requireAuth, getNotificationsByUserId);

// Manager panel
router.get("/manager/pending-approvals", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerPendingApprovals);
router.get("/manager/team-requests", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerTeamRequests);
router.get("/manager/approval-history", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerApprovalHistory);
router.get("/manager/stats", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerStats);
router.get("/manager/review/:executionId", requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN]), getManagerReviewData);

// Generic approval queue API for manager – returns only manager-level pending items
router.get(
  "/request/pending",
  requireAuth,
  requireRole([UserRole.MANAGER, UserRole.ADMIN]),
  listManagerPendingRequests,
);

// Simple/legacy create-request API used by new UIs
router.post("/request/create", requireAuth, createRequest);

// Approve/reject using requestId (UI convenience)
router.post("/request/approve", requireAuth, approveOrRejectRequest);

// Backwards-compatible single-request endpoint (some UIs call `/request/:id`)
router.get("/request/:id", requireAuth, getRequestById);

// CEO final approval queue
router.get(
  "/ceo/pending",
  requireAuth,
  requireRole([UserRole.CEO, UserRole.ADMIN]),
  getCeoPendingApprovals,
);

// HR approval queue
router.get(
  "/hr/pending",
  requireAuth,
  requireRole([UserRole.HR, UserRole.ADMIN]),
  getHrPendingApprovals,
);

// HR panel
router.get("/hr/onboarding-queue", requireAuth, requireRole([UserRole.HR, UserRole.ADMIN]), getHrOnboardingQueue);
router.get("/hr/review/:executionId", requireAuth, requireRole([UserRole.HR, UserRole.ADMIN]), getHrReviewData);
router.get("/hr/stats", requireAuth, requireRole([UserRole.HR, UserRole.ADMIN]), getHrStats);
router.get("/hr/history", requireAuth, requireRole([UserRole.HR, UserRole.ADMIN]), getHrHistory);

// Employee requests
router.post("/requests/expense", requireAuth, createExpenseRequest);
router.post("/requests/onboarding", requireAuth, createOnboardingRequest);
router.get("/requests", requireAuth, listMyRequests);
router.get("/requests/all", requireAuth, requireRole([UserRole.HR, UserRole.CEO, UserRole.ADMIN]), listAllRequests);
router.get("/requests/stats", requireAuth, getRequestStats);
router.get("/requests/:id", requireAuth, getRequestById);
router.delete("/requests/:id", requireAuth, deleteMyRequest);

// Employee API (forms + notifications + audit logs)
router.use("/employee", employeeRouter);

export default router;

