-- CreateEnum
CREATE TYPE "SimpleRequestType" AS ENUM ('EXPENSE', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "SimpleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalLevel" AS ENUM ('MANAGER', 'HR', 'CEO');

-- AlterTable
ALTER TABLE "ExecutionLog" ADD COLUMN     "request_id" TEXT,
ALTER COLUMN "evaluated_rules" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "currentLevel" "ApprovalLevel",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "simple_status" "SimpleRequestStatus",
ADD COLUMN     "title" TEXT,
ADD COLUMN     "type" "SimpleRequestType";

-- AlterTable
ALTER TABLE "WorkflowStep" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "request_type" "RequestType",
    "condition" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationRule_request_type_idx" ON "AutomationRule"("request_type");

-- CreateIndex
CREATE INDEX "AutomationRule_is_enabled_idx" ON "AutomationRule"("is_enabled");

-- CreateIndex
CREATE INDEX "ExecutionLog_request_id_idx" ON "ExecutionLog"("request_id");

-- CreateIndex
CREATE INDEX "ExecutionLog_execution_id_idx" ON "ExecutionLog"("execution_id");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
