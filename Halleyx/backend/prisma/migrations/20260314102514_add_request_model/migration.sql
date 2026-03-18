-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('expense', 'onboarding');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'completed');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "request_type" "RequestType" NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "execution_id" TEXT,
    "requested_by" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "current_step_id" TEXT,
    "request_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Request_execution_id_key" ON "Request"("execution_id");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
