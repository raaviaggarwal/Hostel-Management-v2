-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "actorId" INTEGER,
ADD COLUMN "actorRole" TEXT,
ADD COLUMN "ip" TEXT,
ADD COLUMN "userAgent" TEXT;