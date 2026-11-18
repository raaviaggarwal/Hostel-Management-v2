/*
  Warnings:

  - You are about to drop the column `complaintDoc` on the `Complaint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "complaintDoc",
ADD COLUMN     "preferredVisitingHours" TEXT;
