import bcrypt from "bcrypt";
import { PrismaClient, StepType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUser(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
}) {
  const hashed = await bcrypt.hash(params.password, 10);
  return prisma.user.upsert({
    where: { email: params.email.toLowerCase() },
    update: { name: params.name, password: hashed, role: params.role, department: params.department },
    create: {
      name: params.name,
      email: params.email.toLowerCase(),
      password: hashed,
      role: params.role,
      department: params.department,
    },
  });
}

async function createExpenseWorkflow() {
  const wf = await prisma.workflow.create({
    data: {
      name: "Expense Approval Workflow",
      version: 1,
      is_active: true,
      input_schema: {
        type: "object",
        required: ["amount", "country", "department", "priority"],
      },
    },
  });

  // Step 1: Employee submits expense request (task)
  const employeeRequest = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "Employee Request",
      step_type: StepType.task,
      order: 1,
      metadata: { action: "submit_expense" },
    },
  });

  // Step 2: Manager Approval
  const managerApproval = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "Manager Approval",
      step_type: StepType.approval,
      order: 2,
      metadata: { approverRole: UserRole.MANAGER },
    },
  });

  // Step 3: HR Verification
  const hrVerification = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "HR Verification",
      step_type: StepType.approval,
      order: 3,
      metadata: { approverRole: UserRole.HR },
    },
  });

  // Step 4: CEO Approval (conditional based on amount / priority via rules)
  const ceoApproval = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "CEO Approval",
      step_type: StepType.approval,
      order: 4,
      metadata: { approverRole: UserRole.CEO },
    },
  });

  // Step 5: Completion — notify employee that the expense request is completed
  const completion = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "Completion",
      step_type: StepType.notification,
      order: 5,
      metadata: { notifyRole: UserRole.EMPLOYEE, subject: "Expense request completed" },
    },
  });

  await prisma.workflow.update({
    where: { id: wf.id },
    data: { start_step_id: employeeRequest.id },
  });

  // Rules from Employee Request (Step 1)
  // - If amount < 100 → auto-skip manager step, go directly to HR Verification (auto-manager behavior)
  // - Otherwise → go to Manager Approval
  await prisma.rule.createMany({
    data: [
      {
        step_id: employeeRequest.id,
        condition: "amount < 100",
        next_step_id: hrVerification.id,
        priority: 1,
        is_default: false,
      },
      {
        step_id: employeeRequest.id,
        condition: "amount >= 100",
        next_step_id: managerApproval.id,
        priority: 2,
        is_default: false,
      },
      {
        step_id: employeeRequest.id,
        condition: "DEFAULT",
        next_step_id: completion.id,
        priority: 99,
        is_default: true,
      },
    ],
  });

  // Rules from Manager Approval (Step 2)
  // On manager approval, move to HR Verification.
  await prisma.rule.createMany({
    data: [
      {
        step_id: managerApproval.id,
        condition: "DEFAULT",
        next_step_id: hrVerification.id,
        priority: 1,
        is_default: true,
      },
    ],
  });

  // Rules from HR Verification (Step 3)
  // - If priority == "low" → skip CEO and go straight to Completion
  // - If amount > 5000 → go to CEO Approval
  // - Otherwise → go to Completion
  await prisma.rule.createMany({
    data: [
      {
        step_id: hrVerification.id,
        condition: 'priority == "low"',
        next_step_id: completion.id,
        priority: 1,
        is_default: false,
      },
      {
        step_id: hrVerification.id,
        condition: "amount > 5000",
        next_step_id: ceoApproval.id,
        priority: 2,
        is_default: false,
      },
      {
        step_id: hrVerification.id,
        condition: "DEFAULT",
        next_step_id: completion.id,
        priority: 99,
        is_default: true,
      },
    ],
  });

  // CEO Approval (Step 4) → Completion (Step 5)
  await prisma.rule.create({
    data: {
      step_id: ceoApproval.id,
      condition: "DEFAULT",
      next_step_id: completion.id,
      priority: 1,
      is_default: true,
    },
  });

  // Completion terminates
  await prisma.rule.create({
    data: {
      step_id: completion.id,
      condition: "DEFAULT",
      next_step_id: null,
      priority: 1,
      is_default: true,
    },
  });
}

async function createOnboardingWorkflow() {
  const wf = await prisma.workflow.create({
    data: {
      name: "Employee Onboarding Workflow",
      version: 1,
      is_active: true,
      input_schema: {
        type: "object",
        required: ["employeeName", "department", "startDate", "role"],
      },
    },
  });

  // Step 1: Employee submits onboarding details (task)
  const employeeRequest = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "Employee Onboarding Request",
      step_type: StepType.task,
      order: 1,
      metadata: { action: "submit_onboarding" },
    },
  });

  // Step 2: Manager Approval
  const managerApproval = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "Manager Approval",
      step_type: StepType.approval,
      order: 1,
      metadata: { approverRole: UserRole.MANAGER },
    },
  });

  // Step 3: HR Notification (automatic notify after manager approval)
  const hrNotification = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "HR Notification",
      step_type: StepType.notification,
      order: 2,
      metadata: { notifyRole: UserRole.HR, subject: "Onboarding request ready for HR verification" },
    },
  });

  // Step 4: HR Verification
  const hrVerify = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "HR Verification",
      step_type: StepType.approval,
      order: 3,
      metadata: { approverRole: UserRole.HR },
    },
  });

  // Step 5: IT Setup (task)
  const itAccount = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "IT Setup",
      step_type: StepType.task,
      order: 4,
      metadata: { action: "it_setup" },
    },
  });

  // Step 6: Completion (notify employee)
  const completion = await prisma.step.create({
    data: {
      workflow_id: wf.id,
      name: "Completion",
      step_type: StepType.notification,
      order: 5,
      metadata: { notifyRole: UserRole.EMPLOYEE, subject: "Onboarding completed" },
    },
  });

  await prisma.workflow.update({
    where: { id: wf.id },
    data: { start_step_id: employeeRequest.id },
  });

  // Rules:
  // Employee Onboarding Request → Manager Approval
  // Manager Approval → HR Notification (auto HR notify after manager)
  // HR Notification → HR Verification
  // HR Verification → IT Setup
  // IT Setup → Completion
  // Completion → terminate
  await prisma.rule.createMany({
    data: [
      { step_id: employeeRequest.id, condition: "DEFAULT", next_step_id: managerApproval.id, priority: 1, is_default: true },
      { step_id: managerApproval.id, condition: "DEFAULT", next_step_id: hrNotification.id, priority: 1, is_default: true },
      { step_id: hrNotification.id, condition: "DEFAULT", next_step_id: hrVerify.id, priority: 1, is_default: true },
      { step_id: hrVerify.id, condition: "DEFAULT", next_step_id: itAccount.id, priority: 1, is_default: true },
      { step_id: itAccount.id, condition: "DEFAULT", next_step_id: completion.id, priority: 1, is_default: true },
      { step_id: completion.id, condition: "DEFAULT", next_step_id: null, priority: 1, is_default: true },
    ],
  });
}

async function main() {
  // Users (default passwords) - Manager & Employee share "Engineering" for team filtering
  await upsertUser({ name: "Admin", email: "admin@halleyx.local", password: "admin123", role: UserRole.ADMIN });
  await upsertUser({ name: "Employee", email: "employee@halleyx.local", password: "employee123", role: UserRole.EMPLOYEE, department: "Engineering" });
  await upsertUser({ name: "Manager", email: "manager@halleyx.local", password: "manager123", role: UserRole.MANAGER, department: "Engineering" });
  await upsertUser({ name: "Finance", email: "finance@halleyx.local", password: "finance123", role: UserRole.FINANCE, department: "Finance" });
  await upsertUser({ name: "HR", email: "hr@halleyx.local", password: "hr123456", role: UserRole.HR });
  await upsertUser({ name: "CEO", email: "ceo@halleyx.local", password: "ceo123456", role: UserRole.CEO });

  // Workflows
  const existing = await prisma.workflow.findMany({ select: { name: true } });
  const names = new Set(existing.map((w) => w.name));
  if (!names.has("Expense Approval Workflow")) await createExpenseWorkflow();
  if (!names.has("Employee Onboarding Workflow")) await createOnboardingWorkflow();
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

