-- DropForeignKey
ALTER TABLE "MaintenanceTicket" DROP CONSTRAINT "MaintenanceTicket_studentId_fkey";

-- AlterTable
ALTER TABLE "Setting" DROP COLUMN "maintenanceDay";

-- DropTable
DROP TABLE "MaintenanceTicket";