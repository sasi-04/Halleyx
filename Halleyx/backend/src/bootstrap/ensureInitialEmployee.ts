import bcrypt from "bcrypt";
import { prisma } from "../models/prisma";
import { AuthService } from "../services/authService";
import { UserRole } from "@prisma/client";
import { APPROVER_DIRECTORY, INITIAL_EMPLOYEE } from "../config/approverDirectory";

const INITIAL_PASSWORD = process.env.INITIAL_USER_PASSWORD || "Halleyx123!";

const CEO_EMAIL = "sasidharan.n.s54@gmail.com";
const CEO_PASSWORD = "Halleyx123!";

export async function ensureInitialUsersAndWorkflows() {
  const auth = new AuthService();

  // Always enforce these 4 accounts (create if missing, update if exists)
  // eslint-disable-next-line no-console
  console.log("[bootstrap] ensuring fixed workflow users");

  await upsertUserByEmailOrRole({
    name: INITIAL_EMPLOYEE.name,
    email: INITIAL_EMPLOYEE.email,
    role: UserRole.EMPLOYEE,
    password: INITIAL_PASSWORD,
    auth,
  });

  await upsertUserByEmailOrRole({
    name: APPROVER_DIRECTORY[UserRole.MANAGER].name,
    email: APPROVER_DIRECTORY[UserRole.MANAGER].email,
    role: UserRole.MANAGER,
    password: INITIAL_PASSWORD,
    auth,
  });

  await upsertUserByEmailOrRole({
    name: APPROVER_DIRECTORY[UserRole.HR].name,
    email: APPROVER_DIRECTORY[UserRole.HR].email,
    role: UserRole.HR,
    password: INITIAL_PASSWORD,
    auth,
  });

  await upsertUserByEmailOrRole({
    name: APPROVER_DIRECTORY[UserRole.CEO].name,
    email: APPROVER_DIRECTORY[UserRole.CEO].email,
    role: UserRole.CEO,
    password: INITIAL_PASSWORD,
    auth,
  });

  // Force known passwords for fixed workflow accounts so logins/approvals always work.
  // (Upserts above intentionally don't overwrite passwords to avoid accidental resets.)
  await ensureFixedUserCredential({
    role: UserRole.EMPLOYEE,
    name: INITIAL_EMPLOYEE.name,
    email: INITIAL_EMPLOYEE.email,
    password: INITIAL_PASSWORD,
  });
  await ensureFixedUserCredential({
    role: UserRole.MANAGER,
    name: APPROVER_DIRECTORY[UserRole.MANAGER].name,
    email: APPROVER_DIRECTORY[UserRole.MANAGER].email,
    password: INITIAL_PASSWORD,
  });
  await ensureFixedUserCredential({
    role: UserRole.HR,
    name: APPROVER_DIRECTORY[UserRole.HR].name,
    email: APPROVER_DIRECTORY[UserRole.HR].email,
    password: INITIAL_PASSWORD,
  });

  // Force CEO login to a known-good credential (email + bcrypt password).
  // This fixes "CEO login not working" when an existing CEO user had an old/unknown password.
  await ensureCeoLoginCredential();

  // Ensure default workflows exist
  const expenseWf = await prisma.workflow.findFirst({
    where: { name: "Expense Approval Workflow" },
  });
  await ensureLinearWorkflow({
    existingWorkflowId: expenseWf?.id ?? null,
    name: "Expense Approval Workflow",
    input_schema: {
      amount: "number",
      department: "string",
      priority: "string",
      description: "string",
    },
  });

  const onboardingWf = await prisma.workflow.findFirst({
    where: { name: "Employee Onboarding Workflow" },
  });
  await ensureLinearWorkflow({
    existingWorkflowId: onboardingWf?.id ?? null,
    name: "Employee Onboarding Workflow",
    input_schema: {
      employee_name: "string",
      department: "string",
      role: "string",
      start_date: "string",
    },
  });
}

async function upsertUserByEmailOrRole(params: {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  auth: AuthService;
}) {
  const email = params.email.trim().toLowerCase();

  // 1) Prefer matching by email (stable identity)
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    await prisma.user.update({
      where: { id: byEmail.id },
      data: { name: params.name, email, role: params.role },
    });
    // eslint-disable-next-line no-console
    console.log("[bootstrap] user ensured (by email)", { role: params.role, email });
    return;
  }

  // 2) If no email match, try by role (existing role account -> update email/name)
  const byRole = await prisma.user.findFirst({ where: { role: params.role } });
  if (byRole) {
    await prisma.user.update({
      where: { id: byRole.id },
      data: { name: params.name, email, role: params.role },
    });
    // eslint-disable-next-line no-console
    console.log("[bootstrap] user ensured (by role)", { role: params.role, email });
    return;
  }

  // 3) Otherwise create new user via auth service (ensures password hashing)
  await params.auth.register({
    name: params.name,
    email,
    password: params.password,
    role: params.role,
  });
  // eslint-disable-next-line no-console
  console.log("[bootstrap] user created", { role: params.role, email });
}

async function ensureCeoLoginCredential() {
  const email = CEO_EMAIL.trim().toLowerCase();

  // Prefer the record that already has the exact CEO email (stable identity).
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    await prisma.user.update({
      where: { id: byEmail.id },
      data: { name: "CEO User", role: UserRole.CEO, email },
    });
  } else {
    // Otherwise, repoint any existing CEO-role user to the correct email, or create new.
    const byRole = await prisma.user.findFirst({ where: { role: UserRole.CEO } });
    if (byRole) {
      await prisma.user.update({
        where: { id: byRole.id },
        data: { email, name: "CEO User", role: UserRole.CEO },
      });
    } else {
      // If missing, create it (password will be overwritten below anyway).
      const auth = new AuthService();
      await auth.register({ name: "CEO User", email, password: CEO_PASSWORD, role: UserRole.CEO });
    }
  }

  const hashed = await bcrypt.hash(CEO_PASSWORD, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hashed },
  });

  // eslint-disable-next-line no-console
  console.log("[bootstrap] CEO credential ensured", { email });
}

async function ensureFixedUserCredential(params: {
  role: UserRole;
  name: string;
  email: string;
  password: string;
}) {
  const email = params.email.trim().toLowerCase();

  const byEmail = await prisma.user.findUnique({ where: { email } });
  const user =
    byEmail ??
    (await prisma.user.findFirst({
      where: { role: params.role },
    }));

  if (!user) return;

  // If a different user already has the target email, don't try to repoint role user (would violate unique constraint).
  if (!byEmail && user.email !== email) {
    // eslint-disable-next-line no-console
    console.warn("[bootstrap] fixed credential skipped (email already taken?)", {
      role: params.role,
      desiredEmail: email,
      existingUserEmail: user.email,
    });
    return;
  }

  const hashed = await bcrypt.hash(params.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { name: params.name, role: params.role, email, password: hashed },
  });
  // eslint-disable-next-line no-console
  console.log("[bootstrap] credential ensured", { role: params.role, email });
}

async function ensureLinearWorkflow(params: {
  existingWorkflowId: string | null;
  name: string;
  input_schema: any;
}) {
  const workflow =
    params.existingWorkflowId
      ? await prisma.workflow.update({
          where: { id: params.existingWorkflowId },
          data: { is_active: true },
        })
      : await prisma.workflow.create({
          data: {
            name: params.name,
            version: 1,
            is_active: true,
            input_schema: params.input_schema,
          },
        });

  const existingSteps = await prisma.step.findMany({
    where: { workflow_id: workflow.id },
    orderBy: { order: "asc" },
  });
  const byName = new Map(existingSteps.map((s) => [s.name, s]));

  const managerStep =
    byName.get("Manager Approval") ??
    (await prisma.step.create({
      data: {
        workflow_id: workflow.id,
        name: "Manager Approval",
        step_type: "approval",
        order: 1,
        metadata: { approverRole: "MANAGER" },
      },
    }));

  const hrStep =
    byName.get("HR Verification") ??
    (await prisma.step.create({
      data: {
        workflow_id: workflow.id,
        name: "HR Verification",
        step_type: "approval",
        order: 2,
        metadata: { approverRole: "HR" },
      },
    }));

  const ceoStep =
    byName.get("CEO Approval") ??
    (await prisma.step.create({
      data: {
        workflow_id: workflow.id,
        name: "CEO Approval",
        step_type: "approval",
        order: 3,
        metadata: { approverRole: "CEO" },
      },
    }));

  const completionStep =
    byName.get("Completed") ??
    (await prisma.step.create({
      data: {
        workflow_id: workflow.id,
        name: "Completed",
        step_type: "completion",
        order: 4,
        metadata: {},
      },
    }));

  // Ensure correct metadata/order (update if legacy data differs)
  await prisma.step.update({ where: { id: managerStep.id }, data: { order: 1, metadata: { approverRole: "MANAGER" } } });
  await prisma.step.update({ where: { id: hrStep.id }, data: { order: 2, metadata: { approverRole: "HR" } } });
  await prisma.step.update({ where: { id: ceoStep.id }, data: { order: 3, metadata: { approverRole: "CEO" } } });
  await prisma.step.update({ where: { id: completionStep.id }, data: { order: 4 } });

  // Ensure default rules chain the approvals
  await ensureDefaultRule(managerStep.id, hrStep.id);
  await ensureDefaultRule(hrStep.id, ceoStep.id);
  await ensureDefaultRule(ceoStep.id, completionStep.id);

  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { start_step_id: managerStep.id, is_active: true },
  });

  // eslint-disable-next-line no-console
  console.log("[bootstrap] workflow ensured", { name: params.name, workflowId: workflow.id });
}

async function ensureDefaultRule(stepId: string, nextStepId: string | null) {
  const existing = await prisma.rule.findFirst({
    where: { step_id: stepId, OR: [{ is_default: true }, { condition: { equals: "DEFAULT" } }] },
    orderBy: { priority: "asc" },
  });
  if (existing) {
    await prisma.rule.update({
      where: { id: existing.id },
      data: { is_default: true, condition: "DEFAULT", priority: existing.priority ?? 1, next_step_id: nextStepId },
    });
    return;
  }
  await prisma.rule.create({
    data: { step_id: stepId, condition: "DEFAULT", is_default: true, priority: 1, next_step_id: nextStepId },
  });
}

