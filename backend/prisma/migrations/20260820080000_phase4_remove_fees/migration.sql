-- DropForeignKey
ALTER TABLE "Fee" DROP CONSTRAINT "Fee_studentId_fkey";

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "fees";

-- AlterTable
ALTER TABLE "Setting" DROP COLUMN "feeDeadline";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "feeStatus",
DROP COLUMN "feespm";

-- DropTable
DROP TABLE "Fee";