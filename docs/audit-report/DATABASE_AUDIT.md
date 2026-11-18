# Database Audit Report

**Date**: 2026-11-18
**Database**: PostgreSQL (Prisma Postgres production, Local PostgreSQL development)
**ORM**: Prisma 6.19.3

---

## Schema Analysis

### Current Prisma Schema (`backend/prisma/schema.prisma`)

**Models**: 32
**Enums**: 0 (all statuses as strings)
**Relations**: 40+
**Indexes**: 3 explicit unique indexes

---

## Table-by-Table Analysis

### 1. User
```prisma
model User {
  id                 Int     @id @default(autoincrement())
  name               String
  username           String  @unique
  email              String  @unique
  password           String
  role               String
  regNo              String?
  hostelId           Int?
  blockId            Int?
  studentId          Int?
  tokenVersion       Int     @default(0)
  mustChangePassword Boolean @default(false)
}
```

**Issues**:
- ❌ `studentId` field but no `@relation` or foreign key to Student
- ❌ `role` as String - no enum constraint at DB level
- ❌ `hostelId`, `blockId` - no foreign keys (referential integrity not enforced)
- ✅ `tokenVersion` for session invalidation - GOOD
- ✅ `mustChangePassword` enforcement - GOOD
- ✅ Unique constraints on username, email - GOOD

**Recommendations**:
- Add `@relation` for `studentId` → `Student.id`
- Add foreign keys for `hostelId` → `Hostel.id`, `blockId` → `Block.id`
- Consider enum for `role` (requires migration)

---

### 2. Hostel
```prisma
model Hostel {
  id        Int     @id @default(autoincrement())
  code      String  @unique
  name      String
  gender    String
  type      String
  campus    String
  address   String
  seats     Int
  roomCount Int
  note      String?
  blocks    Block[]
  rooms     Room[]
}
```

**Issues**:
- ❌ `gender`, `type`, `campus` as Strings - no enum constraints
- ❌ `seats`, `roomCount` - no CHECK constraints (can be negative)
- ✅ Unique code - GOOD
- ✅ Relations to Block, Room - GOOD

---

### 3. Block
```prisma
model Block {
  id       Int    @id @default(autoincrement())
  hostelId Int
  name     String
  hostel   Hostel @relation(fields: [hostelId], references: [id], onDelete: Cascade)
  rooms    Room[]
}
```

**Issues**:
- ✅ Cascade delete on hostel - GOOD
- ❌ No unique constraint on `(hostelId, name)` - duplicate block names possible in same hostel

---

### 4. Room
```prisma
model Room {
  id              Int          @id @default(autoincrement())
  hostelId        Int
  blockId         Int
  floor           Int
  roomNo          String
  type            String
  seater          Int
  status          String
  medicalReserved Boolean      @default(false)
  allocations     Allocation[]
  block           Block        @relation(fields: [blockId], references: [id])
  hostel          Hostel       @relation(fields: [hostelId], references: [id])
}
```

**Issues**:
- ❌ `type`, `status` as Strings - no enum constraints
- ❌ `seater` - no CHECK constraint (can be 0, negative)
- ❌ No unique constraint on `(hostelId, blockId, roomNo)` - duplicate room numbers possible
- ❌ No foreign key on `blockId` with `onDelete` (references Block but no cascade action specified)
- ✅ Relations to allocations, block, hostel - GOOD

---

### 5. Student
```prisma
model Student {
  id                Int               @id @default(autoincrement())
  regNo             String            @unique
  name              String
  gender            String
  year              Int
  course            String
  cgpa              Float
  contactno         String
  emailid           String
  roomId            Int?
  hostelId          Int?
  blockId           Int?
  roomno            String?
  seater            Int?
  stayfrom          String?
  guardianName      String
  guardianRelation  String
  guardianContactno String
  active            Boolean
  leaveUsed         Int               @default(0)
  allocations       Allocation[]
  attendance        Attendance[]
  complaints        Complaint[]
  entryExit         EntryExit[]
  leaves            Leave[]
  medicalIncidents  MedicalIncident[]
  messComplaints    MessComplaint[]
  messFeedback      MessFeedback[]
}
```

**Issues**:
- ❌ `gender`, `stayfrom` as Strings - `stayfrom` should be DateTime
- ❌ `roomId`, `hostelId`, `blockId` - no foreign keys (referential integrity not enforced)
- ❌ `roomno`, `seater` denormalized - duplicate data from Room relation
- ❌ `leaveUsed` - computed field, can drift from actual Leave records
- ✅ Unique `regNo` - GOOD
- ✅ Relations to all child entities - GOOD

---

### 6. Allocation
```prisma
model Allocation {
  id          Int     @id @default(autoincrement())
  studentId   Int
  studentName String
  regNo       String
  gender      String
  year        Int
  hostelPrefs Json
  roomType    String?
  status      String
  hostelId    Int?
  roomId      Int?
  roomNo      String?
  bedNo       Int?
  appliedDate String
  updatedDate String
  history     Json
  room        Room?   @relation(fields: [roomId], references: [id])
  student     Student @relation(fields: [studentId], references: [id])
}
```

**Issues**:
- ❌ `status` as String - no enum
- ❌ `appliedDate`, `updatedDate` as Strings - should be DateTime
- ❌ `hostelPrefs` as Json - no schema validation
- ❌ `history` as Json - no schema validation
- ❌ Denormalized fields: `studentName`, `regNo`, `gender`, `year`, `roomNo`
- ❌ No unique constraint on `(studentId, status)` for active allocations
- ✅ Relations to Room, Student - GOOD

---

### 7. Complaint & ComplaintAction
```prisma
model Complaint {
  id                     Int               @id @default(autoincrement())
  complainNumber         Int
  studentId              Int
  studentName            String
  complaintType          String
  complaintDetails       String
  complaintStatus        String?
  registrationDate       String
  preferredVisitingHours String?
  student                Student           @relation(fields: [studentId], references: [id])
  actions                ComplaintAction[]
}

model ComplaintAction {
  id              Int       @id @default(autoincrement())
  complaintId     Int
  complaintStatus String
  remark          String
  postingDate     String
  complaint       Complaint @relation(fields: [complaintId], references: [id], onDelete: Cascade)
}
```

**Issues**:
- ❌ `registrationDate`, `postingDate` as Strings
- ❌ `complaintStatus` as String - no enum
- ❌ `complainNumber` - not unique (should be)
- ✅ Cascade delete on actions - GOOD

---

### 8. Leave (includes Out-Pass)
```prisma
model Leave {
  id                   Int     @id @default(autoincrement())
  studentId            Int
  studentName          String
  from                 String
  to                   String
  reason               String
  destination          String
  parentApproved       Boolean
  status               String
  actualReturn         String?
  departure            String?
  requestType          String  @default("LEAVE")
  requestedDepartureAt String?
  expectedReturnAt     String?
  student              Student @relation(fields: [studentId], references: [id])
}
```

**Issues**:
- ❌ All date/time fields as Strings - should be DateTime
- ❌ `status` as String - no enum (`pending`, `approved`, `active`, `completed`, `rejected`)
- ❌ `requestType` as String - no enum (`LEAVE`, `OUTPASS`)
- ❌ Denormalized `studentName`
- ❌ No unique constraint preventing duplicate pending/active leaves per student
- ✅ Relation to Student - GOOD

---

### 9. Attendance
```prisma
model Attendance {
  id        Int     @id @default(autoincrement())
  studentId Int
  date      String
  status    String
  student   Student @relation(fields: [studentId], references: [id])

  @@unique([studentId, date])
}
```

**Issues**:
- ❌ `date` as String - should be Date
- ❌ `status` as String - no enum (`present`, `absent`, `leave`)
- ✅ Unique constraint on `(studentId, date)` - GOOD

---

### 10. EntryExit
```prisma
model EntryExit {
  id            Int     @id @default(autoincrement())
  studentId     Int
  date          String
  time          String
  type          String
  gate          String
  status        String
  lateMinutes   Int     @default(0)
  linkedLeaveId Int?
  student       Student @relation(fields: [studentId], references: [id])
}
```

**Issues**:
- ❌ `date`, `time` as separate Strings - should be DateTime
- ❌ `type`, `status`, `gate` as Strings - no enums
- ❌ No unique constraint on `(studentId, date, type)` - duplicate entries possible

---

## Migration History Analysis

### Migrations Found (11 total)
| Migration | Date | Description |
|-----------|------|-------------|
| 20260816000000_init | 2026-08-16 | Initial schema |
| 20260818042235_fee_due_date_optional | 2026-08-18 | Fee due date optional |
| 20260820045501_phase1_complaints | 2026-08-20 | Complaints phase 1 |
| 20260820060000_phase2_remove_maintenance | 2026-08-20 | Remove maintenance |
| 20260820070000_phase3_remove_visitors | 2026-08-20 | Remove visitors |
| 20260820080000_phase4_remove_fees | 2026-08-20 | Remove fees |
| 20260820090000_phase5_merge_leave_outpass | 2026-08-20 | Merge leave/outpass |
| 20260820100000_phase6_auth_token_version | 2026-08-20 | Auth token version |
| 20260820110000_phase7_audit_enrich | 2026-08-20 | Audit log enrichment |
| 20260820120000_phase8_notifications | 2026-08-20 | Notifications |
| 20261113000000_add_leave_request_type | 2026-11-13 | Leave request type |
| 20261118113011_add_must_change_password | 2026-11-18 | Must change password |

**Observations**:
- Multiple migrations on same day (2026-08-20) - suggests iterative development
- Some migrations remove features (maintenance, visitors, fees) - schema churn
- No destructive migrations in recent history
- Migration `20260816000000_init` includes tables later removed (MaintenanceTicket, Fee, Visitor, Outpass)

---

## Data Integrity Issues

### 1. Missing Foreign Keys (Critical for Referential Integrity)

| Parent Table | Child Table | Column | Status |
|--------------|-------------|--------|--------|
| Hostel | Block | hostelId | ✅ Defined with CASCADE |
| Hostel | Room | hostelId | ⚠️ Defined, no onDelete |
| Block | Room | blockId | ⚠️ Defined, no onDelete |
| Room | Allocation | roomId | ✅ Defined with SET NULL |
| Student | Allocation | studentId | ✅ Defined |
| Student | Attendance | studentId | ✅ Defined |
| Student | EntryExit | studentId | ✅ Defined |
| Student | Leave | studentId | ✅ Defined |
| Student | Complaint | studentId | ✅ Defined |
| User | Student | studentId | ❌ MISSING (field exists but no relation) |
| User | Hostel | hostelId | ❌ MISSING |
| User | Block | blockId | ❌ MISSING |

### 2. Missing Unique Constraints

| Table | Columns | Risk |
|-------|---------|------|
| Allocation | (studentId, status) WHERE status IN ('approved','allocated','occupied','waitlisted') | Duplicate active allocations |
| Leave | (studentId, status) WHERE status IN ('pending','approved','active') | Duplicate pending leaves |
| EntryExit | (studentId, date, type) | Duplicate entry/exit records |
| Complaint | complainNumber | Duplicate complaint numbers |
| User | studentId | Multiple users per student |
| Room | (hostelId, blockId, roomNo) | Duplicate room numbers |

### 3. Missing CHECK Constraints

| Table | Column | Constraint Needed |
|-------|--------|-------------------|
| Hostel | seats | `seats > 0` |
| Hostel | roomCount | `roomCount > 0` |
| Room | seater | `seater > 0` |
| Room | floor | `floor >= 0` |
| Student | year | `year > 0 AND year <= 10` |
| Student | cgpa | `cgpa >= 0 AND cgpa <= 10` |
| Allocation | bedNo | `bedNo > 0 AND bedNo <= seater` |
| Attendance | status | `status IN ('present','absent','leave')` |
| Leave | status | `status IN ('pending','approved','active','completed','rejected')` |
| Leave | requestType | `requestType IN ('LEAVE','OUTPASS')` |
| Room | status | `status IN ('available','partially_occupied','full','maintenance','medical_reserved','cleaning','blocked')` |

---

## Concurrency Analysis

### Current Implementation (GOOD)
The application uses **Serializable transactions** with `SELECT FOR UPDATE` for:
1. Room allocation (`doAllocate` function)
2. Room transfer (`/allocations/:id/transfer`)
3. Room cancellation (`/allocations/:id/cancel`)
4. Leave creation (duplicate prevention)
5. Attendance upsert (unique constraint)

### Race Conditions Tested (concurrency.test.js)
- ✅ Simultaneous last-bed allocation (only one succeeds)
- ✅ Simultaneous room transfer to full room (rejected)
- ✅ Room cancellation consistency (source room status updated)
- ✅ Concurrent attendance submissions (unique constraint enforced)
- ✅ Leave quota at limit (only one request succeeds)
- ✅ Duplicate pending leave prevention

### Remaining Concurrency Risks
1. **Student direct room assignment** (`PUT /students/:id/room`) - uses Serializable but separate from allocation workflow
2. **Warden dashboard stats** - read-only, eventual consistency acceptable
3. **Notification creation** - non-critical, duplicates tolerable

---

## Index Analysis

### Current Indexes
```sql
-- From migration 20260816000000_init
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Student_regNo_key" ON "Student"("regNo");
CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON "Attendance"("studentId", "date");
```

### Recommended Additional Indexes
```sql
-- For frequent queries
CREATE INDEX "Student_hostelId_idx" ON "Student"("hostelId");
CREATE INDEX "Student_roomId_idx" ON "Student"("roomId");
CREATE INDEX "Allocation_studentId_status_idx" ON "Allocation"("studentId", "status");
CREATE INDEX "Allocation_hostelId_status_idx" ON "Allocation"("hostelId", "status");
CREATE INDEX "Leave_studentId_status_idx" ON "Leave"("studentId", "status");
CREATE INDEX "Leave_status_idx" ON "Leave"("status");
CREATE INDEX "Complaint_studentId_idx" ON "Complaint"("studentId");
CREATE INDEX "Complaint_complaintStatus_idx" ON "Complaint"("complaintStatus");
CREATE INDEX "EntryExit_studentId_date_idx" ON "EntryExit"("studentId", "date");
CREATE INDEX "EntryExit_linkedLeaveId_idx" ON "EntryExit"("linkedLeaveId");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "AuditLog_actor_entity_timestamp_idx" ON "AuditLog"("actor", "entity", "timestamp");
```

---

## Performance Observations

### N+1 Query Patterns Found
1. **Admin Dashboard** (`/api/admin/dashboard`): Fetches all hostels, rooms, students, then computes occupancy in JS
2. **Warden Dashboard** (`/api/warden/dashboard`): Similar pattern
3. **Student List** (`/api/students`): Fetches active allocation per student in loop (line 1069)
4. **Hostel List** (`/api/hostels`): Computes occupancy per hostel in JS

### Query Optimization Opportunities
1. Use Prisma `include`/`select` with aggregation
2. Add database views for common aggregations
3. Consider materialized views for dashboard stats
4. Use `count` with `where` instead of fetching all records

---

## Seed Data Analysis (`backend/prisma/seed.js`)

### Data Volume (Development)
- **Hostels**: 7
- **Rooms**: ~1,200+
- **Students**: ~60
- **Users**: ~70 (including staff)
- **Allocations**: ~50
- **Complaints**: 6
- **Leaves**: 4
- **Attendance**: 20 records
- **EntryExit**: 4 records

### Production Readiness
- Seed script has **safety guards** - refuses to run on non-test databases
- `ALLOW_DESTRUCTIVE_SEED=true` required for local database
- Deterministic data generation - good for testing
- Sequence reset after seeding - GOOD

---

## Backup & Recovery

### Current State
- **Prisma Postgres**: Automated backups (managed service)
- **Local Development**: Docker volume (`./database/data`)
- **No documented recovery procedure**
- **No point-in-time recovery tested**

### Recommendations
1. Document recovery procedures
2. Test restore from Prisma Postgres backup
3. Consider logical backups (pg_dump) for portability
4. Implement backup verification in CI

---

## Schema Migration Recommendations

### Phase 1: Data Integrity (High Priority)
1. Add missing foreign keys
2. Add missing unique constraints
3. Add CHECK constraints
4. Convert String dates to DateTime/Date

### Phase 2: Enum Migration (Medium Priority)
1. Create enums for: `UserRole`, `HostelGender`, `HostelType`, `RoomType`, `RoomStatus`, `AllocationStatus`, `LeaveStatus`, `LeaveRequestType`, `ComplaintStatus`, `AttendanceStatus`, `EntryExitType`, `EntryExitStatus`
2. Migrate existing string columns to enums

### Phase 3: Performance (Low Priority)
1. Add recommended indexes
2. Create database views for dashboards
3. Consider partitioning for large tables (EntryExit, AuditLog)

### Phase 4: Cleanup (Low Priority)
1. Remove denormalized fields (studentName, regNo, roomNo from Allocation)
2. Remove duplicate roomno/seater from Student
3. Make leaveUsed a computed view

---

## Data Validation Rules (Application vs Database)

| Rule | Enforced In | Status |
|------|-------------|--------|
| Unique username/email | Database | ✅ |
| Unique student regNo | Database | ✅ |
| Unique attendance per student/date | Database | ✅ |
| Unique allocation per student (active) | Application | ⚠️ Should be DB |
| Unique pending leave per student | Application | ⚠️ Should be DB |
| Room capacity | Application (Serializable) | ✅ |
| Leave quota | Application (Serializable) | ✅ |
| Warden hostel scoping | Application | ✅ |
| Student self-access | Application | ✅ |
| Foreign key integrity | Partial (some missing) | ❌ |

---

## Conclusion

The database schema is **functional but has significant gaps in referential integrity and constraints**. The application layer compensates for most missing database constraints, but this creates risk of data corruption if:
- Direct database access occurs
- Bugs in application logic
- Concurrent operations bypass application checks
- Future services access the database directly

**Priority Actions**:
1. Add missing foreign keys (User→Hostel, User→Block, User→Student)
2. Add unique constraints for active allocations and pending leaves
3. Convert String date fields to native DateTime/Date
4. Add CHECK constraints for data validity
5. Create enums for all status/type fields

The migration strategy should be careful and tested, as the database contains production data.