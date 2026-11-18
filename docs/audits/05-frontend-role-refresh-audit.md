# Frontend, Refresh, and Role Access Audit

## Scope and status

Static review of portal routes, shared resource loading, Admin/Warden/Student list and dashboard refresh behavior, and corresponding API authorization.

| Area | Status |
|---|---|
| Frontend portal route guard | PASS by code inspection |
| Shared API/resource loading | PARTIAL PASS |
| API role enforcement | FAIL in identified endpoints |
| Error and freshness feedback | PARTIAL |
| End-to-end browser/database flow | NOT TESTED |

## Findings

### Positive: Frontend portal routes check authentication and role

`ProtectedRoute` redirects unauthenticated users to login and users with the wrong role to their role home. This is appropriate UI navigation protection, but it is not a substitute for backend authorization.

Evidence: [ProtectedRoute.jsx](../../frontend/src/routes/ProtectedRoute.jsx), [AdminRoutes.jsx](../../frontend/src/routes/AdminRoutes.jsx), [WardenRoutes.jsx](../../frontend/src/routes/WardenRoutes.jsx), [StudentRoutes.jsx](../../frontend/src/routes/StudentRoutes.jsx).

### Critical: Backend room-status write lacks authorization

The role guard on frontend routes does not protect API calls. The backend `PUT /rooms/:id/status` route has no authentication or role check; see [Room Management Audit](03-room-management-audit.md).

### High: Some student list/detail roles can read broad Student PII

`GET /students` and `GET /students/:id` allow `mess_manager` and `security` roles. The list route applies a Student self-filter only to the `student` role and a hostel filter only to Wardens; the other allowed roles can receive unrestricted Student records, including contact and guardian fields. This should be reviewed against the minimum data each portal needs.

Evidence: [index.js](../../backend/src/routes/index.js#L994), [index.js](../../backend/src/routes/index.js#L1034).

### High: Warden room query scope and unassigned Warden handling are inconsistent

A Warden can override the room-list hostel filter using a query parameter. An ordinary Warden created without a hostel can also receive unscoped room/student/dashboard data. See [Warden Management Audit](02-warden-management-audit.md).

### Medium: Several pages discard resource-load errors

`useResource` exposes an `error`, but several relevant screens destructure only `data`/`loading`, so an API failure can appear as an empty list or zero data instead of a visible error. Examples include Admin Students/Rooms/Allocations, Warden Students/Rooms, and Student My Allocation. Warden Allocations and Student Apply do display errors; Admin Dashboard also reports initial-load errors.

Evidence: [useResource.js](../../frontend/src/hooks/useResource.js), [Students.jsx](../../frontend/src/pages/admin/Students.jsx), [Rooms.jsx](../../frontend/src/pages/admin/Rooms.jsx), [WardenStudents.jsx](../../frontend/src/pages/warden/WardenStudents.jsx), [WardenRooms.jsx](../../frontend/src/pages/warden/WardenRooms.jsx), [MyAllocation.jsx](../../frontend/src/pages/student/MyAllocation.jsx).

### Medium: Refresh behavior varies by portal

- Student Dashboard refreshes on focus and every five seconds; Warden Dashboard refreshes on focus and every 30 seconds.
- Warden Allocations refreshes on focus and every 30 seconds.
- Admin Dashboard fetches once on mount.
- Student My Allocation fetches once on mount.
- Admin and Warden allocation mutations reload the allocation list but not their cached room list.
- CRUD pages generally reload their own list after successful mutations.

This leaves some dashboards and open detail views stale until navigation or manual reload. The state should be refreshed where the UI promises current status.

Evidence: [Dashboard.jsx](../../frontend/src/pages/admin/Dashboard.jsx), [WardenAllocations.jsx](../../frontend/src/pages/warden/WardenAllocations.jsx), [MyAllocation.jsx](../../frontend/src/pages/student/MyAllocation.jsx), [useResource.js](../../frontend/src/hooks/useResource.js).

### Medium: Existing frontend test coverage is focused, not end-to-end

The selected tests exercise `useResource`, `ProtectedRoute`, Admin Wardens, and dashboard refresh behavior. No focused Student CRUD, Room CRUD, or allocation-screen component tests were found in the inspected set. Passing component tests do not establish a live PostgreSQL-to-React flow.

## Baseline verification

Frontend lint passed. Five selected frontend test files passed (11 tests). Vitest emitted a JSDOM `getComputedStyle` pseudo-element warning, but the tests passed. No browser session or live API/database flow was verified in this audit.

## Implementation follow-up (approved code-only scope)

The findings above are the pre-fix audit snapshot. Follow-up changes now limit Security/Mess Student list data, enforce backend room/student scope, surface My Allocation errors with retry, refresh Student allocations and the Admin dashboard on focus/interval, and refresh Admin/Warden room options after allocation mutations. Warden room occupancy is keyed by room ID. The Student Apply post-submit undefined `reload()` call was replaced with the existing resource reload functions.

Focused frontend tests pass for Admin Wardens, Student Apply, resource loading, and dashboards; frontend lint and production build pass. The build reports an existing large-chunk warning. Other CRUD screens may still discard resource-load errors, and no browser-to-live-database verification was performed.
