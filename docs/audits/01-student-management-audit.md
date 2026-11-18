# Student Management Audit

## Scope and status

Static review of Admin and Warden student screens, student API routes, and Prisma models. Database contents and live workflows were not verified because the configured database target was not independently confirmed.

| Area | Status |
|---|---|
| Admin student list, search, add, edit, delete | PARTIALLY WORKING (code inspection only) |
| Warden student list and add | FAIL: add form cannot satisfy the API |
| Student room assignment | FAIL: capacity/status/transaction safeguards are missing |
| Student-to-room relationship integrity | NOT ENFORCED by the schema |
| Live database/API verification | NOT TESTED |

## Findings

### High: Warden Add Student always misses the required password

The Warden form posts its `newStudent` state to `/students`, but that state has no `password` property. The API requires a password of at least six characters and returns HTTP 400 when it is absent. Admin student creation includes a password and therefore follows a different path.

Evidence: [WardenStudents.jsx](../../frontend/src/pages/warden/WardenStudents.jsx), [index.js](../../backend/src/routes/index.js#L1056).

### High: Admin-selected hostel and block are not stored on the Student

The Admin form sends `hostelId` and `blockId`. In the create transaction, those values are assigned to the new `User` account, but the `Student` insert omits them for Admin-created students. The new Student can consequently have no hostel/block even though the login User appears assigned. Warden student lists and dashboards scope by `Student.hostelId`, so these records can disappear from those views.

Evidence: [Students.jsx](../../frontend/src/pages/admin/Students.jsx), [index.js](../../backend/src/routes/index.js#L1082).

### High: Direct room assignment bypasses the allocation invariants

`PUT /students/:id/room` is used by the Warden room-assignment UI, but it does not check the destination room's capacity, status, or medical-reserved flag and does not use a transaction/row lock. The UI offers rooms without filtering full, maintenance, blocked, or cleaning rooms. It updates `Student.roomId` and room status without updating an `Allocation` record. Concurrent or repeated assignments can overfill a room or make Student and Allocation state disagree.

Evidence: [WardenStudents.jsx](../../frontend/src/pages/warden/WardenStudents.jsx), [index.js](../../backend/src/routes/index.js#L1165).

### High: Student deletion can fail or leave an orphan login

The Admin delete route deletes only the `Student` row. Related records such as allocations, complaints, attendance, and leave records have Student foreign keys and can prevent deletion. If the Student has no dependent rows and deletion succeeds, the associated `User` account is not deleted, leaving an account that can still authenticate without a Student profile.

Evidence: [Students.jsx](../../frontend/src/pages/admin/Students.jsx), [index.js](../../backend/src/routes/index.js#L1157), [schema.prisma](../../backend/prisma/schema.prisma#L92).

### Medium: Editing Student details does not synchronize the login User

The edit endpoint updates only the Student row. The name and email duplicated on the associated User are not updated, so profile data can diverge between the Student record and authentication account.

Evidence: [Students.jsx](../../frontend/src/pages/admin/Students.jsx), [index.js](../../backend/src/routes/index.js#L1143).

### Medium: Student room/hostel/block IDs are scalar fields without relations

`Student.roomId`, `hostelId`, and `blockId` are optional integer fields, not Prisma relations. PostgreSQL therefore cannot enforce that these IDs exist or that the room, block, and hostel agree. Deleting a room can leave a Student with a dangling `roomId`; Student updates can also store inconsistent IDs.

Evidence: [schema.prisma](../../backend/prisma/schema.prisma#L92).

### Medium: Admin dashboard's occupied-bed statistic is not based on assigned rooms

The Admin dashboard computes `occupiedBeds` from every `Student` with `active: true`, while hostel occupancy is computed from `Student.roomId`. Student creation sets `active: true` even when no room is assigned. The two displayed occupancy figures can therefore disagree.

Evidence: [index.js](../../backend/src/routes/index.js#L548), [index.js](../../backend/src/routes/index.js#L1082).

## Baseline verification

Frontend lint passed. Selected frontend tests passed (11 tests across five files). No backend test suite was run because relevant suites invoke the seed and write database records. No live Student CRUD or database integrity query was run.

## Implementation follow-up (approved code-only scope)

The findings above are the pre-fix audit snapshot. After approval, application changes were made without touching the database or Prisma schema:

- Student creation now requires a valid email and persists selected hostel/block assignments on both Student and User, with block/hostel consistency checks.
- Student identity edits synchronize the linked User; room/hostel/block IDs are not accepted through the generic edit endpoint.
- Student deletion now removes the profile and login transactionally and reports a conflict when dependent records prevent deletion.
- Warden student creation now collects the required email and password; room choices are filtered and the selected room is sent to the API.
- Direct room assignment now locks the destination, checks capacity/status/medical reservation and eligibility, synchronizes User assignment, and refuses to bypass an active allocation workflow.
- Student and room reads enforce role/hostel scope; Security/Mess list responses are limited to minimal fields.
- The Admin occupied-bed count is derived from assigned rooms.

Focused mocked backend tests now cover creation validation/scoping and room assignment rejection cases. The database-level relationships remain absent from the schema, and live Student CRUD/integrity verification remains unverified because the configured URL target was not confirmed.
