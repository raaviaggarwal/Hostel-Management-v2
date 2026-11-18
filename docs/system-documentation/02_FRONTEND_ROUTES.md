# 02_FRONTEND_ROUTES.md

## Frontend Route Table

This document documents every frontend route discovered in the codebase, including path, component, role access, authentication requirements, layout, data fetching, API calls, actions, forms, states, and implementation status.

### Legend
- **AUTH**: Whether authentication is required
- **LAYOUT**: Page layout component used
- **DATA**: Data fetched from backend
- **API**: Backend API endpoint called
- **IMPLEMENTATION**: fully-implemented / partially-implemented / ui-only

---

### Auth Routes

| # | URL | Component | Auth Required | Layout | Data Fetched | API Endpoint | Actions | Forms | States | Implementation |
|---|-----|-----------|--------------|--------|--------------|--------------|---------|-------|--------|----------------|
| 1 | `/login` | Login | No (public) | None | — | `POST /api/auth/login` | Login, quick-login with demo accounts | usernameOrEmail (required), password (required) | loading, success (welcome msg), error (login failed), error (invalid credentials) | fully-implemented |
| 2 | `/auth/me` (internal) | — | Yes | — | User profile | `GET /api/auth/me` | — | — | — | fully-implemented |

---

### Student Routes

| # | URL | Component | Auth Required | Layout | Data Fetched | API Endpoint | Actions | Forms | States | Implementation |
|---|-----|-----------|--------------|--------|--------------|--------------|---------|-------|--------|----------------|
| 1 | `/student/dashboard` | StudentDashboard | Yes (student token) | Dashboard layout | Student dashboard stats, allocation, recent complaints, recent notices, today's mess menu | `GET /api/student/dashboard` | — | — | loading, error, empty (no student record), success (data displayed) | fully-implemented |
| 2 | `/student/profile` | StudentProfile | Yes (student token) | Profile layout | Student profile (name, regNo, email, gender, contactno, course, roomno, seater, stayfrom, guardian details) | `GET /api/student/profile` | — | — | loading, error, empty, success | fully-implemented |
| 3 | `/student/apply` | AllocationApply | Yes (student token) | Allocation layout | — | `POST /api/allocations` (allocation application) | Submit hostel application | hostelPrefs (required), roomType, validation: at least one preference, eligible hostels | loading, success (application submitted), error (already has active appl., inelig. prefs, quota exhausted) | fully-implemented |
| 4 | `/student/allocation` | MyAllocation | Yes (student token) | Allocation layout | Student's allocation history | `GET /api/student/allocation` | — | — | loading, data, empty | fully-implemented |
| 5 | `/student/leave` | StudentLeave | Yes (student token) | Leave layout | Leave requests (all, pending, approved, active, completed, rejected), quota, remaining leaves | `GET /api/student/leaves`, `GET /api/settings` | Submit new leave request, view existing requests | from/to dates (required), reason (required), destination (required) | loading, error (already has open leave, quota exhausted), success (request submitted) | fully-implemented |
| 6 | `/student/entry-exit` | StudentEntryExit | Yes (student token) | Entry/exit layout | Student's entry/exit records | `GET /api/student/entry-exit` | — | — | loading, data, empty | fully-implemented |
| 7 | `/student/complaints` | StudentComplaints | Yes (student token) | Complaints layout | Student's complaints, complaint history | `GET /api/student/complaints`, `GET /api/complaints/${id}/history` | Register new complaint, view complaint details/history | complaintType (required), complaintDetails (required), preferredVisitingHours (required), VISITING_HOURS options | loading, error, success (complaint registered), empty (no complaints) | fully-implemented |
| 8 | `/student/attendance` | StudentAttendance | Yes (student token) | Attendance layout | Student's attendance records | `GET /api/student/attendance` | — | — | loading, data, empty | fully-implemented |
| 9 | `/student/notices` | StudentNotices | Yes (student token) | Notices layout | Notices visible to students (audience: all, students, boys, girls) | `GET /api/notices` | — | — | loading, data, empty | fully-implemented |
| 10 | `/student/mess-menu` | StudentMessMenu | Yes (student token) | Mess layout | Weekly mess menu (breakfast, lunch, snacks, dinner, milk) | `GET /api/mess-menu` | — | — | loading, data, empty (today's menu may be null) | fully-implemented |
| 11 | `/student/mess-feedback` | StudentMessFeedback | Yes (student token) | Mess feedback layout | Student's mess feedback records | `GET /api/student/mess/feedback` | — | — | loading, data, empty | fully-implemented |

---

### Warden Routes

| # | URL | Component | Auth Required | Layout | Data Fetched | API Endpoint | Actions | Forms | States | Implementation |
|---|-----|-----------|--------------|--------|--------------|--------------|---------|-------|--------|----------------|
| 1 | `/warden/dashboard` | WardenDashboard | Yes (warden token) | Dashboard layout | Hostel stats, room occupancy, student counts, allocation stats, complaint stats, leave stats, block occupancy charts | `GET /api/warden/dashboard` | — | — | loading, error, success | fully-implemented |
| 2 | `/warden/allocations` | WardenAllocations | Yes (warden token) | Allocations layout | All allocations, filtered by warden's hostel, with status filtering | `GET /api/allocations` | — | — | loading, data, pagination | fully-implemented |
| 3 | `/warden/rooms` | WardenRooms | Yes (warden token) | Rooms layout | Rooms in warden's hostel, with occupants and inventory | `GET /api/rooms`, `GET /api/blocks` | — | — | loading, data, empty | fully-implemented |
| 4 | `/warden/students` | WardenStudents | Yes (warden token) | Students layout | Students in warden's hostel | `GET /api/students` | — | — | loading, data, pagination, search | fully-implemented |
| 5 | `/warden/leaves` | Leaves | Yes (warden token) | Leaves layout | Leave requests for warden's hostel students | `GET /api/leaves` | — | — | loading, data, pagination, status filters (all/pending/active) | fully-implemented |
| 6 | `/warden/entry-exit` | WardenEntryExit | Yes (warden token) | Entry/exit layout | Entry/exit records, filterable by studentId and date | `GET /api/entry-exit`, `GET /api/student/entry-exit` | — | — | loading, data, pagination | fully-implemented |
| 7 | `/warden/attendance` | WardenAttendance | Yes (warden token) | Attendance layout | Attendance register for warden's hostel students, date/block filtering | `GET /api/warden/attendance/register`, `PUT /api/warden/attendance/register` | Mark attendance for students | date (required), blockId (optional), records (array of studentId + status) | loading, error, success | fully-implemented |
| 8 | `/warden/complaints` | WardenComplaints | Yes (warden token) | Complaints layout | Complaints for warden's hostel students, with action history | `GET /api/complaints`, `GET /api/complaints/${id}/history` | Action complaint (status + remark) | complaintId (path), status (required), remark | loading, error, success | fully-implemented |
| 9 | `/warden/mess-menu` | MessMenu | Yes (warden token) | Mess layout | Weekly mess menu | `GET /api/mess-menu` | Edit mess menu | day (required), breakfast/lunch/snacks/dinner/milk | loading, error, success | fully-implemented |
| 10 | `/warden/notices` | Notices | Yes (warden token) | Notices layout (admin) | Notices with warden-audience filtering | `GET /api/notices`, `POST /api/notices` | Create notice | title (required), body (required), category, audience, date, expiryDate, priority | loading, error, success | fully-implemented |
| 11 | `/warden/notifications` | NotificationsList | Yes (warden token) | Notifications layout | Notifications scoped to warden's view | `GET /api/notifications` | — | — | loading, unreadCount, success | fully-implemented |

---

### Admin Routes

| # | URL | Component | Auth Required | Layout | Data Fetched | API Endpoint | Actions | Forms | States | Implementation |
|---|-----|-----------|--------------|--------|--------------|--------------|---------|-------|--------|----------------|
| 1 | `/admin/dashboard` | Dashboard | Yes (admin token) | Dashboard layout | Hostel statistics, occupancy by gender, pending allocations, waitlisted count, complaints, total students | `GET /api/admin/dashboard` | — | — | loading, error, success | fully-implemented |
| 2 | `/admin/hostels` | Hostels | Yes (admin token) | Hostel list layout | All hostels with wings (blocks), rooms, occupancy | `GET /api/hostels`, `GET /api/hostels/:id` | Create, edit, delete hostel | name (required), code, gender, type, campus, address, seats, roomCount, note | loading, error, success | fully-implemented |
| 3 | `/admin/hostels/:id` | HostelDetail | Yes (admin token) | Hostel detail layout | Hostel detail with wings and rooms | `GET /api/hostels/:id` | — | — | loading, error (not found), success | fully-implemented |
| 4 | `/admin/rooms` | Rooms | Yes (admin token) | Room list layout | All rooms with filtering (hostel, status, type, search), occupancy status | `GET /api/rooms`, `GET /api/rooms/:id` | Create, edit, update status, delete room | hostelId (required), blockId (required), floor, roomNo, type, seater, status, medicalReserved | loading, error, success | fully-implemented |
| 5 | `/admin/room-detail` | RoomDetail | Yes (admin token) | Room detail layout | Room detail with wing, hostel, occupants, inventory | `GET /api/rooms/:id` | — | — | loading, error, success | fully-implemented |
| 6 | `/admin/allocation` | Allocations | Yes (admin token) | Allocation layout | All hostel allocations with status filtering | `GET /api/allocations` | — | — | loading, data, pagination, status filter | fully-implemented |
| 7 | `/admin/allocation/waitlist` | WaitingList | Yes (admin token) | Allocation layout | Waitlisted allocations | `GET /api/allocations?status=waitlisted` | — | — | loading, data, pagination | fully-implemented |
| 8 | `/admin/allocation/history` | AllocationHistory | Yes (admin token) | Allocation layout | Allocation history with decisions and changes | `GET /api/allocations` (implied) | — | — | loading, data, pagination | fully-implemented |
| 9 | `/admin/students` | Students | Yes (admin token) | Student list layout | All students with search, view details, edit, delete | `GET /api/students`, `GET /api/students/:id`, `POST /api/students`, `PUT /api/students/:id`, `DELETE /api/students/:id`, `PUT /api/students/:id/room` | Create student, edit student, delete student, assign room to student | regNo (required), name (required), gender, year, course, contactno, emailid, guardianName, guardianRelation, guardianContactno, hostelId (warden-only), room assignment | loading, error, success, 409 duplicate regNo | fully-implemented |
| 10 | `/admin/wardens` | Wardens | Yes (admin token) | Warden list layout | All wardens with hostel/block assignments | `GET /api/wardens`, `POST /api/wardens`, `PUT /api/wardens/:id`, `DELETE /api/wardens/:id` | Create, edit, delete warden | name (required), email (required), hostelId, blockId | loading, error, success | fully-implemented |
| 11 | `/admin/entry-exit` | EntryExit | Yes (admin token) | Entry/exit layout | Entry/exit records (system-wide if admin) | `GET /api/entry-exit` | — | — | loading, data, pagination | fully-implemented |
| 12 | `/admin/complaints` | Complaints | Yes (admin token) | Complaints layout | All complaints system-wide with status filtering | `GET /api/complaints`, `GET /api/complaints/:id`, `POST /api/complaints`, `POST /api/complaints/:id/action` | Create complaint, action complaint (status + remark) | complaintType (required), complaintDetails (required), preferredVisitingHours | loading, error, success | fully-implemented |
| 13 | `/admin/inventory` | Inventory | Yes (admin token) | Inventory layout | Inventory items across hostels/rooms | `GET /api/inventory`, `POST /api/inventory`, `PUT /api/inventory/:id`, `DELETE /api/inventory/:id` | Add, edit, delete inventory item | hostelId (required), roomId, item (required), quantity (required), condition, status, assignedTo | loading, error, success | fully-implemented |
| 14 | `/admin/housekeeping` | Housekeeping | Yes (admin token) | Housekeeping layout | Housekeeping tasks with filtering by hostel | `GET /api/housekeeping`, `POST /api/housekeeping`, `PUT /api/housekeeping/:id` | Create, update, delete housekeeping task | hostelId (required), taskType, area, assignedTo, schedule, status, inspected, rating | loading, error, success | fully-implemented |
| 15 | `/admin/mess` | Mess | Yes (admin token) | Mess layout | Mess module (feedback, complaints, inspections, menu) | `GET /api/mess/feedback`, `GET /api/mess/complaints`, `GET /api/student/mess/complaints`, `POST /api/mess/feedback`, `GET /api/mess/complaints`, `GET /api/student/mess/complaints`, `POST /api/mess/complaints`, `GET /api/mess/inspections`, `POST /api/mess/inspections`, `PUT /api/mess-menu/:id`, `GET /api/mess-menu` | Submit feedback, submit complaint, resolve complaint, record inspection, update menu | feedback: taste/quantity/hygiene/variety/temperature/overall/comment; complaint: subject/details; menu: day/breakfast/lunch/snacks/dinner/milk | loading, error, success | fully-implemented |
| 16 | `/admin/wifi` | Wifi | Yes (admin token) | Wi-Fi layout | Wi-Fi access points per hostel, updatable status/issues | `GET /api/wifi`, `PUT /api/wifi/:id` | Update access point status/issues | hostelId (query), accessPoint, status, downtime, issues | loading, error, success | fully-implemented |
| 17 | `/admin/medical` | Medical | Yes (admin token) | Medical layout | Medical dispensary info and incidents | `GET /api/medical`, `PUT /api/medical/dispensary`, `POST /api/medical/incidents`, `PUT /api/medical/incidents/:id` | Update dispensary, record medical incident | doctor, nurse, contactno, ambulance (dispensary); studentId, date, type, description, parentNotified (incident) | loading, error, success | fully-implemented |
| 18 | `/admin/committee` | Committee | Yes (admin token, warden token) | Committee layout | Committee members and meetings | `GET /api/committee`, `POST /api/committee/meetings`, `PUT /api/committee/meetings/:id` | View members/meetings, create meeting, update meeting | meeting: date, agenda, decisions, actionItems | loading, error, success | fully-implemented |
| 19 | `/admin/audit-logs` | AuditLogs | Yes (admin token) | Audit log layout | System audit logs with filtering (actor, entity, action, date) | `GET /api/audit-logs` | — | — | loading, data, filtering by query params | fully-implemented |
| 20 | `/admin/settings` | Settings | Yes (admin token) | Settings layout | System settings (hostelName, messDinnerTime, wardenContact, in/out times, leaveTotal) | `GET /api/settings`, `PUT /api/settings` | Update settings | hostelName, messDinnerTime, wardenContact, summerInTime, winterInTime, girlsInTime, leaveTotal | loading, error, success | fully-implemented |
| 21 | `/admin/notifications` | NotificationsList | Yes (admin token) | Notifications layout | All notifications visible to admin | `GET /api/notifications` | — | — | loading, unreadCount, success | fully-implemented |

---

### Portal (Non-authenticated) Routes

| # | URL | Component | Auth Required | Layout | Data Fetched | API Endpoint | Actions | Forms | States | Implementation |
|---|-----|-----------|--------------|--------|--------------|--------------|---------|-------|--------|----------------|
| 1 | `/mess/dashboard` | MessDashboard | Yes (mess_manager/warden/admin token) | Dashboard layout | Mess dashboard data | `GET /api/mess/feedback`, `GET /api/mess/complaints`, `GET /api/student/mess/complaints`, `GET /api/mess/inspections` | — | — | loading, data | fully-implemented |
| 2 | `/mess/menu` | MessMenuEdit | Yes (mess_manager/warden/admin token) | Mess layout | Weekly mess menu, editable | `GET /api/mess-menu`, `PUT /api/mess-menu/:id` | Edit menu | day (required), breakfast/lunch/snacks/dinner/milk | loading, error, success | fully-implemented |
| 3 | `/mess/feedback` | MessFeedback | Yes (student/warden/mess_manager token) | Mess feedback layout | Mess feedback records | `GET /api/mess/feedback`, `GET /api/student/mess/feedback` | — | — | loading, data, empty | fully-implemented |
| 4 | `/mess/complaints` | MessComplaints | Yes (student/warden/mess_manager token) | Mess complaints layout | Mess complaints | `GET /api/mess/complaints`, `GET /api/student/mess/complaints`, `POST /api/mess/complaints` | Submit mess complaint | subject (required), details (required) | loading, error, success | fully-implemented |
| 5 | `/mess/inspections` | MessInspections | Yes (mess_manager/warden/admin token) | Inspections layout | Mess inspection records | `GET /api/mess/inspections`, `POST /api/mess/inspections` | Record inspection | date (required), area (required), hygiene (required), remarks | loading, error, success | fully-implemented |
| 6 | `/housekeeping/dashboard` | HousekeepingDashboard | Yes (housekeeping/caretaker token) | Dashboard layout | Housekeeping tasks | `GET /api/housekeeping`, `GET /api/housekeeping/tasks` | — | — | loading, data | fully-implemented |
| 7 | `/housekeeping/tasks` | HousekeepingTasks | Yes (housekeeping/caretaker token) | Tasks layout | Housekeeping tasks list | `GET /api/housekeeping` | — | — | loading, data, pagination | fully-implemented |
| 8 | `/caretaker/dashboard` | CaretakerDashboard | Yes (caretaker token) | Dashboard layout | Caretaker-specific dashboard | (no direct API — may use `housekeeping` endpoints) | — | — | — | ui-only / partially |
| 9 | `/parent/dashboard` | ParentDashboard | Yes (parent token) | Dashboard layout | Ward's records (student, room, attendance, leaves, notices) | `GET /api/parent/ward` | — | — | loading, data, error | fully-implemented |

---

### Security Routes

| # | URL | Component | Auth Required | Layout | Data Fetched | API Endpoint | Actions | Forms | States | Implementation |
|---|-----|-----------|--------------|--------|--------------|--------------|---------|-------|--------|----------------|
| 1 | `/security/dashboard` | SecurityDashboard | Yes (security token) | Dashboard layout | Security dashboard data | (inspect source) | — | — | — | needs verification |
| 2 | `/security/entry-exit` | SecurityEntryExit | Yes (security token) | Entry/exit layout | Entry/exit records | `GET /api/entry-exit` | — | — | loading, data, pagination | fully-implemented |

---

### Navigation & Routing Behaviour

#### Role-Based Home Route
- `HOME_FOR_ROLE` in `navigation.jsx` maps each role to its home path:
  - admin → `/admin/dashboard`
  - warden → `/warden/dashboard`
  - chief_warden/deputy_warden → `/warden/dashboard`
  - caretaker → `/caretaker/dashboard`
  - mess_manager → `/mess/dashboard`
  - security → `/security/dashboard`
  - housekeeping → `/housekeeping/dashboard`
  - student → `/student/dashboard`
  - parent → `/parent/dashboard`

#### Portal Role Mapping
- `PORTAL_FOR_ROLE` maps UI roles to API token roles:
  - admin → `admin`
  - warden/chief/deputy/assistant → `warden`
  - caretaker → `caretaker`
  - mess_manager → `mess`
  - security → `security`
  - housekeeping → `housekeeping`
  - student → `student`
  - parent → `parent`

#### Navigation per Role
- `NAV` defines sidebar navigation items per role (admin has the most, parent/caretaker/security have minimal)
- `navForRole(role)` returns the appropriate NAV array

#### Protected Route Guard
- `ProtectedRoute.jsx` — checks `isAuthenticated` from AuthContext; if not, redirects to `/login`
- Routes wrapped with `AuthProvider` context

#### Login Flow
1. User submits login form → `Login.jsx` → `authApi.login()` → `POST /api/auth/login`
2. Backend verifies credentials via bcrypt → returns `{ token, user: publicUser(user) }`
3. `useAuth().login(token, user)` stores token + user in localStorage + state
4. `message.success(`Welcome, ${data.user.name}`)` — success notification
5. `navigate(HOME_FOR_ROLE[data.user.role], { replace: true })` — redirect to role home
6. Demo quick-login accounts: admin (admin/admin123), warden (warden/warden123), student (student/student123)

#### Logout Flow
1. User clicks logout → `useAuth().logout()` → `authApi.logout()` → `POST /api/auth/logout`
2. Backend increments `user.tokenVersion` → invalidates old token
3. `clearSession()` — removes token, expiry, user from localStorage, sets state to null
4. Redirects to `/login`

#### Direct URL Navigation
- If user types a URL directly (e.g., `/student/dashboard`) without a valid token:
  - Route component calls `useAuth()` or `resourceApi.get()` which triggers API call
  - Backend `getUser()` returns null (no Bearer token or invalid token)
  - Frontend receives 401 or 403 response
  - `StudentDashboard` — if `!data` renders "No student record linked to this account yet"
  - `AdminDashboard` — if `!data` or error shows Alert
  - `NotificationsContext` — session check `isSessionValid()` → if expired, `clearSession()`
  - `AuthProvider` session expiry check every 60 seconds

#### Refresh Behavior
- On page refresh, `AuthProvider` reads from localStorage on mount
- `isSessionValid()` checks token + expiry — if valid, user stays authenticated
- `NotificationsContext` re-fetches notifications on mount if `isAuthenticated && token`
- If token expired before refresh, user is logged out and redirected to `/login`

#### Unauthorized Redirection
- 401 → unauthenticated (no/Invalid token) → redirect to `/login`
- 403 → authenticated but insufficient role → depends on route:
  - Admin routes: `user.role !== 'admin'` → `fail(res, 'Forbidden', 403)`
  - Student routes: `student.regNo !== user.regNo` → `fail(res, 'Forbidden', 403)`
  - Warden routes: `student.hostelId !== user.hostelId` → `fail(res, 'Student is outside your authorized hostel', 403)`
  - General: redirects or shows error message

#### Role-Based Navigation
- Sidebar NAV items vary by role via `navForRole(role)`
- Some roles share navigation (chief/deputy/assistant warden all map to `warden` portal)
- `PORTAL_FOR_ROLE` determines which backend role is used for API calls

#### Duplicate/Unreachable Routes
- `/admin/ allocation/history` — route exists in AdminRoutes but may not have a dedicated page component yet (lazy-loaded import)
- `/warden/mess` and `/admin/mess` — same component shared between warden and admin (lazy import from `../pages/admin/Mess`)
- Portal routes for caretaker, housekeeping, security, parent are defined but some may have limited functionality

#### Missing Routes (identified by code inspection)
- No route for "mess manager" specific dashboard (mess_manager NAV item exists but no dedicated route — may use `/mess/dashboard`)
- No route for "chief warden" or "deputy warden" separately — all map to warden dashboard
- No student route for "view all hostels" or "browse hostels"
- No route for "view allocation history" at student level beyond `myAllocation`

#### Summary of Frontend Routes Count
- **Auth**: 1 route (`/login`)
- **Student**: 11 routes
- **Warden**: 11 routes
- **Admin**: 21 routes
- **Portal**: 9 routes (mess, housekeeping, caretaker, parent, security)
- **Security**: 2 routes
- **Total**: ~55 distinct frontend routes

*Note: Some routes are duplicated across admin/warden (same component shared), and lazy imports may not all have corresponding page files yet.*