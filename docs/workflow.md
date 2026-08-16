# Project Workflow

How the Hostel Management System behaves for each actor, and how the core
workflows connect. Read this before changing behaviour so you keep the flows
consistent.

## Core domain model

```
Hostel (7)
 └── Wing / Block (9 blocks)
     └── Room (1,029)  →  type: single | double | triple
         ├── seater (1 / 2 / 3)
         ├── status (available | partially_occupied | full | maintenance |
         │           medical_reserved | cleaning | blocked | reserved)
         └── occupants [student ids]   (beds used)

Student (44)
 ├── gender (male / female)
 ├── year (1 = fresher, >1 = senior)
 ├── hostelId / blockId / roomno / seater / feespm   (set when housed)
 └── active (housed and checked in)

Allocation (one per student application)
 ├── status: applied → under_review → approved | waitlisted → allocated → occupied
 │            └──────────────────────┐
 │                                  └→ rejected | cancelled (terminal)
 ├── hostelPrefs [hostel ids]   (student's preference order)
 ├── roomType (optional single/double/triple)
 ├── hostelId / roomId / roomNo / bedNo   (set when allocated)
 └── history [{ status, date, by, note }]
```

Hostels are gender + year scoped:

| Hostel | Gender | Scope |
| --- | --- | --- |
| Azad Bhawan (`AZ`) | Boys | Freshers |
| Shastri Bhawan (`SH`) | Boys | Seniors |
| Parmar Bhawan (`PM`) | Boys | Seniors |
| Geeta Bhawan Junior (`GJ`) | Girls | Freshers |
| Geeta Bhawan Senior (`GS`) | Girls | Seniors |
| Azad Bhawan Extension (`AZX`) | Boys | Seniors, off-campus |
| Shastri Bhawan Extension (`SHX`) | Boys | Seniors, off-campus |

## Hostel allocation workflow (core)

1. **Student applies** (`POST /allocations`)
   - Student is allowed one active application at a time
     (applied / under_review / approved / waitlisted / allocated / occupied).
   - Choose 1–3 hostel preferences from hostels matching their `gender` and
     `year`; optionally pick a room type.
   - New record starts `applied` with a history entry.

2. **Warden / admin reviews** (`POST /allocations/:id/decision`)
   - `applied` → `under_review` (move to review), `approved`, `waitlist`
     (stored as `waitlisted`), or `rejected`.
   - `under_review` → same set of decisions.

3. **Room allocation** (`POST /allocations/:id/allocate`)
   - Allowed for `approved` and `waitlisted` records.
   - **Manual**: pick a specific room (must not be `medical_reserved` and must
     have a free bed).
   - **Auto**: iterate the student's `hostelPrefs` then their eligible hostels,
     find the first room with a free bed matching `roomType` if requested.
   - On success: sets `roomId/hostelId/roomNo/bedNo`, status `allocated`,
     pushes the student id into `room.occupants`, updates room status
     (`full` / `partially_occupied`), and sets the student's room fields.

4. **Check-in** (`POST /allocations/:id/checkin`)
   - `allocated` → `occupied`; marks the student `active`.

5. **Transfer** (`POST /allocations/:id/transfer`)
   - `occupied` only. Moves the student to another room (both rooms' occupant
     lists and statuses updated).

6. **Cancel** (`POST /allocations/:id/cancel`)
   - Any non-terminal status. Releases the room if one was assigned and clears
     the student's room fields / `active` flag.

Rejected / cancelled are terminal. A cancelled or rejected student may submit a
new application.

## Role workflows

### Admin

- **Dashboard**: total/campus/off-campus hostels, capacity, occupied/available
  beds, overall occupancy, pending + waitlisted allocations; occupancy table
  and bar chart split by gender.
- **Hostel Mgmt**: add/edit/delete hostels; view a hostel's wings and rooms
  (`HostelDetail`).
- **Room Mgmt**: browse/search/filter all 1,017 rooms, add rooms, change room
  status (`available`, `maintenance`, `medical_reserved`, `cleaning`, `blocked`),
  view room detail (occupants + inventory).
- **Allocation**: review every application (optionally filtered by hostel),
  apply the same decisions as a warden, allocate rooms, check in, transfer,
  cancel. Also **Waiting List** (waitlisted, oldest first) and
  **Allocation History** (full audit trail with expandable history timeline).
- **Students / Wardens**: CRUD; assign/change a student's room
  (`PUT /students/:id/room`).
- **Fees / Reports / Settings / Notices**: fee records, summary reports + CSV
  exports, system settings, notices.

### Warden

Scoped to their own hostel (`user.hostelId`).

- **Dashboard**: students, total/occupied rooms, occupancy %, pending
  allocations, waitlisted, pending leaves, new complaints, plus charts
  (complaints by status, leaves by status, room occupancy by block/wing).
- **Allocations**: only applications whose `hostelId` or `hostelPrefs` include
  their hostel. Review/approve/waitlist/reject, allocate, check in, transfer,
  cancel.
- **Rooms / Students**: room list with occupancy; assign rooms to students.
- **Attendance**: mark daily attendance for their hostel via
  `GET/PUT /warden/attendance/register` (defaults `present`, per block/date).
- **Out-Passes**: approve/reject requests, mark a student departed
  (`POST /outpasses/:id/activate`) and returned (`POST /outpasses/:id/complete`);
  both auto-log a gate punch.
- **Entry / Exit**: record a biometric gate punch for any student
  (`POST /entry-exit`) — the mock auto-flags `late`/`violation` entries and
  drives out-pass transitions; a scoped punch log is shown.
- **Leaves / Complaints / Visitors / Mess Menu / Notices**: manage their
  hostel's records (approve/reject leaves, action complaints, update visitors,
  edit mess menu, publish notices).

### Student

- **Apply** (`AllocationApply`): submit hostel preferences + optional room type;
  blocked while an active application exists.
- **Allocation** (`MyAllocation`): status timeline (Applied → Under Review →
  Approved/Waitlisted → Room Allocated → Occupied) plus full history.
- **Profile / Dashboard**: personal details and stats (fees, complaints,
  leaves, attendance %, out-passes left, today's mess, current allocation).
- **Leave / Out-Pass / Entry-Exit / Complaints / Visitors / Attendance /
  Notices / Mess Menu / Fees**: student-facing requests (leave and out-pass
  with quota) and history (gate punches, status timelines), plus fee payment
  (`POST /student/fees/:id/pay`).

### Service portals (placeholder until later slices)

Caretaker, Mess Manager, Security, Housekeeping, Maintenance Staff and Parent
log in to their own dashboards (`PortalComingSoon`). Their full modules are
planned in the slice roadmap (see development-workflow.md).

## Cross-cutting workflows

- **Complaints**: student raises (`POST /complaints`) → admin/warden view
  (`GET /complaints?status=all|new|inprocess|closed`) → action with a remark
  (`POST /complaints/:id/action`) → history tracked in `complaintHistory`.
- **Leaves**: student requests (`POST /leaves`) → warden approves/rejects
  (`POST /leaves/:id/decision`); approval also sets `parentApproved`.
- **Out-passes**: student requests (`POST /outpasses`, quota `settings.outpassTotal`,
  one open pass at a time) → warden approves (`POST /outpasses/:id/decision`) →
  `active` on departure → `completed` on return. Departed/returned can be marked
  from the out-pass page or by recording an exit/entry gate punch, which
  auto-links via `linkedOutpassId` and stamps `actualReturn`.
- **Entry / exit**: warden/admin/security records a punch (`POST /entry-exit`);
  an entry past the in-time (`settings.girlsInTime` / `summerInTime`) is `late`,
  >30 minutes late is `violation`.
- **Visitors**: student registers a visitor → warden/security updates
  (`PUT /visitors/:id`) → check-in/out times.
- **Fees**: admin creates fee records; students pay (`POST /student/fees/:id/pay`);
  report totals computed in `/admin/reports`.
- **Attendance**: warden marks attendance per date/block; students view their
  own record; dashboard % is derived from it.
- **Mess menu**: weekly menu editable by warden; shown to students.
- **Notices**: admin creates/edits/toggles; students see active notices on
  their dashboard.

## Status values

Keep these exact strings everywhere (they drive `StatusTag` colors and tab
filters):

- Allocation: `applied`, `under_review`, `approved`, `waitlisted`, `allocated`,
  `occupied`, `rejected`, `cancelled`.
- Room: `available`, `partially_occupied`, `full`, `maintenance`,
  `medical_reserved`, `cleaning`, `blocked`, `reserved`.
- Complaint: `New` (null), `In Process`, `Closed`.
- Attendance: `present`, `absent`, `leave`.
- Fee: `paid`, `due`, `overdue`.
- Leave/visitor: `pending`, `approved`, `rejected` (visitors also `checked-in`).
- Out-pass: `pending`, `approved`, `active`, `completed`, `rejected`.
- Entry-exit: `normal`, `late`, `violation` (type `entry` / `exit`).
- Notice audience: `all`, `students`, `girls`, `boys`, `wardens`.