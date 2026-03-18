# 🚀 Halleyx Workflow Automation System

> A production-ready, enterprise-grade workflow automation platform built for the **Halleyx Full Stack Engineer Challenge**, designed to handle complex business processes with intelligence, scalability, and real-time execution tracking.

---

## 📌 Overview

Halleyx Workflow Automation System is a full-stack platform that enables organizations to design, execute, and monitor complex workflows such as **expense approvals** and **employee onboarding**.

The system combines:

* Structured workflow design
* Rule-based automation
* Real-time execution monitoring
* AI-assisted workflow generation

This project demonstrates how modern enterprises can move from manual processes to **intelligent, automated systems**.

---

## 🎥 Demo

A complete system walkthrough, including workflow execution, approvals, AI assistant, and real-time monitoring, is available here:

👉 https://drive.google.com/drive/folders/1OuiMwUD7xAHdrWp6kxT4rxUWgylbQe0u?usp=sharing

---

## 🧠 Key Capabilities

### 🔄 Workflow Automation Engine

* Multi-step workflow execution
* Conditional branching using rules
* Loop handling with safety limits
* Dynamic routing between steps

---

### ⚙️ Rule Engine

* Supports logical operators: `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`
* String operations: `contains`, `startsWith`, `endsWith`
* Priority-based rule evaluation
* Default fallback handling

---

### ⚡ Execution Engine

* Step-by-step workflow processing
* Tracks current step, logs, and decisions
* Supports retries, cancellations, and approvals
* Prevents infinite loops (max 100 iterations)

---

### 🔔 Real-Time System

* WebSocket-based updates using Socket.IO
* Live execution monitoring
* Instant workflow state changes

---

### 📧 Notification System

* Role-based notifications
* Email alerts via Nodemailer
* Triggered on approvals, transitions, and events

---

### 🤖 AI Assistant

* Generate workflow structures
* Suggest rule conditions
* Explain execution logs
* Assist debugging

---

### 🛡️ Role-Based Access Control

| Role     | Responsibility              |
| -------- | --------------------------- |
| Employee | Initiates workflows         |
| Manager  | Approves requests           |
| Finance  | Reviews financial workflows |
| HR       | Handles onboarding          |
| CEO      | High-level approvals        |
| Admin    | Full system control         |

---

## 🏗️ Architecture Overview

```
Frontend (Next.js + React)
        ↓
Backend (Node.js + Express)
        ↓
Workflow & Rule Engine
        ↓
Database (PostgreSQL + Prisma)
        ↓
Realtime Layer (Socket.IO)
        ↓
AI + Notification Services
```

---

## 🧑‍💻 Tech Stack

### Frontend

* Next.js (React + TypeScript)
* Tailwind CSS
* Shadcn-style UI
* React Hook Form
* React Query
* Zustand
* React Flow (workflow visualization)

### Backend

* Node.js
* Express.js
* TypeScript

### Database

* PostgreSQL
* Prisma ORM

### Integrations

* JWT Authentication
* bcrypt password hashing
* Nodemailer (email notifications)
* Socket.IO (real-time updates)
* OpenAI API (AI assistant)

---

## 📁 Project Structure

```
halleyx/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── store/
│   └── services/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── prisma/
│   └── middleware/
│
└── README.md
```

---

## 🗄️ Database Schema (Simplified)

* **User** → authentication and roles
* **Workflow** → workflow definitions
* **Step** → individual workflow steps
* **Rule** → conditions for transitions
* **Execution** → workflow run instance
* **ExecutionLog** → detailed step logs

---

## 🔌 API Overview

Base URL: `/api`

### Auth

* `POST /auth/login`
* `POST /auth/register`

### Workflows

* Create, update, delete workflows (Admin)
* Fetch workflows with pagination and search

### Steps & Rules

* Define workflow steps
* Attach rules for decision-making

### Executions

* Start workflow execution
* Track execution status and logs
* Approve, retry, or cancel workflows

### Dashboard

* Pending approvals
* Notifications feed

### AI

* Generate rules
* Suggest workflows
* Explain execution logs

---

## ⚙️ Setup Instructions

### Backend

```
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

---

### Frontend

```
cd frontend
npm install
npm run dev
```

---

### Environment Variables

#### Backend (.env)

```
DATABASE_URL=
PORT=4000
JWT_SECRET=
JWT_EXPIRES_IN=7d

EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

---

#### Frontend (.env.local)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

---

## 👥 Demo Users

| Role     | Email                                                   | Password    |
| -------- | ------------------------------------------------------- | ----------- |
| Admin    | [admin@halleyx.local](mailto:admin@halleyx.local)       | admin123    |
| Employee | [employee@halleyx.local](mailto:employee@halleyx.local) | employee123 |
| Manager  | [manager@halleyx.local](mailto:manager@halleyx.local)   | manager123  |
| Finance  | [finance@halleyx.local](mailto:finance@halleyx.local)   | finance123  |
| HR       | [hr@halleyx.local](mailto:hr@halleyx.local)             | hr123456    |
| CEO      | [ceo@halleyx.local](mailto:ceo@halleyx.local)           | ceo123456   |

---

## 🔄 Sample Workflows

### Expense Approval

* Submit Request
* Manager Approval
* Finance Review
* Notification

### Employee Onboarding

* Account Creation
* IT Provisioning
* HR Orientation

---

## 📊 Execution Flow

1. Workflow is triggered with input data
2. Rules are evaluated based on priority
3. Matching rule determines next step
4. Execution logs are recorded
5. Notifications are triggered
6. Process continues until completion

---

## 📌 Key Highlights

* Fully dynamic workflow builder
* Real-time execution monitoring
* AI-assisted development
* Enterprise-level architecture
* Scalable and modular design

---

## 🔭 Future Enhancements

* Advanced analytics dashboard
* AI-driven optimization
* Third-party integrations
* Mobile support

---

## 📄 License

MIT License

---

## 📣 Final Note

This project demonstrates a complete implementation of:

* Workflow orchestration
* Rule-based automation
* Real-time system design
* AI-assisted engineering

Designed to reflect real-world enterprise systems and scalable backend architecture.
