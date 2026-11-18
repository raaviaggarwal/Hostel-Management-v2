-- DropForeignKey
ALTER TABLE "Outpass" DROP CONSTRAINT "Outpass_studentId_fkey";

-- AlterTable
ALTER TABLE "EntryExit" DROP COLUMN "linkedOutpassId",
ADD COLUMN     "linkedLeaveId" INTEGER;

-- AlterTable
ALTER TABLE "Leave" ADD COLUMN     "actualReturn" TEXT,
ADD COLUMN     "departure" TEXT;

-- AlterTable
ALTER TABLE "Setting" DROP COLUMN "outpassTotal",
ADD COLUMN     "leaveTotal" INTEGER NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "outpassUsed",
ADD COLUMN     "leaveUsed" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Outpass";