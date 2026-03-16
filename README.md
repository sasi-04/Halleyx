## Halleyx Workflow Automation System

This project is a production-ready **Workflow Automation Platform** built for the Halleyx Full Stack Engineer Challenge, implemented with:

- **Frontend**: Next.js (React + TypeScript), TailwindCSS, Shadcn-style UI, React Hook Form, React Query, Zustand, React Flow
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + bcrypt password hashing + role-based access control (RBAC)
- **Email**: Nodemailer notifications (role-targeted)
- **AI**: OpenAI-powered assistant (workflow generation, rule suggestions, execution explanations)
- **Realtime**: WebSockets (Socket.IO) for execution monitor updates

### Architecture Overview

- **Frontend** (`frontend/`):
  - Next.js 14 (App Router) with TypeScript
  - TailwindCSS, Shadcn-style components, React Hook Form, React Query, Zustand
  - React Flow for workflow graph visualization
  - Socket.IO client for real-time execution updates
  - AI assistant panel for workflow and rule generation, and log debugging
  - Pages: Login, Dashboard, Workflows, Workflow Editor, Execution Monitor, Audit Logs

- **Backend** (`backend/`):
  - Node.js + Express + TypeScript
  - PostgreSQL with Prisma ORM
  - JWT Auth + RBAC roles: `EMPLOYEE`, `MANAGER`, `FINANCE`, `HR`, `CEO`, `ADMIN`
  - Rule engine with logical and string operators
  - Execution engine with branching, loop safety, approvals, notifications
  - Nodemailer-based role notifications
  - Socket.IO server for real-time execution events
  - AI endpoints using OpenAI (or compatible LLM) for workflow/rule/log assistance

### Database Schema (Prisma)

Key models (simplified):

- `User(id, name, email, password, role, created_at)`
- `Workflow(id, name, version, is_active, input_schema, start_step_id, created_at, updated_at)`
- `Step(id, workflow_id, name, step_type, order, metadata, created_at, updated_at)`
- `Rule(id, step_id, condition, next_step_id, priority, is_default, created_at, updated_at)`
- `Execution(id, workflow_id, workflow_version, status, data, logs, current_step_id, retries, triggered_by, started_at, ended_at)`
- `ExecutionLog(id, execution_id, step_name, step_type, evaluated_rules, selected_next_step, status, approver_id, error_message, started_at, ended_at)`

### API Documentation (Backend)

All endpoints are rooted at `/api`.

**Auth**

- `POST /api/auth/register` (admin/demo use)
- `POST /api/auth/login` → `{ token, user }`

**Workflows**

- `POST /api/workflows` – Create workflow (**ADMIN only**)
- `GET /api/workflows?page=&pageSize=&search=` – List workflows with pagination and search
- `GET /api/workflows/:id` – Get workflow with steps and rules
- `PUT /api/workflows/:id` – Update workflow (**ADMIN only**)
- `DELETE /api/workflows/:id` – Delete workflow (**ADMIN only**)

**Steps**

- `POST /api/workflows/:workflowId/steps` – Create step (**ADMIN only**)
- `GET /api/workflows/:workflowId/steps` – List steps for workflow
- `PUT /api/steps/:id` – Update step (**ADMIN only**)
- `DELETE /api/steps/:id` – Delete step (**ADMIN only**)

**Rules**

- `POST /api/steps/:stepId/rules` – Create rule (**ADMIN only**)
- `GET /api/steps/:stepId/rules` – List rules for step
- `PUT /api/rules/:id` – Update rule (**ADMIN only**)
- `DELETE /api/rules/:id` – Delete rule (**ADMIN only**)

**Executions**

- `POST /api/workflows/:workflowId/execute` – Start execution with `{ data }` (triggered_by comes from JWT)
- `GET /api/executions?page=&pageSize=&workflowId=&status=` – List executions
- `GET /api/executions/:id` – Get execution with logs
- `GET /api/executions/:id/logs` – Get execution logs only
- `POST /api/executions/:id/cancel` – Cancel execution
- `POST /api/executions/:id/retry` – Retry failed execution
- `POST /api/executions/:id/approve` – Approve/reject current approval step: `{ decision: "approve" | "reject", comment? }`

**Dashboard**

- `GET /api/dashboard/pending-approvals` – Role-based approvals inbox
- `GET /api/dashboard/notifications` – Role-targeted notifications feed (based on notification steps)

**AI Assistant**

- `POST /api/ai/generate-rule` – `{ description, fields? }` → `{ candidate_condition }`
- `POST /api/ai/explain-logs` – `{ executionId }` → `{ explanation }`
- `POST /api/ai/suggest-workflow` – `{ description }` → workflow JSON structure

### Environment Variables

Backend (`backend/.env`):

- `DATABASE_URL` – PostgreSQL connection string
- `PORT` – API port (default `4000`)
- `JWT_SECRET` – JWT signing secret
- `JWT_EXPIRES_IN` – token expiry (default `7d`)
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` – Nodemailer SMTP config (optional; otherwise logs to console)
- `OPENAI_API_KEY` – (optional) OpenAI or compatible API key
- `OPENAI_MODEL` – (optional) model name, default `gpt-4.1-mini`

Frontend (`frontend/.env.local`):

- `NEXT_PUBLIC_API_BASE_URL` – Base URL for backend API (e.g. `http://localhost:4000/api`)

### Setup Instructions

1. **Backend**

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

2. **Frontend**

```bash
cd frontend
npm install
npm run dev
```

Visit the app at `http://localhost:3000/login`.

### Demo Users (Seeded)

All use local domain emails and known passwords:

- Admin: `admin@halleyx.local` / `admin123`
- Employee: `employee@halleyx.local` / `employee123`
- Manager: `manager@halleyx.local` / `manager123`
- Finance: `finance@halleyx.local` / `finance123`
- HR: `hr@halleyx.local` / `hr123456`
- CEO: `ceo@halleyx.local` / `ceo123456`

### Sample Workflows

1. **Expense Approval Workflow**

- Steps:
  - `Submit Request` (`task`)
  - `Manager Approval` (`approval`)
  - `Finance Review` (`approval`)
  - `Notify Requester` (`notification`)
- Rules (examples):
  - From `Submit Request`:
    - `priority == "high" && amount > 1000` → `Manager Approval` (priority 1)
    - `DEFAULT` → `Finance Review` (default)
  - From `Manager Approval`:
    - `approvals[managerStepId].decision == "approve"` → `Finance Review`
    - `DEFAULT` → terminate (rejected)

2. **Employee Onboarding Workflow**

- Steps:
  - `Create Account` (`task`)
  - `Manager Welcome` (`notification`)
  - `IT Provisioning` (`task`)
  - `HR Orientation` (`notification`)
- Rules:
  - From `Create Account`:
    - `contains(department, "Engineering")` → `IT Provisioning`
    - `DEFAULT` → `HR Orientation`

### Demo Data & Logs

- Two workflows are **seeded automatically** via `npm run prisma:seed`.
- Start executions from the **Dashboard** using the built-in request forms.
- Example expense input:

```json
{ "amount": 1500, "priority": "high", "department": "Finance" }
```

Monitor executions in real time under the Execution Monitor view; logs include per-step rule evaluations and transition decisions.

### Execution & Rule Engine Notes

- Rule expressions support `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`, and string functions `contains`, `startsWith`, `endsWith`.
- Rules are evaluated **in ascending priority order**; the first matching rule defines the next step.
- If no rule matches, a `DEFAULT` rule (by `is_default` flag or `condition === "DEFAULT"`) is used; if none exists, the workflow terminates.
- Loops are supported through routing rules; the engine enforces a safety maximum of 100 iterations per execution to avoid infinite loops.

### Demo Video Instructions

1. Login as Employee, create an Expense request.
2. Login as Manager, approve it in Dashboard “Pending Approvals”.
3. Watch notifications appear for Finance (and email logs if SMTP not configured).
4. Observe real-time updates in Execution Monitor timeline.
5. Show Workflow Editor graph (React Flow) and AI assistant panel.
6. Show Audit Logs page.

