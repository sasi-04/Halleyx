-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('task', 'approval', 'notification');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'canceled');

-- CreateEnum
CREATE TYPE "ExecutionLogStatus" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'paused');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'MANAGER', 'FINANCE', 'HR', 'CEO', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "input_schema" JSONB NOT NULL,
    "start_step_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Step" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "step_type" "StepType" NOT NULL,
    "order" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "next_step_id" TEXT,
    "priority" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "workflow_version" INTEGER NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "data" JSONB NOT NULL,
    "logs" JSONB NOT NULL,
    "current_step_id" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "triggered_by" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "step_name" TEXT NOT NULL,
    "step_type" "StepType" NOT NULL,
    "evaluated_rules" JSONB NOT NULL,
    "selected_next_step" TEXT,
    "status" "ExecutionLogStatus" NOT NULL,
    "approver_id" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "Step"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "Execution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
