# Frontend Pre-Deployment Audit

## Outcome

The frontend test, lint, and production-build checks pass, and the audit fixed confirmed authentication, request-state, and mutation-call defects. This is **not a full end-to-end certification**: most portal workflows were route-smoke-tested rather than exercised through every form and action. Do not treat untested items below as verified.

No deployment, Git push, or commit was performed. Browser checks used the local application and disposable test database only; no production database was accessed. The audit-created student record was deleted and its absence confirmed.

## Verification results

| Check | Result | Evidence / limits |
|---|---|---|
| Frontend tests | **Passed** — 9 files, 44 tests | `npm --prefix client test` |
| Frontend lint | **Passed** | `npm --prefix client run lint`; no lint warnings/errors |
| Production build | **Passed** | `npm --prefix client run build`; existing large-chunk warning remains (517.25 kB minified client chunk) |
| Backend integration suite | **Passed previously** — 89 passed, 0 failed, 0 skipped | No backend runtime code was changed during this frontend audit |
| Admin, Warden, Student login | **Passed** | Each portal logged in against the local test environment |
| Route smoke checks | **Partial** | Warden and Student route sets rendered; Admin routes rendered. This confirms route-level rendering, not that every feature/action works. `/admin/hostels/1` and `/admin/rooms/1` returned not-found for those unverified IDs; this was not established as a product defect. |
| Authentication persistence | **Passed for navigation check** | Token remained available while navigating between routes after removing unload-time cleanup. Explicit logout and expiry were not exhaustively exercised. |
| Student create / list / edit / delete | **Passed in Admin UI** | Created a uniquely named test student, verified it via API/UI, edited its name after fixing the update call, deleted it, and confirmed the search API returned zero matching records. |
| Notifications | **Partial** | Warden notification loading and marking one notification read succeeded in the prior local check. Admin list loaded; its seeded notifications were already read and “Mark all as read” was disabled. Student’s seeded notification was already read. Mark-all behavior was therefore not exercised. |
| Responsive layout | **Spot-checked** | Desktop, tablet, and mobile viewport checks showed no document-width overflow on the checked notifications/settings screens. Mobile navigation drawer was present. This is not a full responsive review of every page. |
| Settings | **Partial** | General settings loaded into the visible form; Security tab displayed the new unavailable-password-change notice. Settings save was not submitted. |

### Feature coverage not established

The following Admin, Warden, and Student areas were not comprehensively tested end-to-end. Route visibility or a page loading is not evidence that the underlying workflow works:

- Admin: dashboard statistics, warden/hostel/block CRUD, room CRUD and status changes, allocations, complaints, leave approvals, inventory, housekeeping, mess, Wi-Fi, medical, notices, committee actions, report exports, and audit-log behavior.
- Warden: student creation, hostel isolation, room assignment, allocation decisions, complaint resolution, leave approvals, attendance save, entry/exit, housekeeping, mess, and medical actions.
- Student: allocation submission for a student with no active allocation, profile changes, leave request submission, complaints, mess feedback, attendance, and entry/exit.
- Duplicate submissions, injected API failures for every page, expired-session behavior, and mobile navigation/action flows across all routes.
- Notification mark-all behavior and role-isolation cases were not fully exercised in the browser. The previously passing backend suite provides backend test evidence, not UI-workflow evidence.

## Bugs found and fixed

1. **Authentication token cleared during navigation.** A delayed `beforeunload` cleanup could run before a new page registered its `load` listener, making ordinary navigation lose the session. Removed that unreliable cleanup; explicit logout and expiry behavior remain. Added an auth regression test.
2. **Notifications used an inconsistent token source / lifecycle.** The API client now reads the shared token key, and the provider loads only while authenticated, discards stale responses, and handles unauthorized responses explicitly. Notification API and provider tests are included in the frontend suite.
3. **Student edit used the update helper with the wrong argument order.** The UI sent a malformed URL and received `404 Not found`. Corrected the helper call and verified a name edit succeeded in the browser.
4. **Room-status and Warden room-assignment mutations also used the wrong helper overload.** Changed them to send `PUT` to the intended path with the expected request body. These two repaired actions were not separately exercised in the browser.
5. **Allocation form could render before prerequisite data loaded.** Added loading/error/retry states to prevent a premature duplicate-application form and changed the “No preference” radio value from `null` to an empty string. The no-active-allocation scenario was not directly exercised.
6. **Settings form initialization and password feedback were misleading.** Settings now report load errors and initialize the connected form from loaded values. Removed the fake password-change success flow; the UI now explains that the API does not support password changes.
7. **Several pages concealed request failures or could remain in loading states.** Added explicit error/loading handling to Admin and Warden dashboards, Student dashboard/profile and leave quota, Reports/exports, Committee, and Warden attendance. Every error path was not forced in the browser.

## Remaining warnings and blockers

- **Deployment blocker — password changes are unsupported.** The UI now states this rather than claiming success. Provide a real authenticated password-change API and test it if password changes are a release requirement.
- **Security deployment blocker — demo quick-login credentials are present in the login UI.** Remove/disable demo access for production and rotate any associated accounts/secrets. Production account status was not checked.
- **Unresolved data question — a student row displayed without room/seater information.** The audit did not establish whether the student is intentionally unallocated or whether allocation data is inconsistent. Verify the student/allocation records in a non-production environment before classifying it as a defect.
- **Notification mark-all and role-specific UI behavior need unread test data** before those actions can be considered verified.
- **Chunk-size warning:** build succeeds, but `client` output contains a 517.25 kB minified chunk. Consider code-splitting as a separate performance task.
- **Browser deprecation warnings remain:** React Router v7 future-flag notices and Ant Design deprecations, including `Drawer.width`, `Space.direction`, `List`, `Alert.message`, `Statistic.valueStyle`, and related component APIs. These did not fail lint, tests, or build.
- Broad workflow verification remains a deployment risk; this report intentionally does not mark untested modules as working.

## Files changed

- `FRONTEND_AUDIT.md` (this report)

### Frontend

- `client/src/__tests__/auth.test.jsx`
- `client/src/__tests__/NotificationsContext.test.jsx` (new)
- `client/src/__tests__/apiClient.test.js` (new)
- `client/src/__tests__/useResource.test.jsx` (new)
- `client/src/api/client.js`
- `client/src/components/Navbar.jsx`
- `client/src/context/AuthContext.jsx`
- `client/src/context/NotificationsContext.jsx`
- `client/src/hooks/useResource.js`
- `client/src/layout/AppLayout.jsx`
- `client/src/pages/admin/Committee.jsx`
- `client/src/pages/admin/Dashboard.jsx`
- `client/src/pages/admin/Reports.jsx`
- `client/src/pages/admin/RoomDetail.jsx`
- `client/src/pages/admin/Rooms.jsx`
- `client/src/pages/admin/Settings.jsx`
- `client/src/pages/admin/Students.jsx`
- `client/src/pages/student/AllocationApply.jsx`
- `client/src/pages/student/StudentDashboard.jsx`
- `client/src/pages/student/StudentLeave.jsx`
- `client/src/pages/student/StudentProfile.jsx`
- `client/src/pages/warden/WardenAttendance.jsx`
- `client/src/pages/warden/WardenDashboard.jsx`
- `client/src/pages/warden/WardenStudents.jsx`

### Backend tests carried in the worktree from the preceding tasks

- `server/tests/api.test.js`
- `server/tests/notifications.test.js` (new)

The audit did not change backend application behavior.
