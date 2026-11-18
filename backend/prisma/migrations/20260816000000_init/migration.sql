-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "regNo" TEXT,
    "hostelId" INTEGER,
    "blockId" INTEGER,
    "studentId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hostel" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "campus" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "roomCount" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "Hostel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" SERIAL NOT NULL,
    "hostelId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "hostelId" INTEGER NOT NULL,
    "blockId" INTEGER NOT NULL,
    "floor" INTEGER NOT NULL,
    "roomNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "seater" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "fees" INTEGER NOT NULL,
    "medicalReserved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "regNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "course" TEXT NOT NULL,
    "cgpa" DOUBLE PRECISION NOT NULL,
    "contactno" TEXT NOT NULL,
    "emailid" TEXT NOT NULL,
    "roomId" INTEGER,
    "hostelId" INTEGER,
    "blockId" INTEGER,
    "roomno" TEXT,
    "seater" INTEGER,
    "feespm" INTEGER,
    "feeStatus" TEXT NOT NULL DEFAULT 'due',
    "outpassUsed" INTEGER NOT NULL DEFAULT 0,
    "stayfrom" TEXT,
    "guardianName" TEXT NOT NULL,
    "guardianRelation" TEXT NOT NULL,
    "guardianContactno" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "regNo" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "hostelPrefs" JSONB NOT NULL,
    "roomType" TEXT,
    "status" TEXT NOT NULL,
    "hostelId" INTEGER,
    "roomId" INTEGER,
    "roomNo" TEXT,
    "bedNo" INTEGER,
    "appliedDate" TEXT NOT NULL,
    "updatedDate" TEXT NOT NULL,
    "history" JSONB NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" SERIAL NOT NULL,
    "complainNumber" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "complaintType" TEXT NOT NULL,
    "complaintDetails" TEXT NOT NULL,
    "complaintDoc" JSONB,
    "complaintStatus" TEXT,
    "registrationDate" TEXT NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintAction" (
    "id" SERIAL NOT NULL,
    "complaintId" INTEGER NOT NULL,
    "complaintStatus" TEXT NOT NULL,
    "remark" TEXT NOT NULL,
    "postingDate" TEXT NOT NULL,

    CONSTRAINT "ComplaintAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "hostelId" INTEGER NOT NULL,
    "roomNo" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignedTo" TEXT,
    "expectedDate" TEXT,
    "resolvedDate" TEXT,
    "createdDate" TEXT NOT NULL,
    "rating" INTEGER,
    "remarks" TEXT,

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "hostelId" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousekeepingTask" (
    "id" SERIAL NOT NULL,
    "hostelId" INTEGER NOT NULL,
    "taskType" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inspected" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,

    CONSTRAINT "HousekeepingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fee" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" TEXT NOT NULL,
    "paidDate" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryExit" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "gate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "linkedOutpassId" INTEGER,

    CONSTRAINT "EntryExit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outpass" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "passNo" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "departure" TEXT NOT NULL,
    "expectedReturn" TEXT NOT NULL,
    "actualReturn" TEXT,
    "parentApproved" BOOLEAN NOT NULL,
    "wardenApproved" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Outpass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "expiryDate" TEXT,
    "priority" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "parentApproved" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "inTime" TEXT,
    "outTime" TEXT,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessMenu" (
    "id" SERIAL NOT NULL,
    "day" TEXT NOT NULL,
    "breakfast" TEXT NOT NULL,
    "lunch" TEXT NOT NULL,
    "snacks" TEXT NOT NULL,
    "dinner" TEXT NOT NULL,
    "milk" TEXT NOT NULL,

    CONSTRAINT "MessMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessFeedback" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "taste" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "hygiene" INTEGER NOT NULL,
    "variety" INTEGER NOT NULL,
    "temperature" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "comment" TEXT,

    CONSTRAINT "MessFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessComplaint" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "MessComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessInspection" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "hygiene" INTEGER NOT NULL,
    "remarks" TEXT NOT NULL,

    CONSTRAINT "MessInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiAccessPoint" (
    "id" SERIAL NOT NULL,
    "hostelId" INTEGER NOT NULL,
    "accessPoint" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "downtime" INTEGER NOT NULL,
    "issues" JSONB NOT NULL,

    CONSTRAINT "WifiAccessPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDispensary" (
    "id" SERIAL NOT NULL,
    "doctor" TEXT NOT NULL,
    "nurse" TEXT NOT NULL,
    "contactno" TEXT NOT NULL,
    "ambulance" TEXT NOT NULL,

    CONSTRAINT "MedicalDispensary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalIncident" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "parentNotified" BOOLEAN NOT NULL,

    CONSTRAINT "MedicalIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeMember" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "CommitteeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeMeeting" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "agenda" TEXT NOT NULL,
    "decisions" JSONB NOT NULL,
    "actionItems" JSONB NOT NULL,

    CONSTRAINT "CommitteeMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "before" TEXT NOT NULL,
    "after" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "hostelName" TEXT NOT NULL,
    "feeDeadline" TEXT NOT NULL,
    "maintenanceDay" TEXT NOT NULL,
    "messDinnerTime" TEXT NOT NULL,
    "wardenContact" TEXT NOT NULL,
    "summerInTime" TEXT NOT NULL,
    "winterInTime" TEXT NOT NULL,
    "girlsInTime" TEXT NOT NULL,
    "outpassTotal" INTEGER NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_regNo_key" ON "Student"("regNo");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAction" ADD CONSTRAINT "ComplaintAction_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryExit" ADD CONSTRAINT "EntryExit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outpass" ADD CONSTRAINT "Outpass_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessFeedback" ADD CONSTRAINT "MessFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessComplaint" ADD CONSTRAINT "MessComplaint_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalIncident" ADD CONSTRAINT "MedicalIncident_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

