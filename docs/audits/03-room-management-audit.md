# Room Management Audit

## Scope and status

Static review of Admin/Warden room screens, room endpoints, and Room/Student/Block/Hostel schema relationships.

| Area | Status |
|---|---|
| Room list/detail display | PARTIALLY WORKING (code inspection only) |
| Room creation relationship validation | PARTIAL |
| Room status authorization | FAIL |
| Room capacity and identity constraints | NOT ENFORCED consistently |
| Live occupancy/relationship integrity | NOT TESTED |

## Findings

### Critical: Room status can be changed without authentication

`PUT /rooms/:id/status` does not call `getUser`, `adminUser`, or another authorization guard. It accepts a status value and writes it directly. The Admin Room Detail page uses this endpoint, but the backend does not restrict it to Admins or validate the status against an allowlist.

Evidence: [Rooms.jsx](../../frontend/src/pages/admin/Rooms.jsx), [RoomDetail.jsx](../../frontend/src/pages/admin/RoomDetail.jsx), [index.js](../../backend/src/routes/index.js#L979).

### High: Room list is public and does not reliably enforce Warden scope

`GET /rooms` permits unauthenticated requests. For authenticated Wardens, a caller-supplied `hostelId` is applied before the assigned-hostel restriction, allowing a request for another hostel. A Warden without a hostel assignment also receives an unscoped list.

Evidence: [index.js](../../backend/src/routes/index.js#L853).

### High: Room create/update validation is incomplete

Room creation verifies that the hostel and block exist and that the block belongs to the hostel. It does not validate a non-empty room number, a positive seater value, or room-number uniqueness. The schema has no `(hostelId, roomNo)` unique constraint. Room update accepts hostel/block IDs without checking that the block belongs to the selected hostel and without preventing capacity from being reduced below occupancy.

Evidence: [Rooms.jsx](../../frontend/src/pages/admin/Rooms.jsx), [index.js](../../backend/src/routes/index.js#L929), [index.js](../../backend/src/routes/index.js#L961), [schema.prisma](../../backend/prisma/schema.prisma#L71).

### High: Room deletion can leave dangling Student references

There is a backend room-delete route, but the Student and InventoryItem models store `roomId` as a scalar with no Room relation or foreign key. Deleting a room can leave Student and inventory records pointing at a non-existent room. The Admin Rooms page does not expose edit or delete controls, despite the backend routes existing.

Evidence: [index.js](../../backend/src/routes/index.js#L973), [schema.prisma](../../backend/prisma/schema.prisma#L71), [schema.prisma](../../backend/prisma/schema.prisma#L92), [Rooms.jsx](../../frontend/src/pages/admin/Rooms.jsx).

### Medium: Warden occupancy display groups by room number, not room ID

The Warden Rooms page calculates occupancy by matching `Student.roomno` to `Room.roomNo`. Since room numbers are not unique in the schema, rooms with the same number in different blocks can display combined occupancy.

Evidence: [WardenRooms.jsx](../../frontend/src/pages/warden/WardenRooms.jsx), [schema.prisma](../../backend/prisma/schema.prisma#L71).

### Medium: Room status can become stale relative to occupants

Room occupancy is computed from Student room IDs, but status is persisted separately. Some transfer/cancellation paths only set an emptied source room to `available`; when a room remains occupied but loses a bed, a persisted `full` status can remain. The list response does not derive `full` or `partially_occupied` from the current count.

Evidence: [index.js](../../backend/src/routes/index.js#L255), [index.js](../../backend/src/routes/index.js#L1520), [index.js](../../backend/src/routes/index.js#L1597).

## Baseline verification

Backend syntax checks and frontend lint passed. The Admin/Warden UI test coverage does not include room CRUD/occupancy flows. Live database occupancy and foreign-key consistency checks were not run because the configured database target was not independently confirmed.

## Implementation follow-up (approved code-only scope)

The findings above are the pre-fix audit snapshot. The approved application changes now require staff authorization for room listing, enforce the assigned-hostel scope for Wardens, restrict room-status writes to Admins with an allowlisted status, and block room deletion while Student occupants or inventory references remain. Warden occupancy is computed by room ID rather than room number.

Mocked tests cover room-list authorization/scope and room-status authorization/validation. These application guards reduce risk but do not add database foreign keys; scalar Student/Inventory room IDs, room-number uniqueness, and incomplete room create/update constraints remain. Live occupancy and deletion behavior were not verified against PostgreSQL.
