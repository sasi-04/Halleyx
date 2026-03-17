-- Add employee_id column to User if not present
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "employee_id" TEXT;

-- Backfill employee_id with id for existing rows (simple default)
UPDATE "User" SET "employee_id" = "id" WHERE "employee_id" IS NULL;

-- Add unique index for employee_id to match Prisma model
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'User' AND indexname = 'User_employee_id_key'
  ) THEN
    CREATE UNIQUE INDEX "User_employee_id_key" ON "User"("employee_id");
  END IF;
END $$;

-- Create WorkflowStep table for per-request workflow levels
CREATE TABLE IF NOT EXISTS "WorkflowStep" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "role" "UserRole" NOT NULL,
  "approver_id" TEXT,
  "status" "RequestStatus" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkflowStep"
  ADD CONSTRAINT "WorkflowStep_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WorkflowStep_request_id_idx" ON "WorkflowStep"("request_id");
CREATE INDEX IF NOT EXISTS "WorkflowStep_role_idx" ON "WorkflowStep"("role");

