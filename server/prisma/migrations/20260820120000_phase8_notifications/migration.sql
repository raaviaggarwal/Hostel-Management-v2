-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'info',
ADD COLUMN "userId" INTEGER;