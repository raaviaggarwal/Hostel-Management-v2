# Warden Management Audit

## Scope and status

Static review of the Admin Wardens page, Warden student/room flows, Warden endpoints, and role-based scoping. Live database verification was not performed.

| Area | Status |
|---|---|
| Warden list response and password-hash handling | PASS by code inspection |
| Warden create/update/delete semantics | PARTIALLY WORKING |
| Warden hostel scoping | FAIL in identified edge cases |
| Active/deactivated status | NOT IMPLEMENTED |
| Live Warden/API verification | NOT TESTED |

## Findings

### Positive: Warden listing is Admin-only and does not select password hashes

`GET /wardens` checks for Admin authorization, selects an explicit set of public fields, and sets `Cache-Control: no-store`. The selected fields do not include `password`.

Evidence: [index.js](../../backend/src/routes/index.js#L1242).

### High: An unassigned ordinary Warden can receive unscoped data

Warden creation permits a missing hostel assignment and always creates a `warden` role. In several read paths, a Warden with no `hostelId` does not receive a hostel filter: the Warden dashboard uses an empty room/student filter, and `/rooms` also defaults to all rooms. This differs from allocation access, which denies an ordinary unassigned Warden. A no-hostel ordinary Warden can therefore see broader student/room data than intended.

Evidence: [index.js](../../backend/src/routes/index.js#L603), [index.js](../../backend/src/routes/index.js#L853), [index.js](../../backend/src/routes/index.js#L1261).

### High: Warden room-list query can bypass the assigned-hostel filter

`GET /rooms` applies a requested `hostelId` before applying the Warden's assigned-hostel condition. An authenticated Warden can request a different hostel ID and receive that hostel's room list. This combines with the endpoint's lack of a required authenticated user, so the route does not enforce the intended Warden scope.

Evidence: [index.js](../../backend/src/routes/index.js#L853).

### High: Update/delete-by-ID do not verify that the target is a Warden

`PUT /wardens/:id` and `DELETE /wardens/:id` require an Admin, but look up/update/delete `User` by ID without restricting the target's role to a Warden role. A request using another user's ID can update or delete an Admin or Student account through the Warden endpoint.

Evidence: [index.js](../../backend/src/routes/index.js#L1301), [index.js](../../backend/src/routes/index.js#L1314).

### Medium: Warden update does not validate hostel/block consistency

The create route validates that supplied hostel and block IDs exist and belong together. The update route directly applies `name`, `email`, `hostelId`, and `blockId` without repeating those checks. It can therefore store a block from another hostel or an invalid assignment; errors from database uniqueness constraints are not translated into a clear conflict response.

Evidence: [index.js](../../backend/src/routes/index.js#L1261), [index.js](../../backend/src/routes/index.js#L1301).

### Medium: “Active” is a display-only label

The Warden table renders an “Active” tag regardless of the record's value. The selected Warden API fields and User model have no persisted active/deactivated field, and the page offers no deactivation operation. The display is not a verified account status.

Evidence: [Wardens.jsx](../../frontend/src/pages/admin/Wardens.jsx#L106), [index.js](../../backend/src/routes/index.js#L1242), [schema.prisma](../../backend/prisma/schema.prisma).

### Medium: Warden Add Student cannot create a login account

The Warden add form sends no password, while `POST /students` requires one. See the detailed flow in [Student Management Audit](01-student-management-audit.md).

## Baseline verification

The selected Warden/dashboard frontend tests passed. Backend integration tests were not run because they seed and mutate a database. The configured database target was not independently confirmed.

## Implementation follow-up (approved code-only scope)

The findings above are the pre-fix audit snapshot. The approved code-only changes now enforce Warden hostel scoping for room/student reads, reject unassigned ordinary Wardens from those scopes, and constrain Warden update/delete operations to Warden-role targets. Warden update validates hostel/block consistency. The Warden student form now supplies required credentials and only offers assignable rooms. The Wardens page no longer labels every account “Active”; it shows password-setup status instead.

Mocked regression tests cover room-list authorization and Warden target-role/assignment validation. No live Warden database/API/browser flow was run; persisted active/deactivated status still is not represented in the schema.
