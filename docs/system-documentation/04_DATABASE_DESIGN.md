# 04_DATABASE_DESIGN.md

## Prisma Schema — Complete Model Inventory

This document documents every database model in the Prisma schema at `backend/prisma/schema.prisma`, including fields, data types, primary keys, foreign keys, relationships, unique constraints, default values, nullable fields, indexes, and business meaning.

### Overview
- **Database**: PostgreSQL 17
- **ORM**: Prisma Client 6.16.0
- **Total Models**: 32 models
- **Key Relationships**: User↔Student (1:1, optional), Hostel↔Room (1:N), Block↔Room (1:N), Student↔Allocation (1:N), Student↔Complaint (1:N), Student↔Leave (1:N), Student↔Attendance (1:N), Student↔EntryExit (1:N), Student↔MessFeedback (1:N), Student↔MessComplaint (1:N), Student↔MedicalIncident (1:N)

---

### Model Definitions

#### Model: User
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| name | String | — | yes | — | — | no | — |
| username | String | — | yes | — | ✓ (unique) | no | — |
| email | String | — | yes | — | ✓ (unique) | no | — |
| password | String | — | yes | — | — | no | — |
| role | String | — | yes | — | — | no | — |
| tokenVersion | Int | — | yes | 0 | — | no | — used for token invalidation |
| regNo | String | — | — | — | — | yes | Links to Student.regNo |
| hostelId | Int | — | — | — | — | yes | FK → Hostel.id |
| blockId | Int | — | — | — | — | yes | FK → Block.id |
| studentId | Int | — | — | — | — | yes | FK → Student.id (self-referencing for related students) |

#### Model: Hostel
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| code | String | — | yes | — | — | no | — |
| name | String | — | yes | — | — | no | — |
| gender | String | — | yes | — | — | no | — (male/female) |
| type | String | — | yes | — | — | no | — (freshers/seniors) |
| campus | String | — | yes | 'campus' | — | no | — |
| address | String | — | yes | '' | — | no | — |
| seats | Int | — | yes | — | — | no | — total capacity |
| roomCount | Int | — | yes | — | — | no | — number of rooms |
| note | String | — | — | null | — | yes | — |
| blocks | Block[] | — | — | — | — | no | 1:many → blocks |
| rooms | Room[] | — | — | — | — | no | 1:many → rooms |

#### Model: Block
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| hostelId | Int | — | yes | — | — | no | FK → Hostel.id |
| name | String | — | yes | — | — | no | — (wing name) |
| hostel | Hostel | — | — | — | — | no | Many-to-1 → hostel |
| rooms | Room[] | — | — | — | — | no | 1:many → rooms (inverse: blockId) |

**Relationship**: `onDelete: Cascade` — if hostel deleted, blocks deleted

#### Model: Room
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| hostelId | Int | — | yes | — | — | no | FK → Hostel.id |
| blockId | Int | — | yes | — | — | no | FK → Block.id (nullable in DB, but schema says required) |
| floor | Int | — | — | 1 | — | no | — |
| roomNo | String | — | yes | — | — | no | — room number |
| type | String | — | — | 'double' | — | no | — (double/single/etc.) |
| seater | Int | — | — | 2 | — | no | — beds per room |
| status | String | — | — | 'available' | — | no | — (available/full/partially_occupied/blocked/maintenance/cleaning) |
| medicalReserved | Boolean | — | — | false | — | no | — |
| hostel | Hostel | — | — | — | — | no | Many-to-1 → hostel |
| block | Block | — | — | — | — | no | Many-to-1 → block |
| allocations | Allocation[] | — | — | — | — | no | 1:many → allocations |
| medicalIncidents? | — | — | — | — | — | — | See MedicalIncident model (no direct FK in schema, but incidents reference students) |

#### Model: Student
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| regNo | String | — | yes | — | ✓ (unique) | no | — registration number |
| name | String | — | yes | — | — | no | — |
| gender | String | — | yes | — | — | no | — |
| year | Int | — | yes | — | — | no | — (1-10) |
| course | String | — | yes | — | — | no | — |
| cgpa | Float | — | — | 0 | — | no | — |
| contactno | String | — | — | '' | — | no | — |
| emailid | String | — | yes | — | — | no | — |
| roomId | Int | — | — | null | — | yes | FK → Room.id (nullable) |
| hostelId | Int | — | — | null | — | yes | FK → Hostel.id (nullable) |
| blockId | Int | — | — | null | — | yes | FK → Block.id (nullable) |
| roomno | String | — | — | null | — | yes | — denormalized room number |
| seater | Int | — | — | null | — | yes | — denormalized seater count |
| leaveUsed | Int | — | — | 0 | — | no | — default 0 |
| stayfrom | String | — | — | null | — | yes | — stay start date |
| guardianName | String | — | — | '' | — | no | — |
| guardianRelation | String | — | — | '' | — | no | — |
| guardianContactno | String | — | — | '' | — | no | — |
| active | Boolean | — | — | false | — | no | — |
| allocations | Allocation[] | — | — | — | — | no | 1:N → allocations |
| complaints | Complaint[] | — | — | — | — | no | 1:N → complaints |
| attendance | Attendance[] | — | — | — | — | no | 1:N → attendance |
| entryExit | EntryExit[] | — | — | — | — | no | 1:N → entry/exit records |
| leaves | Leave[] | — | — | — | — | no | 1:N → leaves |
| messFeedback | MessFeedback[] | — | — | — | — | no | 1:N → mess feedback |
| messComplaints | MessComplaint[] | — | — | — | — | no | 1:N → mess complaints |
| medicalIncidents | MedicalIncident[] | — | — | — | — | no | 1:N → medical incidents |

#### Model: Allocation
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| studentId | Int | — | yes | — | — | no | FK → Student.id |
| studentName | String | — | yes | — | — | no | — denormalized |
| regNo | String | — | yes | — | — | no | — denormalized |
| gender | String | — | yes | — | — | no | — denormalized |
| year | Int | — | yes | — | — | no | — denormalized |
| hostelPrefs | Json | — | yes | — | — | no | — array of preferred hostel IDs |
| roomType | String | — | — | null | — | yes | — preferred room type |
| status | String | — | — | 'applied' | — | no | — (applied/approved/waitlisted/rejected/cancelled/occupied) |
| hostelId | Int | — | — | null | — | yes | FK → Hostel.id (nullable) |
| roomId | Int | — | — | null | — | yes | FK → Room.id (nullable) |
| roomNo | String | — | — | null | — | yes | — denormalized room number |
| bedNo | Int | — | — | null | — | yes | — bed number within room |
| appliedDate | String | — | yes | today() | — | no | — application date |
| updatedDate | String | — | yes | today() | — | no | — last update date |
| history | Json | — | — | [] | — | no | — array of {status, date, by, note} |
| student | Student | — | — | — | — | no | Many-to-1 → student |
| room | Room? | — | — | null | — | yes | Many-to-1 → room (nullable) |

**Relationship notes**: 
- `history` tracks status changes with `{status, date, by, note}`
- `roomId` can be null (before allocation)
- Status flow: applied → approved → allocated → occupied; or cancelled/rejected/waitlisted

#### Model: Complaint
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| complainNumber | Int | — | yes | math random (1e8-9e8) | — | no | — generated at creation |
| studentId | Int | — | yes | — | — | no | FK → Student.id |
| studentName | String | — | yes | — | — | no | — denormalized |
| complaintType | String | — | yes | — | — | no | — (Electrical, Plumbing, Carpentry, Room, Furniture, Internet, Other) |
| complaintDetails | String | — | yes | — | — | no | — |
| preferredVisitingHours | String | — | — | null | — | yes | — optional |
| complaintStatus | String | — | — | null | — | yes | — (In Process/Closed/null) |
| registrationDate | String | — | yes | now() | — | no | — date created |
| student | Student | — | — | — | — | no | Many-to-1 → student |
| actions | ComplaintAction[] | — | — | — | — | no | 1:N → complaint actions |

#### Model: ComplaintAction
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| complaintId | Int | — | yes | — | — | no | FK → Complaint.id |
| complaintStatus | String | — | yes | — | — | no | — status after action |
| remark | String | — | yes | '' | — | no | — warden/admin remark |
| postingDate | String | — | yes | now() | — | no | — date of action |
| complaint | Complaint | — | — | — | — | no | Many-to-1 → complaint **onDelete: Cascade** |

**Relationship**: onDelete: Cascade — if complaint deleted, actions deleted

#### Model: InventoryItem
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| roomId | Int | — | yes | — | — | no | FK → Room.id |
| hostelId | Int | — | yes | — | — | no | FK → Hostel.id |
| item | String | — | yes | — | — | no | — item name |
| quantity | Int | — | yes | — | — | no | — quantity in stock |
| condition | String | — | yes | — | — | no | — (new/good/damaged/etc.) |
| status | String | — | — | 'new' | — | no | — (new/available/assigned/maintenance) |
| assignedTo | String | — | — | 'Student' | — | no | — (Student/Staff) |

#### Model: HousekeepingTask
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|----|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| hostelId | Int | — | yes | — | — | no | FK → Hostel.id |
| taskType | String | — | yes | — | — | no | — (Room cleaning, Area cleaning, etc.) |
| area | String | — | yes | — | — | no | — (e.g., 'East Wing 2nd floor') |
| assignedTo | String | — | yes | — | — | no | — (Staff/Helper) |
| schedule | String | — | — | null | — | yes | — date/schedule |
| status | String | — | — | 'pending' | — | no | — (pending/in_progress/completed) |
| inspected | Boolean | — | — | false | — | no | — |
| rating | Int | — | — | null | — | yes | — 1-5 rating |

#### Model: Attendance
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| studentId | Int | — | yes | — | — | no | FK → Student.id |
| date | String | — | yes | — | — | no | — format: YYYY-MM-DD |
| status | String | — | yes | 'present' | — | no | — (present/absent/leave) |
| student | Student | — | — | — | — | no | Many-to-1 → student |

#### Model: EntryExit
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| studentId | Int | — | yes | — | — | no | FK → Student.id |
| date | String | — | yes | — | — | no | — format: YYYY-MM-DD |
| time | String | — | yes | — | — | no | — format: HH:MM |
| type | String | — | yes | — | — | no | — (entry/exit) |
| gate | String | — | yes | — | — | no | — (Main Gate/Girls Hostel Gate) |
| status | String | — | — | 'normal' | — | no | — (normal/late/violation) |
| lateMinutes | Int | — | — | 0 | — | no | — minutes late |
| linkedLeaveId | Int | — | — | null | — | yes | FK → Leave.id (nullable) |
| student | Student | — | — | — | — | no | Many-to-1 → student |

**Relationship notes**: 
- `linkedLeaveId` connects entry/exit to a leave record
- On exit: creates entryExit with type='exit', links leave, sets departure on leave
- On entry: creates entryExit with type='entry', links leave, sets actualReturn on leave

#### Model: Notice
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| title | String | — | yes | — | — | no | — |
| body | String | — | yes | — | — | no | — |
| category | String | — | — | 'General' | — | no | — default 'General' |
| audience | String | — | — | 'all' | — | no | — default 'all' (all/students/boys/girls) |
| date | String | — | yes | today() | — | no | — format: YYYY-MM-DD |
| expiryDate | String | — | — | null | — | yes | — optional |
| priority | String | — | — | 'normal' | — | no | — (normal/high/urgent?) |
| active | Boolean | — | — | true | — | no | — |

#### Model: Leave
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| studentId | Int | — | yes | — | — | no | FK → Student.id |
| studentName | String | — | yes | — | — | no | — denormalized |
| from | String | — | yes | — | — | no | — start date |
| to | String | — | yes | — | — | no | — end date |
| reason | String | — | yes | — | — | no | — |
| destination | String | — | yes | — | — | no | — where student is going |
| parentApproved | Boolean | — | — | false | — | no | — |
| status | String | — | — | 'pending' | — | no | — (pending/approved/active/completed/rejected) |
| departure | String | — | — | null | — | yes | — exit timestamp |
| actualReturn | String | — | — | null | — | yes | — return timestamp |
| student | Student | — | — | — | — | no | Many-to-1 → student |

**Relationship notes**: 
- Status flow: pending → approved → active (on departure) → completed (on return)
- parentApproved defaults to false; set to true when warden approves with parent consent
- leaveUsed cascade-updated from student count of approved/active/completed leaves vs settings.leaveTotal

#### Model: MessMenu
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| day | String | — | yes | — | — | no | — (Monday/Sunday etc.) |
| breakfast | String | — | yes | — | — | no | — |
| lunch | String | — | yes | — | — | no | — |
| snacks | String | — | yes | — | — | no | — |
| dinner | String | — | yes | — | — | no | — |
| milk | String | — | yes | — | — | no | — |

#### Model: MessFeedback
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| studentId | Int | — | yes | — | — | no | FK → Student.id |
| date | String | — | yes | today() | — | no | — |
| taste | Int | — | yes | — | — | no | — (1-5 scale) |
| quantity | Int | — | yes | — | — | no | — (1-5 scale) |
| hygiene | Int | — | yes | — | — | no | — (1-5 scale) |
| variety | Int | — | yes | — | — | no | — (1-5 scale) |
| temperature | Int | — | yes | — | — | no | — (1-5 scale) |
| overall | Int | — | yes | — | — | no | — (1-5 scale) |
| comment | String | — | — | null | — | yes | — optional text |
| student | Student | — | — | — | — | no | Many-to-1 → student |

#### Model: MessComplaint
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| studentId | Int | — | yes | — | — | no | FK → Student.id |
| date | String | — | yes | today() | — | no | — |
| subject | String | — | yes | — | — | no | — |
| details | String | — | yes | — | — | no | — |
| status | String | — | — | 'open' | — | no | — (open/resolved/closed) |
| student | Student | — | — | — | — | no | Many-to-1 → student |

#### Model: MessInspection
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| date | String | — | yes | — | — | no | — format: YYYY-MM-DD |
| area | String | — | yes | — | — | no | — (Kitchen/Dining Hall/etc.) |
| hygiene | Int | — | yes | — | — | no | — (1-5 scale) |
| remarks | String | — | — | '' | — | no | — |

#### Model: WifiAccessPoint
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| hostelId | Int | — | yes | — | — | no | FK → Hostel.id |
| accessPoint | String | — | yes | — | — | no | — (AP name/identifier) |
| status | String | — | yes | — | — | no | — (online/offline/maintenance) |
| downtime | Int | — | — | 0 | — | no | — total downtime in minutes |
| issues | Json | — | — | null | — | yes | — list of issue objects |

#### Model: MedicalDispensary
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| doctor | String | — | yes | — | — | no | — |
| nurse | String | — | yes | — | — | no | — |
| contactno | String | — | yes | — | — | no | — |
| ambulance | String | — | yes | — | — | no | — |

#### Model: MedicalIncident
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| studentId | Int | — | yes | — | — | no | FK → Student.id |
| date | String | — | yes | — | — | no | — format: YYYY-MM-DD |
| type | String | — | yes | — | — | no | — (Fever, Injury, Allergic reaction, etc.) |
| description | String | — | yes | — | — | no | — |
| status | String | — | — | 'recorded' | — | no | — (recorded/pending/referred) |
| parentNotified | Boolean | — | — | false | — | no | — |
| student | Student | — | — | — | — | no | Many-to-1 → student |

#### Model: CommitteeMember
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| name | String | — | yes | — | — | no | — |
| role | String | — | yes | — | — | no | — (Chairperson/Secretary/Member) |

#### Model: CommitteeMeeting
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| date | String | — | yes | — | — | no | — format: YYYY-MM-DD |
| agenda | String | — | yes | — | — | no | — |
| decisions | Json | — | — | [] | — | no | — array of decision strings |
| actionItems | Json | — | — | [] | — | no | — array of action item objects |

#### Model: AuditLog
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| actor | String | — | yes | — | — | no | — (name e.g. 'System Admin') |
| actorId | Int | — | — | null | — | yes | — references User.id or Student.id |
| actorRole | String | — | — | null | — | yes | — (admin/warden/student/parent) |
| action | String | — | yes | — | — | no | — (Created/Updated/Deleted etc.) |
| entity | String | — | yes | — | — | no | — (Hostel/Student/Notice etc.) |
| before | String | — | — | '-' | — | no | — state before change |
| after | String | — | — | '-' | — | no | — state after change |
| ip | String | — | — | null | — | yes | — client IP |
| userAgent | String | — | — | null | — | yes | — HTTP user agent |
| timestamp | String | — | yes | now() | — | no | — ISO timestamp |

#### Model: Notification
| Field | Type | PK | Required | Default | Unique | Nullable | Relations |
|-------|------|----|----------|---------|--------|----------|-----------|
| id | Int | ✓ | yes | autoincrement() | — | no | — |
| title | String | — | yes | — | — | no | — |
| description | String | — | yes | — | — | no | — |
| read | Boolean | — | — | false | — | no | — default false |
| date | String | — | yes | today() | — | no | — format: YYYY-MM-DD |
| audience | String | — | — | 'all' | — | no | — default 'all' |
| category | String | — | — | 'info' | — | no | — default 'info' |
| userId | Int | — | — | null | — | yes | FK → User.id (nullable) — specific user notification |

---

### Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    USER ||--|{ STUDENT : "linked via regNo"
    USER ||--|{ ALLOCATION : "created by"
    USER ||--|{ COMPLAINT : "action by"
    USER ||--|{ LEAVE : "approved by"
    USER ||--|{ NOTIFICATION : "recipient"
    USER ||--|{ AUDIT_LOG : "actor"
    USER ||--|{ SETTING : "updater"
    
    HOSTEL ||--|{ BLOCK : "has wings"
    HOSTEL ||--|{ ROOM : "contains rooms"
    HOSTEL ||--|{ INVENTORY_ITEM : "in"
    HOSTEL ||--|{ WIFI_ACCESS_POINT : "has APs"
    HOSTEL ||--|{ MEDICAL_DISPENSARY : "operates"
    
    BLOCK ||--|{ ROOM : "has rooms"
    
    ROOM ||--|{ ALLOCATION : "allocated to"
    ROOM ||--|{ INVENTORY_ITEM : "items in"
    ROOM ||--|{ STUDENT : "occupied by" }
    ROOM ||--|{ ENTRY_EXIT : "entry/exit records"
    
    STUDENT ||--|{ ALLOCATION : "has applications"
    STUDENT ||--|{ COMPLAINT : "files"
    STUDENT ||--|{ LEAVE : "requests"
    STUDENT ||--|{ ATTENDANCE : "records"
    STUDENT ||--|{ ENTRY_EXIT : "entry/exit logs"
    STUDENT ||--|{ MESS_FEEDBACK : "submits"
    STUDENT ||--|{ MESS_COMPLAINT : "files"
    STUDENT ||--|{ MEDICAL_INCIDENT : "experiences"
    STUDENT ||--|{ NOTIFICATION : "receives"
    
    ALLOCATION }|--|| STUDENT : "student allocated"
    ALLOCATION ||--|{ ROOM : "room assigned"
    
    COMPLAINT ||--|{ COMPLAINT_ACTION : "actions on"
    LEAVE ||--|{ ENTRY_EXIT : "linked exit/entry"
    
    MESS_FEEDBACK ||--|{ STUDENT : "by student"
    MESS_COMPLAINT ||--|{ STUDENT : "by student"
    MEDICAL_INCIDENT ||--|{ STUDENT : "for student"
    
    NOTIFICATION ||--|{ USER : "targeted to"
```

---

### Key Relationships Explained

#### Student ↔ User (1:1, optional)
- `User.regNo` links to `Student.regNo` (both unique)
- `User.id` and `Student.id` are separate auto-increment sequences
- `User.tokenVersion` used for token invalidation (incremented on logout)
- A User may or may not have a linked Student record

#### Hostel → Block → Room (1:N→1:N)
- Hostel has many Blocks (wings)
- Block belongs to one Hostel (onDelete: Cascade)
- Block has many Rooms
- Room belongs to one Block via `blockId`
- Room belongs to one Hostel via `hostelId`

#### Student ↔ Allocation (1:N)
- Student has many Allocations (application history)
- Allocation belongs to one Student
- Allocation tracks application status flow: applied → approved → allocated → occupied
- Allocation may have `roomId` pointing to Room, or be null (pending/cancelled)
- `history` field records every status change with `{status, date, by, note}`

#### Student ↔ Leave (1:N)
- Student has many Leave requests
- Leave status flow: pending → approved → active → completed
- On exit: `entryExit` created with `type='exit'`, `linkedLeaveId` set, `leave.departure` set
- On entry: `entryExit` created with `type='entry'`, `linkedLeaveId` set, `leave.actualReturn` set
- `leaveUsed` on Student cascade-updated from count of approved/active/completed leaves vs `Setting.leaveTotal`

#### Student ↔ Complaint (1:N)
- Student files many Complaints
- ComplaintStatus: null (new), 'In Process', 'Closed'
- `ComplaintAction` tracks actions with status changes and remarks

#### EntryExit ↔ Leave (1:0-1)
- `linkedLeaveId` optionally links to a Leave record
- On student exit with approved leave → `leave.status` set to 'active', `leave.departure` set, `entryExit.linkedLeaveId` = leave.id
- On student return with active leave → `leave.status` set to 'completed', `leave.actualReturn` set, `entryExit.linkedLeaveId` = leave.id, `entryExit.type` = 'entry'

#### Notification (cross-cutting)
- `Notification` model is independent of User/Student
- Has `audience` field (all/students/boys/girls) and `category` (info/warning/success/alert)
- `userId` optionally targets specific user
- Queried by role in `notificationWhereFor()` function

#### AuditLog (cross-cutting)
- Every major action creates an `AuditLog` entry
- `actor` (name), `actorId` (User.Student ID), `actorRole`, `action`, `entity`, `before`, `after`, `ip`, `userAgent`, `timestamp`
- Used for admin reports and compliance

### Indexes and Constraints (from Prisma schema)

Unique constraints (implicit via `@unique`):
- `User.username` — unique
- `User.email` — unique
- `Student.regNo` — unique

Implicit indexes (Prisma default):
- Primary keys on all models (`@id @default(autoincrement())`)
- Foreign key indexes are created by Prisma automatically

No explicit `@@index` directives in the schema, but Prisma creates indexes for:
- Foreign key columns (`hostelId`, `blockId`, `roomId`, `studentId`, etc.)
- Relations used in `findMany` queries (e.g., `student.hostelId`, `room.hostelId`)

### How Main Entities Connect

1. **Student Records Created**: 
   - `POST /api/students` → creates `User` (with password hashed by bcrypt) and `Student` (with `active: false`)
   - `regNo` is unique; `role` defaults based on creation context (admin sets, warden sets hostelId)
   - Student starts without a room (`roomId: null`, `hostelId: null` for wardens, or no hostel for students)

2. **Room Allocation Workflow**:
   - Student submits hostel preferences via `POST /api/allocations` → creates `Allocation` with status 'applied'
   - Warden reviews via `POST /api/allocations/:id/decision` → changes status to 'approved'/'waitlisted'
   - Warden allocates room via `POST /api/allocations/:id/allocate` →:
     - Finds eligible room (`findRoomFor`): checks `medicalReserved: false`, `occupants < seater`
     - `doAllocate()`: updates `Allocation` (roomId, hostelId, roomNo, bedNo, status='allocated', updatedDate, history)
     - Updates `Room` status: `bedNo >= seater ? 'full' : 'partially_occupied'`
     - Updates `Student`: `roomId`, `hostelId`, `blockId`, `roomno`, `seater`, `active: true`
     - Creates audit log and notification

3. **How Room Capacity is Enforced**:
   - `roomOccupancyMap()`: fetches all students with `roomId !== null`, builds Map<roomId, [students]>
   - Before allocation: `occ.get(room.id).length < room.seater` — check capacity
   - After allocation: `room.status` updated to `'full'` when `occupants >= seater`, otherwise `'partially_occupied'`
   - On cancellation: previous room's occupants filtered (excluding cancelled student), status reset to 'available' if vacant

4. **Hostel Assignments**:
   - Student has `hostelId` (nullable) and `blockId` (nullable)
   - Warden assigned to a hostel via `User.hostelId` and `User.blockId`
   - Student gender must match hostel gender (`eligibleHostels` filters by `h.gender === student.gender`)
   - Student year must match hostel type: `freshers` → `student.year === 1`, others → `student.year > 1`

5. **Relationship Update/Delete Behavior**:
   - `onDelete: Cascade` used for: `Block→Room`, `Complaint↔ComplaintAction`, `Student→EntryExit` (via linkedLeaveId not direct Prisma), `AuditLog` references
   - No cascading delete on `Student→Allocations` (historical record kept)
   - `Student→Complaints`: complaints remain if student deleted? Actually Prisma doesn't specify onDelete; likely SET NULL or restrict
   - `Room→Allocations`: allocation kept if room deleted? Need to check — likely restrict

6. **Prisma Migration Organization**:
   - Migrations in `backend/prisma/migrations/` (8 files seen: `202608...`)
   - Migration history should be consistent with `schema.prisma`
   - `npm run build` → `npx prisma migrate deploy` — deploys pending migrations
   - `npm run prisma:seed` → runs seed data
   - Test database: `TEST_DATABASE_URL` used when `VITEST=true` or `NODE_ENV=test`

### Summary of Models by Category

| Category | Models |
|----------|--------|
| Core/Identity | User, Student |
| Hostel Infrastructure | Hostel, Block, Room |
| Operations | Allocation, Complaint, ComplaintAction, Leave, EntryExit, Attendance |
| Mess & Facilities | MessMenu, MessFeedback, MessComplaint, MessInspection, WifiAccessPoint, MedicalDispensary, MedicalIncident |
| Administration | Notice, Setting, CommitteeMember, CommitteeMeeting, AuditLog, Notification |
| Inventory & Housekeeping | InventoryItem, HousekeepingTask |

**Total: 32 models**