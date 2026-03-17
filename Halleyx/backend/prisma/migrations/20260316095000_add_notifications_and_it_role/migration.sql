-- Add missing enum values and Notification table used by the app.

-- Add StepType.completion (introduced in schema.prisma)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'StepType' AND e.enumlabel = 'completion'
  ) THEN
    ALTER TYPE "StepType" ADD VALUE 'completion';
  END IF;
END $$;

-- Add UserRole.IT (introduced in schema.prisma)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'IT'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'IT';
  END IF;
END $$;

-- Create Notification table (used by services/notificationService.ts)
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "request_id" TEXT,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_user_id_idx" ON "Notification"("user_id");
CREATE INDEX IF NOT EXISTS "Notification_is_read_idx" ON "Notification"("is_read");

