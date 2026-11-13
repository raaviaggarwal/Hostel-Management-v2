# Student–Warden Request Flow Audit

## Summary and root cause

For a Student who already has a hostel assignment, the request write path and the Warden's subsequent API query use the same `studentId` and persisted record. The confirmed cause of requests remaining absent from an already-open Warden portal was stale frontend state: the dashboard and request lists did not refresh on focus or while left open. The Student's own request status could also remain stale after a Warden decision. A full page reload or navigating back to the page could make the update appear.

The API review also found authorization gaps: complaint list/detail/history/action routes were not consistently authenticated or hostel-scoped; leave list/action routes had insufficient role checks; allocation detail/actions were not consistently scoped; and an allocated application could remain visible/actionable to a Warden based only on an old hostel preference. These were fixed without removing JWT verification or widening ordinary Warden access.

The follow-up Out-Pass clarification found a separate modeling/configuration gap: the shared Leave flow did not distinguish Out-Passes or retain requested times, and the default seeded Student and default Warden belonged to different hostels. The Leave model now stores an explicit request type and Out-Pass schedule; the seed fixture includes a Warden for the default Student's hostel and no longer gives that Student a stale active request.

## Request flows and access rules

| Request | Student write/read | Warden read/action | Persistence and scope |
|---|---|---|---|
| Leave | `POST /api/leaves`; `GET /api/student/leaves` | `GET /api/leaves`; `POST /api/leaves/:id/decision`, `/activate`, `/complete` | `Leave.studentId` links to `Student`. A Warden sees/acts only on students whose `Student.hostelId` matches the Warden's `User.hostelId`. Admin retains full access; Security retains its existing read access to leaves. |
| Complaint | `POST /api/complaints`; `GET /api/student/complaints`; own detail/history | `GET /api/complaints?status=...`; detail/history; `POST /api/complaints/:id/action` | `Complaint.studentId` links to `Student`; Warden access is scoped through that student's `hostelId`. |
| Room allocation application | `POST /api/allocations`; `GET /api/student/allocation` and `/api/student/application` | `GET /api/allocations`; detail and decision/allocation/check-in/transfer/cancel routes | An unassigned application is visible to a Warden only when that Warden's hostel is in `hostelPrefs`. Once assigned, visibility and actions follow the allocation's actual `hostelId`. Warden allocation/transfer targets are restricted to the Warden's own hostel. |

All three request families now require a valid authenticated role. Missing/invalid authentication returns `401`; an authenticated but unauthorized role or cross-hostel access returns `403`. Students are resolved from their authenticated `regNo`, and can only read their own records. Admin retains global access. An unassigned Chief Warden retains the existing cross-hostel behavior; other Warden accounts without an assigned hostel are denied rather than treated as global.

## Dedicated Out-Pass audit

The application still uses the shared Leave model and existing components/routes; it does not need a separate Out-Pass table. The Student-facing page is [StudentLeave.jsx](./client/src/pages/student/StudentLeave.jsx); it now asks the Student to choose Leave or Out-Pass. An Out-Pass form requires a scheduled departure and expected-return date/time, reason, and destination. A one-day Leave remains a Leave; request type is never inferred from date duration.

The actual current API lifecycle is:

- Student submits with `POST /api/leaves`; the authenticated Student is resolved by `regNo`, and the API creates a `Leave` with `requestType: "OUTPASS"`, local calendar-day `from`/`to`, and timezone-bearing `requestedDepartureAt`/`expectedReturnAt` timestamps normalized to UTC.
- Student retrieves their own records with `GET /api/student/leaves`.
- Warden retrieves assigned-hostel requests with `GET /api/leaves`. The route scopes through the Student's `hostelId` and includes the Student's name and registration number. The Warden page [Leaves.jsx](./client/src/pages/warden/Leaves.jsx) has a “Pending Out-Passes” tab showing only pending `OUTPASS` rows, including reason and scheduled times.
- Warden approves/rejects with `POST /api/leaves/:id/decision`, sending `status: "approved"` or `"rejected"`. The status is stored on that same Leave row.
- Warden marks departure/return with `POST /api/leaves/:id/activate` and `/api/leaves/:id/complete`. These update `departure`/`actualReturn` and create linked `EntryExit` records.
- `GET /api/student/dashboard` returns recent request records and the pending count. The Student dashboard now displays each recent Leave/Out-Pass status; its refresh and the Student/Warden request lists refresh on focus and every 5 seconds.

The `Leave` model now includes `requestType String @default("LEAVE")`, `requestedDepartureAt String?`, and `expectedReturnAt String?`, in addition to the existing Leave fields. Existing records default to `LEAVE`; older callers that omit `requestType` retain Leave behavior. The API rejects invalid request types, unassigned Students, malformed/ambiguous Out-Pass times, mismatched schedule dates, and expected-return times that are not after departure.

Repository history confirms this was a deliberate model merge: the initial migration created a separate `Outpass` table, while `20260820090000_phase5_merge_leave_outpass` adds departure/return fields to `Leave` and drops `Outpass`. That migration contains no `INSERT`/backfill from `Outpass` into `Leave`. The current newly-submitted unified workflow is tested below, but preservation or conversion of any historical standalone Outpass rows is **not verified** and may require a data-preservation decision before applying that migration to a database that contains such rows.

The default Student demo account (`student`) is assigned to hostel 1. The pre-existing default Warden (`warden`) is assigned to hostel 2 and is correctly denied access to that Student's request. The seed now provides `azadwarden` for hostel 1 as the corresponding demo Warden, and the seeded Student's old August active Leave was marked completed so it does not block a new request.

The regression flow logs in with the default Student and matching seeded Warden credentials, submits a typed request, verifies the persisted `Leave` row and Warden response (including name and registration number), denies another-hostel Warden and another Student, then verifies rejection and approval on the same row and the Student's refreshed dashboard/list. A frontend component test verifies the Student form emits `OUTPASS` and timezone-bearing requested date/time fields; a dashboard test verifies the decision status is rendered and refreshes.

**Verification judgment:** The new Out-Pass submission-to-decision flow is verified through API integration tests against disposable PostgreSQL plus focused frontend component tests. It was not exercised in a full browser-driven login session. While a Warden opening the page fetches pending Out-Passes immediately, an already-open page learns of new requests by polling at up to 5-second intervals rather than server push. Historical standalone Outpass rows remain unverified and are not backfilled by the old merge migration.

Focused results: the typed Out-Pass API selection passed **2 tests**; Student Out-Pass form/dashboard tests and the Warden pending Out-Pass section test passed **3 tests**.

## Student-to-database and database-to-Warden verification

Backend integration tests exercised Student request creation through the API, read the persisted Prisma rows, then queried as both the responsible and an unrelated Warden:

- Leave creation returned `201`, persisted the expected `studentId` and `pending` status, appeared in the same-hostel Warden's list, and was absent from another Warden's list. The Warden dashboard's pending-leave count increased. After approval, the Student's own list showed the updated status.
- Complaint creation returned `201`, persisted the expected `studentId` and initial open/new state, appeared only to the same-hostel Warden, and increased that Warden's dashboard count. The assigned Warden could update it and create history; the Student then saw the updated status. Cross-hostel and cross-student detail/history/action attempts were denied.
- Allocation creation returned `201` with the correct Student association and `applied` status. A Warden whose hostel matched a preference could see it, while another Warden could not. An assigned Warden could not allocate or transfer it into a different hostel.
- Unauthenticated request-list calls returned `401`; Student attempts to use staff-only list routes returned `403`.
- The existing student creation and broader backend tests continued to pass.

The Warden dashboard refreshes on focus/visibility and every 30 seconds. Warden request lists, the Student dashboard, and the Student request list refresh on focus/visibility and every 5 seconds. Request pages surface refresh failures with a retry action instead of silently appearing empty. Focused frontend tests verified the Student/Warden dashboard behavior, the Warden pending Out-Pass filter, and the shared resource hook's focus/interval behavior.

## Student with missing room/block information

The inspected record was a fixture in the **disposable local test database**, not production: `Kabir Malhotra` had `hostelId`, `blockId`, and `roomId` unset and `active: false`. His allocation was `approved`, had no assigned hostel/room, and had hostel preference `[1]`. The seed notification explicitly says he is awaiting room allocation. This is an intentionally unallocated fixture, not evidence of a missing assigned room. A Warden cannot be inferred as responsible for his leave/complaint requests until a hostel assignment exists; an unassigned allocation application is instead routed by its preference.

The same seed data contains an audit-log entry saying “Allocated room” for Kabir, which conflicts with the current allocation and notification state. Treat that entry as inconsistent/stale demo audit data; it does not demonstrate a current room assignment. No database records were changed during this audit.

## Files changed

- `server/src/routes/index.js` — request authentication, Student ownership checks, Warden hostel scoping, allocation visibility/action restrictions, and dashboard authorization.
- `server/prisma/schema.prisma` and `server/prisma/migrations/20261113000000_add_leave_request_type/migration.sql` — additive request-type and scheduled-time fields.
- `server/prisma/seed.js` — matching Warden demo account for the default Student and completion of the stale sample request.
- `server/tests/api.test.js` — regression tests for request persistence, role/hostel isolation, allowed decisions, Out-Pass times, and allocation restrictions.
- `client/src/hooks/useResource.js` — optional focus/visibility and interval refresh support.
- `client/src/pages/warden/WardenDashboard.jsx` — periodic/focus refresh and visible refresh errors.
- `client/src/pages/warden/Leaves.jsx`
- `client/src/pages/warden/WardenComplaints.jsx`
- `client/src/pages/warden/WardenAllocations.jsx` — refresh and retry/error UI.
- `client/src/pages/student/StudentLeave.jsx` — explicit request type, schedule fields, status list refresh, and error state.
- `client/src/pages/student/StudentDashboard.jsx` — recent request statuses and refresh.
- `client/src/__tests__/useResource.test.jsx`
- `client/src/__tests__/studentLeave.test.jsx`
- `client/src/__tests__/wardenLeaves.test.jsx`
- `client/src/__tests__/wardenDashboard.test.jsx`
- `client/src/__tests__/studentDashboard.test.jsx`
- `STUDENT_WARDEN_REQUEST_FLOW_AUDIT.md` — this report.

The clarification adds only an additive request-type/schedule migration; the prior Outpass-to-Leave merge migration and its lack of historical-data backfill are documented above.

## Validation results

The database-backed suite used a temporary local PostgreSQL cluster on loopback with explicit `TEST_DATABASE_URL` and `DATABASE_URL` pointing to `hostel_management_test`. The hosted URL in `server/.env` was not used or connected to; no production data was accessed or changed.

- Backend full suite: **92 passed, 0 failed, 0 skipped**.
- Backend lint/syntax checks: **passed**.
- Frontend tests: **49 passed** (13 test files).
- Frontend lint: **passed**.
- Frontend production build: **passed**. Existing bundle-size warning remains: one chunk is approximately **517.25 kB** after minification.
- Prisma schema validation: **valid**. The additive request-type migration was applied only to the disposable local PostgreSQL database; migration status reported up to date.
- `git diff --check`: **passed**.

The request lifecycle was verified with authenticated Supertest integration tests and focused React tests. A full browser-driven login-and-form-submission E2E run was not performed.

## Remaining issues and deployment blockers

- Real Student records without `hostelId` have no assigned Warden for leave/complaint routing. They need a valid assignment through the existing application workflow; the API intentionally does not guess from room preferences.
- Verify that each operational Warden account has the intended `hostelId` before deployment. An unassigned non-Chief Warden now receives `403` for these scoped request routes.
- The stale seeded Kabir audit-log entry should be reviewed as test-fixture data if that fixture is maintained; no production cleanup is implied or performed.
- Historical Outpass rows are not copied by the merge migration. Whether such rows exist in any non-test environment was not checked; do not assume they were preserved.
- Warden visibility requires an operational Warden `hostelId` matching the Student's assigned `hostelId`. The seeded `azadwarden` is a demo/test account; production assignments were not inspected or changed.
- The frontend bundle-size warning remains. No other schema or migration blocker was identified.
- The deployed application was not inspected or changed. This fix is ready for local verification only; it has not been deployed.

## Manual local verification

Use a disposable local database. Log in with the seeded Student account (`student` / `student123`) and submit an Out-Pass with a departure and expected-return time. Log in as the matching demo Warden (`azadwarden` / `warden123`); the request should appear in “Pending Out-Passes” with Student name, registration number, reason, and schedule. Approve or reject it and confirm the Student dashboard and request list show the new status. A Warden assigned to another hostel (the seeded `warden` account) must not see or act on it. If the Warden page is already open during submission, it refreshes within 5 seconds.
