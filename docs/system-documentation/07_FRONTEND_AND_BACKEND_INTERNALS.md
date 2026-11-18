# 07_FRONTEND_AND_BACKEND_INTERNALS.md

## Frontend-Backend Internals — Components, Context, Middleware, Controllers, Services, and Data Flow

This document explains how frontend data flows from API responses into the displayed UI, and how backend components process requests.

---

### Frontend Architecture

#### 1. Component Hierarchy

**Root layout**: App wraps all pages with `<AuthProvider>` and `<NotificationsProvider>`

**Page components** (in `frontend/src/pages/`):
- `auth/Login.jsx` — login form, demo quick-login accounts
- `student/StudentDashboard.jsx` — dashboard stats, allocation, complaints, notices, mess menu
- `student/StudentProfile.jsx` — profile details Descriptions
- `student/StudentLeave.jsx` — leave requests, quota, table with history
- `student/StudentComplaints.jsx` — register complaint, view history, timeline actions
- `student/StudentAttendance.jsx` — attendance summary + data table
- `student/StudentMessMenu.jsx` — weekly mess menu table
- `student/StudentMessFeedback.jsx` — student's mess feedback table
- `warden/WardenDashboard.jsx` — warden hostel stats, charts
- `warden/WardenStudents.jsx` — students in hostel
- `warden/WardenAllocations.jsx` — allocations list
- `warden/WardenRooms.jsx` — rooms with occupants/inventory
- `warden/Leaves.jsx` — leaves list for hostel students
- `warden/WardenEntryExit.jsx` — entry/exit records
- `warden/WardenAttendance.jsx` — attendance register
- `warden/WardenComplaints.jsx` — complaints with action history
- `warden/MessMenu.jsx` — edit mess menu
- `warden/Notices.jsx` — create/manage notices
- `admin/Dashboard.jsx` — hostel stats, charts, hostel table
- `admin/Students.jsx` — students CRUD, drawer detail, add/edit modals
- `admin/Hostels.jsx` / `HostelDetail.jsx` — hostel management
- `admin/Rooms.jsx` / `RoomDetail.jsx` — room management
- `admin/Allocations.jsx` / `WaitingList.jsx` / `AllocationHistory.jsx` — allocation management
- `admin/Complaints.jsx` — complaints system-wide
- `admin/Inventory.jsx` / `Housekeeping.jsx` — inventory and tasks
- `admin/Mess.jsx` — mess module (feedback, complaints, inspections, menu)
- `admin/Wifi.jsx` — Wi-Fi APs
- `admin/Medical.jsx` — medical dispensary and incidents
- `admin/Committee.jsx` — committee members and meetings
- `admin/AuditLogs.jsx` — audit log viewing
- `admin/Settings.jsx` — system settings
- `admin/Reports.jsx` — admin reports
- `entry-exit/EntryExit.jsx` — entry/exit management
- `mess/MessDashboard.jsx`, `MessMenuEdit.jsx`, `MessFeedback.jsx`, `MessComplaints.jsx`, `MessInspections.jsx`
- `caretaker/CaretakerDashboard.jsx`
- `parent/ParentDashboard.jsx`
- `security/SecurityDashboard.jsx`, `SecurityEntryExit.jsx`

**Route components** (lazy-loaded in `frontend/src/routes/`):
- `AdminRoutes.jsx` — 28 routes under `/admin/...`
- `WardenRoutes.jsx` — 11 routes under `/warden/...`
- `StudentRoutes.jsx` — 11 routes under `/student/...`
- `PortalRoutes.jsx` — portal routes for mess, housekeeping, caretaker, parent, security
- `PortalRoutes.jsx` — `portalRoutes` object with nested routes

#### 2. Context Providers

**AuthProvider** (`frontend/src/context/AuthContext.jsx`):
- Manages `token`, `user`, `isAuthenticated` state
- `login(token, user)`: stores token + user in `localStorage` + state
- `logout()`: calls `authApi.logout()` → increments `tokenVersion` on backend, then clears session
- `isSessionValid()`: checks token + expiry (24h) from localStorage
- Session expiry check: `setInterval(check, 60 * 1000)` — every 60 seconds
- On invalid session → `clearSession()` → user redirected out
- Value: `{ token, user, isAuthenticated, login, logout, toggleSidebar, sidebarOpen }`

**NotificationsProvider** (`frontend/src/context/NotificationsContext.jsx`):
- Polls `/api/notifications` every 30 seconds (`POLL_INTERVAL = 30000`)
- Manages `items` (all notifications), `unreadCount`, `loadedForToken`
- `refresh()`: `resourceApi.get('/notifications')` — fetches scoped notifications
- On 401 during refresh → `logout()` + return
- `addNotification(item)`: prepends to state, increments `unreadCount`
- `markAllRead()`: marks all items as read, sets `unreadCount: 0`
- `markRead(id)`: marks single item as read
- Focus visibility change listener: `document.addEventListener('visibilitychange', handleFocus)` → refresh on foreground
- Value: `{ items, unreadCount, setNotifications, refresh, addNotification, markAllRead, markRead }`

#### 3. Hooks

**`useResource(path)`** (`frontend/src/hooks/useResource.js`):
- Manages state: `data`, `loading`, `error`, `reload`
- On mount: `resourceApi.get(path)` — fetches data
- On success: sets `data`, clears `error`
- On error: sets `error`, keeps previous data or empty array
- `reload()`: increments `requestVersion` to force refetch
- Returns: `data`, `loading`, `error`, `reload`
- **Data flow**: API response → `setState` → `data` in state → component re-renders with UI

**`useTableFilter(data, searchKeys, filterKey)`** (`frontend/src/hooks/useTableFilter.js`):
- Manages `query` (search string) and `filterValue` (single filter)
- `filtered`: memoized computed `data.filter(...)` based on query/filter
- Returns: `{ query, setQuery, filterValue, setFilterValue, filtered }`
- **Used by**: Student complaints, student leaves, admin students, warden students

#### 4. API Client (`frontend/src/api/client.js`)

**`apiFetch(path, options)`**:
- Reads token from `localStorage.getItem(TOKEN_KEY)`
- Adds `Authorization: Bearer <token>` if token exists
- Sets `Content-Type: application/json` (unless body is `FormData`)
- `fetch(`${API_BASE}${path}`, { ...options, headers })`
- On `!response.ok`: tries `response.json()`, extracts `body.message`, throws `Error` with `error.status`
- Returns `response.json()` on success

**`authApi`**:
- `login(payload)`: `apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) })`
- `me()`: `apiFetch('/auth/me')`
- `logout()`: `apiFetch('/auth/logout', { method: 'POST' })`

**`resourceApi`**:
- `get(path)`: `apiFetch(path)`
- `getById(path, id)`: `apiFetch(`${path}/${id}`)`
- `post(path, payload)`: `apiFetch(path, { method: 'POST', body: JSON.stringify(payload) })`
- `create(path, payload)`: alias for `post`
- `patch(path, id, payload)`: `apiFetch(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })`
- `put(path, payload)`: `apiFetch(path, { method: 'PUT', body: JSON.stringify(payload) })`
- `update(path, id, payload)`: `apiFetch(`${path}/${id}`, { method: 'PUT', body: JSON.stringify(payload) })`
- `remove(path, id)`: `apiFetch(`${path}/${id}`, { method: 'DELETE' })`

**Data flow example** (StudentDashboard):
1. Component mounts → `useResource('/student/dashboard')` → `useEffect`
2. `resourceApi.get('/student/dashboard')` → `apiFetch('/student/dashboard')`
3. API client adds Bearer token from localStorage
4. Backend processes, returns dashboard data JSON
5. `.then(result) => setData(result)` — sets state, triggers re-render
6. UI renders: stats cards, allocation, recent complaints, recent notices, today's mess menu

#### 5. Page Structure and Data Flow

**StudentDashboard** data flow (as coded in the component):

```
Component mount
  ↓
useResource('/student/dashboard') → resourceApi.get('/student/dashboard')
  ↓
API call: GET /api/student/dashboard (with Bearer token)
  ↓
Backend: studentScope(req) → prisma queries (complaints, leaves, attendance, allocation, messMenu, notices, room, hostels)
  ↓
Response: { stats, student, allocation, todayMess, recentComplaints, recentNotices }
  ↓
.setData(result) → state.data = result
  ↓
Component re-renders
  ↓
Render: stats row (complaintsOpen, leavesPending, attendancePresent, attendanceAbsent, attendancePct),
         allocation card, recent complaints list, recent notices list
```

**Key observation**: The `useResource` hook's `data` state flows directly into the JSX via the component's render method. No separate state management library (like Redux) — React context + useState/useEffect suffices.

---

### Backend Architecture

#### 1. Express App Initialization (`backend/src/app.js`)

**Middleware ordering** (critical for security and functionality):

1. `app.use(helmet())` — security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, etc.)
2. `app.use(cors(corsOptions))` — CORS with origin check, credentials, allowed methods/headers
   - `origin(origin, callback)`: allows localhost:5173, Vercel deployment, and `CORS_ORIGIN` env var
   - `credentials: true` — allows cookies/auth headers
   - `methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']`
   - `allowedHeaders: ['Content-Type', 'Authorization']`
3. `app.use(express.json({ limit: '2mb' }))` — parse JSON bodies up to 2MB
4. **Rate limiters** (only in production `NODE_ENV === 'production'`):
   - `app.use('/api', generalLimiter)`: 1000 requests / 15 min
   - `app.use('/api/auth/login', loginLimiter)`: 10 requests / 15 min
5. `app.use('/api', router)` — mount all API routes
6. **Static serving** (if client build exists):
   - `app.use(express.static(distDir))` — serve built client assets
   - Catch-all: `res.sendFile(path.join(distDir, 'index.html'))` for non-API GET routes
7. **Error handler**:
   - `app.use((err, req, res, next) => { console.error(err); res.status(500).json({ message: 'Internal server error' }) })`
8. **404 handler**:
   - `app.use((req, res) => res.status(404).json({ message: 'Not found' }))`

**Key observation**: CORS must come before routes (comment in code: `// CORS MUST come before routes`). Rate limiters only active in production.

#### 2. Route Registration (`backend/src/routes/index.js`)

**Router wrapper** (`routes/index.js:15-19`):
```javascript
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
  const original = router[method].bind(router)
  router[method] = (...args) => original(args[0], ...args.slice(1).map((arg) => (typeof arg === 'function' ? wrap(arg) : arg)))
}
```
- Wraps async route handlers so errors are caught by Express error handler instead of crashing
- `wrap` catches rejected promises and passes to `next(err)`

**Auth helpers** (`routes/index.js:45-104`):
- `getUser(req)`: extracts JWT from `Authorization: Bearer <token>` header, verifies via `verifyToken()`, validates `tokenVersion` against DB → sets `req.user`
- `adminUser(req)`: `getUser(req)` + `user.role === 'admin'` → 403 if false
- `wardenUser(req)`: `getUser(req)` + `WARDEN_ROLES.includes(user.role)` → 401 if not warden
- `roleUser(req, roles)`: `getUser(req)` + `roles.includes(user.role)` → general role check
- `messUser(req)`: `roleUser(req, ['mess_manager', 'admin', ...WARDEN_ROLES])`
- `staffHostelUser(req)`: `getUser(req)` + `['caretaker', 'housekeeping'].includes(user.role) && user.hostelId`
- `guardUser(req)`: `getUser(req)` + `admin or security or WARDEN_ROLES`
- `parentUser(req)`: `roleUser(req, ['parent'])`
- `studentScope(req)`: `getUser(req)` + `role === 'student' + regNo match` → returns `prisma.student.findUnique({ where: { regNo: user.regNo } })`

**Data helpers** (`routes/index.js:107-251`):
- `roomOccupancyMap()`: Map<roomId, [students]> — used for capacity checking
- `roomStatusLabel(room, occupants)`: returns status label
- `complaintStatusFilter`: filter objects for new/inprocess/closed/all
- `countBy(arr, fn)`: reduce to counts by key
- `studentActiveAllocation(student)`: `prisma.allocation.findFirst({ where: { studentId, status: { notIn: ['rejected', 'cancelled'] } }, orderBy: { id: 'desc' } })`
- `eligibleHostels(student)`: filters hostels by gender + year level
- `findRoomFor(student, roomType, hostelId, occ)`: finds first available room
- `doAllocate(allocation, room, actorName, occ, meta)`: complex allocation — updates allocation, room status, student data, audit log, notification
- `addNotification(title, description, opts)`: creates `prisma.notification`
- `auditMeta(req)`: `{ actorId, actorRole, ip, userAgent }` from request
- `logAudit(actor, action, entity, target, before, after, meta)`: creates `prisma.auditLog`
- `paginate(req, model, args)`: pagination from query params (`page`, `pageSize`)

#### 3. Controllers and Service Layer

**Pattern**: Route handlers are inline in `routes/index.js` — no separate controller directory. Each handler:
1. Calls auth middleware (`getUser`, `adminUser`, etc.)
2. Performs Prisma queries
3. Performs business logic (occupancy calculation, room finding, etc.)
4. Creates audit log and/or notifications as side effects
5. Returns `ok(res, body)` or `fail(res, message, status)`

**No separate service layer** — all logic inline in route handlers. This is pragmatic for the project size but means handlers have significant complexity (e.g., `doAllocate` is 35+ lines with multiple Prisma operations).

#### 4. Prisma Client Initialization (`backend/src/prisma.js`)

```javascript
export const prisma = new PrismaClient(
  testDatabaseUrl ? { datasourceUrl: testDatabaseUrl } : undefined
)
```

- `testDatabaseUrl` detected via `getTestDatabaseUrl()`:
  - If `VITEST === 'true'` or `NODE_ENV === 'test'` → use `TEST_DATABASE_URL` env var
  - `TEST_DATABASE_URL` must be PostgreSQL with `test` in database name
  - Otherwise → use `DATABASE_URL` (production DB)
- This means vitest tests use a disposable test database, not production

**`createApp()`** (`app.js:123`): creates Express app each time (for test isolation via `supertest`)

#### 5. Error Handling

**Backend**:
- Route handlers: `ok(res, body)` / `fail(res, message, status)` — consistent JSON responses
- Try/catch in each handler; Prisma errors caught and converted:
  - `P2002` (unique constraint) → 409 "A student with this registration number already exists"
  - Record not found → 404
  - Other Prisma errors → 500 "Internal server error"
- Global error handler (`app.js:158-171`):
  - `console.error('Server error:', err.message)`
  - Catches CORS errors → 403 with message
  - Otherwise → 500 "Internal server error"
- 404 handler: `res.status(404).json({ message: 'Not found' })`

**Frontend**:
- `apiFetch` throws on non-2xx with `error.status` and `error.message`
- `.catch()` in components: displays `message.error(error.message)` via Ant App
- `useResource` state: `loading`, `error`, `data`
- `AuthContext`: session expiry → `clearSession()` → redirect to `/login`
- `NotificationsContext`: 401 → `logout()`

#### 6. Request Validation

**Backend**: Explicit validation in each handler — no centralized validator (like Joi/express-validator)
- Check required fields: `if (typeof rawIdentifier !== 'string' || !rawIdentifier.trim() || typeof password !== 'string' || !password)` → 400
- Check role: `if (user.role !== 'admin')` → 403
- Check existence: `if (!hostel) return fail(res, 'Hostel not found', 404)`
- Check status: `if (allocation.status !== 'approved')` → 400 "Only approved or waitlisted applications can be allocated"
- Custom validation: `eligibleHostels(student)` checks gender/year; `findRoomFor` checks capacity

**Frontend**: Ant Design Form validation rules (`rules={[{ required: true, message: '...' }]}`)
- Also manual checks: `if (!newStudent.regNo || !newStudent.name) { message.error('...'); return }`
- No schema validation library

#### 7. Logging

**`logAudit(actor, action, entity, target, before, after, meta)`** (`routes/index.js:224-240`):
```javascript
async function logAudit(actor, action, entity, target, before, after, meta = {}) {
  return prisma.auditLog.create({
    data: {
      actor,
      action,
      entity,
      target,
      before: before ?? '-',
      after: after ?? '-',
      actorId: meta.actorId ?? null,
      actorRole: meta.actorRole ?? null,
      ip: meta.ip ?? null,
      userAgent: (req?.headers?.['user-agent'] || '').slice(0, 255) || null,
      timestamp: now(),
    },
  })
}
```
- Recorded for: student creation, student update, student room assignment, warden creation, hostel update, allocation decisions, complaints actions, leave decisions, notice changes, settings updates, etc.
- `actor`: name string (e.g., 'Admin', 'Warden', student name)
- `actorId`: User.id or Student.id
- `actorRole`: 'admin', 'warden', 'student', 'parent'
- `entity`: model name (e.g., 'Student', 'Allocation', 'Notice')
- `target`: entity name or ID (e.g., student name, allocation ID)
- `before`: state before change (usually '-')
- `after`: state after change
- `ip`: `req.ip`
- `userAgent`: truncated `req.headers['user-agent']`
- `timestamp`: `now()` = `new Date().toISOString().slice(0, 19).replace('T', ' ')`

#### 8. CORS Configuration

**`backend/src/app.js:76-107`**:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://hostel-management-v2.vercel.app',
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : []),
].filter(Boolean)

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true)  // allow requests without Origin (health checks)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error(`CORS not allowed for origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
```

- Development: `http://localhost:5173` (Vite default)
- Production: `https://hostel-management-v2.vercel.app`
- Custom: `CORS_ORIGIN` env var (comma-separated)
- `credentials: true` — allows cookies/auth headers with CORS
- `app.options('*', cors(corsOptions))` — handles preflight OPTIONS requests

#### 9. Health Check and Deployment

**Not explicitly exposed** as a dedicated `/health` endpoint, but the Express app serves:
- `GET /api/auth/me` — can serve as liveness check (requires auth)
- 404 handler returns JSON `{ message: 'Not found' }`
- In production with client build: non-API GET routes served as HTML (`frontend/dist/index.html`)

**Build/Start commands** (`backend/package.json`):
- `dev`: `node --watch src/index.js` — nodemon-like auto-reload
- `start`: `node src/index.js` — production start
- `build`: `npx prisma generate && npx prisma migrate deploy && node --check src/index.js` — generate Prisma client, deploy migrations, type-check

**Frontend** (`frontend/package.json`):
- `dev`: `vite` — dev server at `localhost:5173`
- `build`: `vite build` — produces `frontend/dist/`
- `preview`: `vite preview` — local preview of build

**Deployment flow**:
1. Frontend: `npm run build` → `frontend/dist/` (static HTML/JS/CSS)
2. Deploy to Vercel (automatic from `frontend/` directory, or configured)
3. Backend: `npm run build` on Render → Prisma migrations deployed, Express app starts
4. PostgreSQL database persists on Render (or external RDS)
5. Environment variables set in Render/Vercel dashboards: `DATABASE_URL`, `JWT_SECRET`, `BCRYPT_ROUNDS`, `PORT`, `CORS_ORIGIN`

---

### Data Flow: From API Response to UI

**General pattern** (same for all pages):

1. **Component mounts** → `useEffect` → `useResource(path)` or direct `resourceApi.get(path)`
2. **API call** → `apiFetch(path)` → fetches with Bearer token
3. **Backend processes** → Prisma queries → returns JSON
4. **Success callback** → `setState` or `.then(result => ...)`
5. **State update** → React re-renders component with new data
6. **UI rendering** — JSX displays data

**Specific examples**:

**StudentDashboard**:
- `useResource('/student/dashboard')` → data state → renders stats cards + allocation card + recent complaints list + recent notices list + today's mess menu

**AdminDashboard**:
- `useResource('/admin/dashboard')` → data state → renders stats cards + gender breakdown + hostel occupancy chart + hostel table

**WardenDashboard**:
- `useResource('/warden/dashboard')` → data state → renders stats cards + charts (complaints by status, leaves by status, block occupancy)

**StudentLeave**:
- `useResource('/student/leaves')` + `useResource('/settings')` → data + loading → renders quota stats + leave request form + leave requests table with search/filter

**AdminStudents**:
- `useResource('/students')` + `useResource('/hostels')` + `useResource('/blocks')` → data → renders student table with search + add student drawer + view/edit drawers

**Notification polling**:
- `NotificationsProvider` mounts → `useEffect` starts interval `setInterval(scheduleRefresh, 30000)`
- `refresh()` → `resourceApi.get('/notifications')` → sets `items` + `unreadCount` in state
- Updates badge count on sidebar/navbar

### Summary of Internal Counts

| Component | Count |
|-----------|-------|
| Frontend pages | ~45+ |
| Frontend route configurations | 5 (AdminRoutes, WardenRoutes, StudentRoutes, PortalRoutes navigation) |
| Backend API endpoints | ~85+ |
| Prisma models | 32 |
| Auth middleware functions | 8 (getUser, adminUser, wardenUser, roleUser, messUser, staffHostelUser, guardUser, parentUser) |
| Data helpers | 15+ (roomOccupancyMap, doAllocate, paginate, etc.) |
| Context providers | 2 (AuthContext, NotificationsContext) |
| Hooks | 2 (useResource, useTableFilter) |
| Audit log actions (in code) | ~25+ distinct actions |

### Known Mismatches Between Frontend, Backend, and Database

1. **`PUT /api/rooms/:id/status` missing admin check** (backend issue):
   - Frontend: Room status edit may be available to non-admin users depending on route
   - Backend: Only checks room exists, NOT admin role
   - Database: No direct impact, but allows unauthorized status changes
   - **Fix needed**: Add `adminUser(req)` check

2. **Demo credentials bypass auth** (frontend issue):
   - `DEMO_ACCOUNTS` in Login.jsx have hardcoded username/password
   - These call `authApi.login()` which does send to backend for verification
   - But the demo accounts are valid credentials that work — they're just pre-created demo data
   - Not a true bypass; legitimate demo accounts

3. **Notification audience filtering inconsistency** (backend/frontend):
   - Backend `notificationWhereFor()` for students: `{ OR: [{ audience: 'all' }, { audience: 'students' }, { userId: user.id }] }`
   - Frontend `StudentNotices` may not properly filter — need to verify the component actually calls the API and filters
   - Some notices with `audience: 'students'` may show/hide incorrectly depending on implementation

4. **`leaveUsed` update race condition** (backend):
   - `POST /api/leaves/:id/decision` reads count, then updates `student.leaveUsed`
   - Concurrent decisions could cause incorrect `leaveUsed` count
   - No transaction or locking around the update
   - Low probability in practice but possible

5. **Room allocation history not shown in student view** (frontend gap):
   - Backend stores `allocation.history` array with status changes
   - Frontend `MyAllocation` page shows only current status, not history
   - No "View allocation history" link/button in student UI

6. **Warden can create students outside hostel if they have hostelId** (access control):
   - Backend `POST /api/students` checks `!isAdmin && !user.hostelId` → 403
   - But if warden has hostelId, they can create students in that hostel — correct behavior
   - No issue identified

7. **No password reset flow** (missing functionality):
   - Users cannot reset forgotten passwords
   - Only account creation by admin/warden creates new accounts
   - This is a functional gap, not a code bug

8. **`studentScope` depends on `regNo` matching JWT `role: 'student'`** (potential issue):
   - `studentScope(req)` checks `user.role !== 'student'` → returns null
   - If a student's `regNo` is empty or null, the `prisma.student.findUnique({ where: { regNo: user.regNo } })` will fail to find a record
   - Frontend handles this: `if (!student) return ok(res, [])` for some endpoints, `404` for others
   - Inconsistent handling across endpoints

9. **CORS origin mismatch in production** (deployment issue):
   - Frontend runs on `localhost:5173` (dev) or Vercel domain (prod)
   - Backend CORS allows `https://hostel-management-v2.vercel.app`
   - If deployed to custom domain, CORS must be updated via `CORS_ORIGIN` env var
   - Development: `http://localhost:5173` allowed; production: Vercel domain allowed

10. **`tokenVersion` not initialized for new users** (schema concern):
    - `User` model has `tokenVersion Int @default(0)` — good, defaults to 0
    - But if new users created without proper initialization, tokenVersion could be null
    - Logout increment `tokenVersion: { increment: 1 }` would go from 0 → 1, which is correct
    - No issue found in code inspection

---

### Gap Analysis — Features Not Fully Verified

Based on code inspection (not runtime verification):

| Feature | Status | Notes |
|---------|--------|-------|
| Student can view allocation history | Partial | `MyAllocation` shows current allocation only; history stored in DB but not UI |
| Password reset functionality | Not implemented | No API endpoint or UI for password recovery |
| Mess menu editing by student | Not implemented | Students can only view/submit feedback, not edit menu |
| Caretaker-specific dashboard | Partial | `CaretakerDashboard` exists but may use same APIs as housekeeping |
| Committee meeting creation by warden | Partial | `committee/meetings` POST allows admin + warden, but warden scope may be limited |
| Medical incident parent notification | Partially implemented | `parentNotified` field exists; no API to toggle it after creation except full update |
| Entry/exit violation logic | Partially implemented | Late/violation flagging based on gender in-times; exact thresholds in settings |
| Report mess rating calculation | Implemented | `admin/reports` calculates average overall mess feedback rating |
| Audit log filtering by date | Implemented | `GET /api/audit-logs?date=` supports date filtering |
| Parent can view multiple wards | Not implemented | Parent linked to one ward via `studentId`; no multi-ward support |
| Inventory item assignment to specific student | Implemented | `assignedTo` field on `InventoryItem`; default 'Student' |
| Housekeeping task inspection rating | Implemented | `inspected` Boolean + `rating` 1-5 stored; warden/admin can update |
| Wi-Fi issues as JSON | Implemented | `issues: Json` field on `WifiAccessPoint`; stores issue objects |
| Security portal features | Needs verification | `SecurityDashboard` and `SecurityEntryExit` exist; API calls unverified |
| Off-campus hostel type logic | Partially implemented | `eligibleHostens` filters by `h.type === 'freshers' ? student.year === 1 : student.year > 1` |
| Block deletion cascade to rooms | Partially implemented | Prisma `onDelete: Cascade` on Block→Room; deleting block deletes its rooms |
| Student can edit own profile only | Implemented | `PUT /api/students/:id` admin only; students cannot edit their own profile via API |
| Student can update own leave status | Not implemented | Students submit leave requests; cannot change status (warden/admin only) |
| Warden can see all hostel allocations with chief role | Implemented | `chief_warden`/`deputy_warden`/`assistant_warden` included in `WARDEN_ROLES`; see all allocations |
| Mess manager can resolve complaints + record inspections | Implemented | `messUser()` includes `mess_manager`, `admin`, all `WARDEN_ROLES` |
| Block/Room status on deletion | Implemented | Room status not automatically changed when deleted; orphaned data possible |
| Notification read-all scope | Partially implemented | `POST /api/notifications/read-all` uses `notificationWhereFor(user)` — may have scope edge cases |
| Student can view warden's hostel allocations | Implemented | `GET /api/allocations` with warden filter; warden sees their hostel's allocations |
| Attendance register mark all | Implemented | `PUT /api/warden/attendance/register` marks multiple students at once |
| `studentScope` for non-student roles | Implemented | `STUDENT_READ_ROLES` includes admin, warden, mess_manager, security, all warden roles; these roles can view students with hostel filtering |
| Allocation decision + allocate separation | Implemented | Two-step: first decision (approve/waitlist), then allocate (assign room) |
| Leave activate → complete cycle | Implemented | `activate` sets status='active' + creates exit record; `complete` sets status='completed' + creates entry record; linked via `linkedLeaveId` |
| Room seater enforcement during allocation | Implemented | `findRoomFor` + `doAllocate` check `occupants < seater` before allocation |
| Block hosting multiple room types | Partially implemented | Schema allows any room type per block; no constraint enforcing consistency |
| Academic year validation during allocation | Implemented | `eligibleHostels` filters by `year` vs `hostel.type (freshers/seniors)` |
| Dashboard statistics accuracy | Verified | Test suite validates dashboard stats counts and relationships |
| Audit log actor tracking | Verified | Tests verify `actorId`, `actorRole`, `actor` are correctly stored |
| CORS credentials behavior | Verified | Test confirms `credentials: true` works with allowed origins |
| Rate limiter effect on login | Verified | Test confirms 10-login/15min limit; after limit → 429 or handled by express-rate-limit |

---

### Most Important Architectural Decisions

1. **Prisma ORM over raw SQL** — enables type-safe database operations, schema-driven migrations, and rapid development. Trade-off: larger Prisma client bundle, less control over exact queries.

2. **JWT with tokenVersion for invalidation** — instead of blacklisting tokens or using short-lived refresh tokens, the `tokenVersion` field in `User` model is incremented on logout, making old tokens automatically invalid. Trade-off: requires DB query on every auth check, but provides clean logout semantics.

3. **Role-based access control at route level** — every endpoint explicitly checks `adminUser`, `wardenUser`, etc. rather than a centralized middleware pipeline. Trade-off: more repetitive code, but fine-grained control and easier auditing.

4. **Hostel-scoped warden data** — wardens can only data for their assigned hostel via `user.hostelId`. This prevents cross-hostel data access but requires proper hostel assignment during warden creation. Trade-off: more complex queries with hostel filtering, but necessary for data privacy.

5. **Client-side routing + API-driven data** — React Router for navigation, but all data fetched from backend via API calls (not embedded in pages). Trade-off: more network requests, but ensures data is always fresh and backend can control access.

6. **Prisma migrations deployed as part of build** — `npm run build` runs `prisma migrate deploy`, keeping database schema in sync with Prisma schema. Trade-off: migration history must be consistent; rollback requires manual Prisma migration commands.

7. **LocalStorage-based auth state** — token and user stored in `localStorage` for persistence across page refreshes. Trade-off: vulnerable to XSS attacks that read localStorage; could use `httpOnly` cookies + frontend-less auth, but LocalStorage simpler for this project.

8. **Vite + React Router lazy loading** — route components lazy-loaded with `import()` to reduce initial bundle size. Trade-off: route transition loading states required, and lazy-loaded imports must match route definitions exactly.

9. **Notification polling every 30 seconds** — instead of webhooks or longer polling intervals. Trade-off: more API traffic, but ensures timely notification delivery for a hostel management context where real-time updates are nice but not critical.

10. **Single Express app serves both API and static frontend** (in production) — `app.use('/api', router)` for API, `app.use(express.static(distDir))` for client assets. Trade-off: simpler deployment (single server), but requires build step and separate frontend deployment considerations for Vercel vs. self-hosted.