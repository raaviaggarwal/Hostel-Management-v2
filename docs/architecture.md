# Architecture

## Overview

The system is a **mock-first** single-page application. The UI is built with
React and consumes a REST-style API that is mocked in the browser by
**MSW (Mock Service Worker)**. No real backend exists yet; the mock data layer
replicates the planned persistence model so that the frontend can be developed
and tested end-to-end before a real backend (Express + Prisma + PostgreSQL) is
introduced.

The MSW worker is enabled **only in dev mode** (`import.meta.env.DEV`), so
production builds do not ship the mock worker.

```
Browser (React SPA)
   │  fetch('/api/...')  with Authorization: Bearer mock-token-<role>-<id>
   ▼
MSW Service Worker (dev only)
   │  handlers.js  →  db.js (in-memory store)  ←  data.js (seed)
   ▼
React components (pages/components)
```

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| UI | React 19 | function components + hooks only |
| Build | Vite 8 | dev server + production build |
| Component library | Ant Design 6 | `antd`, `@ant-design/icons` |
| Routing | React Router 7 | `BrowserRouter`, nested `Routes` |
| Charts | Recharts 3 | admin / warden dashboards |
| API mocking | MSW 2 | browser worker (dev) + node server (tests) |
| Testing | Vitest 4 + jsdom + Testing Library | `pool: 'threads'` (see development workflow) |
| Linting | oxlint | via `npm run lint` |

All source lives in `client/src`. The repository root also contains a legacy
PHP/MySQL version (`*.php`, `hostel.sql`) that is **not** part of the current
build.

## Folder layout (`client/src`)

```
client/src
├── api/
│   └── client.js          # apiFetch + authApi + resourceApi (adds /api base + token)
├── mocks/
│   ├── data.js            # seed data (users, hostels, rooms, students, allocations, …)
│   ├── db.js              # createStore() -> in-memory db, nextId, addNotification, logAudit
│   ├── handlers.js        # all MSW request handlers (the "server")
│   └── browser.js         # setupWorker(handlers)
├── components/            # shared UI: PageHeader, DataTable, EntityModal, StatusTag, Navbar, …
├── context/               # AuthContext, ThemeContext, NotificationsContext
├── hooks/
│   └── useResource.js     # fetch an array resource: { data, loading, error, reload }
├── layout/                # AppLayout (shell) + per-portal layouts
├── pages/
│   ├── auth/Login.jsx
│   ├── admin/             # Dashboard, Hostels, HostelDetail, Rooms, RoomDetail,
│   │                      #   Allocations, WaitingList, AllocationHistory, Students,
│   │                      #   Wardens, Fees, Reports, Settings, Notices
│   ├── warden/            # WardenDashboard, WardenAllocations, WardenRooms, WardenStudents,
│   │                      #   WardenAttendance, WardenComplaints, Leaves, Visitors, MessMenu
│   ├── student/           # StudentDashboard, StudentProfile, AllocationApply, MyAllocation,
│   │                      #   StudentLeave, StudentComplaints, StudentVisitors,
│   │                      #   StudentAttendance, StudentNotices, StudentMessMenu, StudentFees
│   └── portal/            # PortalComingSoon (placeholder for caretaker/mess/security/…)
├── routes/                # navigation.jsx (NAV/roles), ProtectedRoute.jsx,
│                          #   AdminRoutes.jsx, WardenRoutes.jsx, StudentRoutes.jsx
├── utils/                 # format, roles, breadcrumb
├── __tests__/             # vitest tests
├── App.jsx                # portal/route composition
└── main.jsx               # entry, enables MSW in dev, providers
```

## Data layer (mocks)

### `data.js` — seed data

Single source of truth for the "database contents". Key collections:

- **`users`** — staff accounts (admin, wardens, caretaker, mess, security,
  housekeeping, maintenance) followed by one `user` per student
  (username = first name lowercased; the first generated student also gets
  username `student`).
- **`hostels`** — 7 hostels built from `HOSTEL_CONFIG`:
  - Campus: Azad Bhawan (boys, freshers), Shastri Bhawan (boys, seniors),
    Parmar Bhawan (boys, seniors), Geeta Bhawan Junior Wing (girls, freshers),
    Geeta Bhawan Senior Wing (girls, seniors).
  - Off-campus: Azad Bhawan Extension, Shastri Bhawan Extension (boys, seniors).
  - Total 1,858 seats (1,688 campus + 170 off-campus).
- **`blocks`** — wings per hostel (e.g. `East Wing`, `Senior Wing`); 9 wings total.
- **`rooms`** — generated from hostel config (`generateRooms()`): 1,029 rooms
  with `type` (single/double/triple), `seater`, `fees`, `status`
  (`available`, `partially_occupied`, `full`, `maintenance`, `medical_reserved`,
  `cleaning`, `blocked`, `reserved`), `occupants` (array of student ids).
- **`students`** — 44 generated students (39 housed + 5 applicants). Housed
  students get `roomId`, `hostelId`, `blockId`, `roomno`, `seater`, `feespm`.
- **`allocations`** — the hostel application/allocation records (see workflow.md).
- **`complaints`, `complaintHistory`, `maintenanceTickets`, `inventory`,
  `housekeeping`, `mess`, `messMenu`, `fees`, `attendance`, `entryExit`,
  `outpasses`, `leaves`, `visitors`, `wifi`, `medical`, `committee`,
  `auditLogs`, `notices`, `notifications`, `settings`, `states`** — seed data
  for the other modules.

Students are generated deterministically (no randomness) so tests are stable.

### `db.js` — in-memory store

- `createStore(seed)` deep-clones `data.js` into an object of arrays. The module
  exports a singleton `db` built from the seed.
- Helper functions: `nextId(list)`, `findUser`, `findWardenUser`,
  `addNotification(title, description)`, `publicUser(user)`,
  `logAudit(actor, action, entity, target, before, after)`.

### `handlers.js` — the API

One MSW handler per endpoint (75 handlers). Conventions:

- Handlers match relative paths (`/api/...`) — MSW resolves them against the
  page origin in the browser, and against `window.location.origin` in tests.
- Auth is read from the `Authorization` header token
  `mock-token-<role>-<id>`. Helpers:
  - `authUserFrom(request)` — resolve user from token.
  - `adminUser(request)` — user is role `admin`.
  - `wardenUser(request)` — role in `WARDEN_ROLES`
    (`warden`, `chief_warden`, `deputy_warden`, `assistant_warden`).
  - `studentScope(request)` — returns the `students` record for the logged-in
    student via `regNo`.
- Helper responses: `ok(body, status?)`, `fail(message, status?)`.
- Room allocation logic (`findRoomFor`, `doAllocate`) keeps `room.occupants`,
  student fields and room status in sync.

### API surface (endpoints by module)

**Auth**: `POST /auth/login`, `GET /auth/me`
**Notifications**: `GET /notifications`, `POST /notifications/read-all`,
`POST /notifications/:id/read`
**Dashboards**: `GET /admin/dashboard`, `GET /warden/dashboard`,
`GET /student/dashboard`, `GET /student/profile`
**Hostel management**: `GET/POST/PUT/DELETE /hostels`, `GET /hostels/:id`,
`GET/POST/PUT/DELETE /blocks`
**Room management**: `GET/POST/PUT/DELETE /rooms`, `GET /rooms/:id`,
`PUT /rooms/:id/status`
**Students**: `GET/POST/PUT/DELETE /students`, `GET /students/:id`,
`PUT /students/:id/room`
**Wardens**: `GET/POST/PUT/DELETE /wardens`
**Allocations**: `GET /allocations` (admin all / warden scoped),
`GET /allocations/:id`, `GET /student/allocation`,
`GET /student/application` (alias), `POST /allocations`,
`POST /allocations/:id/decision`, `POST /allocations/:id/allocate`,
`POST /allocations/:id/checkin`, `POST /allocations/:id/transfer`,
`POST /allocations/:id/cancel`
**Complaints**: `GET/POST /complaints`, `GET /complaints/:id`,
`GET /complaints/:id/history`, `POST /complaints/:id/action`,
`GET /student/complaints`
**Leaves**: `GET /leaves`, `GET /student/leaves`, `POST /leaves`,
`POST /leaves/:id/decision`
**Out-passes**: `GET /outpasses` (admin all / warden scoped),
`GET /student/outpasses`, `POST /outpasses` (student, quota + one-open check),
`POST /outpasses/:id/decision` (warden), `POST /outpasses/:id/activate`,
`POST /outpasses/:id/complete`
**Entry / exit**: `GET /entry-exit` (admin all / warden scoped, `?studentId`,
`?date`), `GET /student/entry-exit`, `POST /entry-exit` (warden / admin /
security) — auto-links approved→active / active→completed out-passes and
computes `late` / `violation` from in-times
**Visitors**: `GET /visitors`, `GET /student/visitors`, `POST /visitors`,
`PUT /visitors/:id`
**Mess**: `GET /mess-menu`, `PUT /mess-menu/:id`
**Fees**: `GET/POST/PUT /fees`, `GET /student/fees`, `POST /student/fees/:id/pay`
**Attendance**: `GET /attendance`, `GET/PUT /warden/attendance/register`,
`GET /student/attendance`
**Notices**: `GET/POST/PUT/DELETE /notices` (student calls are filtered by
`audience`: `all`/`students`, `girls`, `boys`)
**Reports/Settings**: `GET /admin/reports`, `GET/PUT /settings`

## Authentication & session

- Login returns `{ token, user }`. Token format: `mock-token-<role>-<id>`.
- Session stored in `localStorage` under `token`, `sessionExpiry` (24 h), `user`
  (see `AuthContext`). `AuthContext` also owns `sidebarOpen` state.
- `ProtectedRoute` accepts a `roles` array; users outside the allowed roles are
  redirected to `HOME_FOR_ROLE[user.role]`.

## RBAC & portals

Role-to-portal mapping lives in `routes/navigation.jsx`
(`PORTAL_FOR_ROLE`, `portalForRole`, `HOME_FOR_ROLE`, `ROLE_LABEL`, `NAV`):

| Role(s) | Portal | Home route |
| --- | --- | --- |
| `admin` | admin | `/admin/dashboard` |
| `warden`, `chief_warden`, `deputy_warden`, `assistant_warden` | warden | `/warden/dashboard` |
| `student` | student | `/student/dashboard` |
| `caretaker` | caretaker | `/caretaker/dashboard` |
| `mess_manager` | mess | `/mess/dashboard` |
| `security` | security | `/security/dashboard` |
| `housekeeping` | housekeeping | `/housekeeping/dashboard` |
| `maintenance_staff` | maintenance | `/maintenance/dashboard` |
| `parent` | parent | `/parent/dashboard` |

Admin, warden and student portals are fully built. Caretaker / mess / security /
housekeeping / maintenance / parent portals currently show a placeholder
(`PortalComingSoon`) and are scheduled for later slices.

## Routing & layout

- `App.jsx` composes `Routes`. Each portal is wrapped in
  `ProtectedRoute roles=[...]` then a layout (`AdminLayout`, `WardenLayout`,
  `StudentLayout`, or `PortalLayout`).
- `AdminRoutes` / `WardenRoutes` / `StudentRoutes` export arrays of `<Route>`
  used inside the layout route.
- `AppLayout` renders the sidebar (`SidebarMenu`), header (`Navbar` with
  notifications + theme toggle + profile), and `Outlet` for page content.
  It fetches `/notifications` on mount.
- `Navbar` builds a breadcrumb from `NAV` via `utils/breadcrumb.js`.

## Data fetching

- `api/client.js`: `apiFetch(path, options)` prefixes `/api`, attaches
  `Authorization: Bearer <token>` from `localStorage`, and throws `Error`
  with the server `message` on non-OK responses.
- `resourceApi`: `get`, `getById`, `post`, `create`, `patch`, `update`,
  `remove`.
- `useResource(path)`: loads an array from `path` on mount; returns
  `{ data, setData, loading, error, reload }`.

## Testing strategy

Tests live in `client/src/__tests__` (Vitest, jsdom):

- **`mock-api.test.js`** — API contract tests. Uses
  `setupServer(...handlers)` from `msw/node`, reseeds `db` per test via
  `beforeEach`, and calls handlers at `${window.location.origin}/api/...`.
- **`auth.test.jsx`** — login flow.
- **`protected-route.test.jsx`** — route guarding.
- **`navigation.test.js`** — nav config shape (counts, unique keys, home routes).
- **`breadcrumb.test.js`** — breadcrumb builder.

Important: because MSW handler paths are relative, tests must fetch against
`window.location.origin` (jsdom defaults to `http://localhost:3000`), not a
bare relative URL. See development-workflow.md for the `pool: 'threads'` note.