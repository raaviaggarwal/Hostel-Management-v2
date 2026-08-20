# Architecture

## Overview

The system is a **client + server** split (Phase 6 of the roadmap):

- `client/` — a React SPA that talks to the backend over `fetch('/api/...')`.
  In dev, Vite proxies `/api` to the Express server (`http://localhost:5000`);
  in production, Express serves the built `client/dist` (static files + SPA
  fallback to `index.html` for non-`/api` GET routes) from the same origin.
- `server/` — an Express REST API backed by **PostgreSQL via Prisma**,
  authenticating users with **JWT**.

The earlier MSW (Mock Service Worker) layer has been removed — the browser
mocks, the in-memory store and the client-side API tests were deleted when the
real backend landed. The client now depends on the server for all data.

```
Browser (React SPA)
   │  fetch('/api/...')  with Authorization: Bearer <jwt>
   ▼
Vite dev proxy (/api)  ──►  Express server (server/src/app.js)
                              │  routes (server/src/routes/index.js)
                              ▼
                        Prisma Client ──► PostgreSQL
```

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| UI | React 19 | function components + hooks only |
| Build | Vite 8 (rolldown) | route-level code splitting (`React.lazy`) + `codeSplitting.groups` vendor chunks (see below) |
| Component library | Ant Design 6 | `antd`, `@ant-design/icons` |
| Routing | React Router 7 | `BrowserRouter`, nested `Routes` |
| Charts | Recharts 3 | admin / warden dashboards |
| API server | Express 4 | `app.js` builds the app, `routes/index.js` holds all handlers |
| Security | helmet + express-rate-limit | headers, CORS allowlist, rate limits in production |
| ORM | Prisma 6 | schema-first, PostgreSQL; client generated into `node_modules` |
| Database | PostgreSQL 17 | connection via `DATABASE_URL` in `server/.env` |
| Auth | jsonwebtoken + bcryptjs | JWT `{ sub, role, ver }` (issuer/audience/jti); bcrypt-hashed passwords (cost 10, configurable via `BCRYPT_ROUNDS`) |
| Client tests | Vitest 4 + jsdom + Testing Library | `pool: 'threads'` (see development workflow) |
| Server tests | Vitest 4 + supertest | runs the Express app against real Prisma/PostgreSQL |
| Linting | oxlint (client) / `node --check` (server) | via `npm run lint` |

The repository root also contains a legacy PHP/MySQL version (`*.php`,
`hostel.sql`) that is **not** part of the current build.

## Folder layout

### `client/src`

```
client/src
├── api/
│   └── client.js          # apiFetch + authApi + resourceApi (adds /api base + token)
├── components/            # shared UI: PageHeader, DataTable, EntityModal, StatusTag, Navbar, …
├── context/               # AuthContext, ThemeContext, NotificationsContext
├── hooks/
│   └── useResource.js     # fetch an array resource: { data, loading, error, reload }
├── layout/                # AppLayout (shell) + per-portal layouts
├── pages/                 # one folder per portal (admin, warden, student, …)
├── routes/                # navigation.jsx (NAV/roles), ProtectedRoute.jsx,
│                          #   AdminRoutes.jsx, WardenRoutes.jsx, StudentRoutes.jsx, PortalRoutes.jsx
├── utils/                 # format, roles, breadcrumb
├── __tests__/             # vitest unit/component tests (39 tests)
├── App.jsx                # portal/route composition
└── main.jsx               # entry, providers (no MSW bootstrap)
```

### `server`

```
server
├── prisma/
│   ├── schema.prisma      # all models (User, Hostel, Block, Room, Student, …)
│   ├── seed.js            # seedDatabase(prisma) + resetSequences(prisma), direct-run guard
│   └── migrations/        # init, fee_due_date_optional, phase1_complaints, phase2_remove_maintenance,
│   │                      #   phase3_remove_visitors, phase4_remove_fees + migration_lock.toml
├── src/
│   ├── index.js           # entry: loads dotenv, listens on PORT || 5000
│   ├── app.js             # createApp(): helmet, cors, json({limit:'2mb'}), rate limits,
│   │                      #   /api router, client static + SPA fallback, error/404 handlers
│   ├── prisma.js          # PrismaClient singleton (imports dotenv/config first)
│   ├── auth.js            # SECRET, WARDEN_ROLES, signToken, publicUser
│   └── routes/
│       └── index.js       # the whole REST API (all ~120 endpoints)
├── tests/
│   └── api.test.js        # supertest API tests (66 tests, reseeds DB per test)
├── vitest.config.js       # pool: 'threads', environment node, test/hook timeout 60000
├── .env / .env.example    # DATABASE_URL, JWT_SECRET, PORT
└── package.json           # dev/start/migrate/seed/test/lint scripts
```

## Data layer (server)

### `schema.prisma`

Prisma models mirror the shape the client expects. Notable decisions:

- **Denormalized `studentName`** kept on records that the UI lists standalone
  (allocations, entry-exit, mess feedback, etc.).
- `history`, `hostelPrefs`, `issues`, `decisions`, `actionItems` are Prisma
  `Json` columns.
- **No Warden table** — wardens are just `User`s with a warden role
  (`WARDEN_ROLES`); `GET /wardens` returns warden-role users with `password`
  stripped.
- **No `Room.occupants`** — room occupancy is derived by counting `Student`s
  with that `roomId`.
- `User.blockId`, `User.hostelId`, `User.studentId` scope staff portals
  (housekeeping/caretaker by hostel).
- `Complaint.preferredVisitingHours` is the time slot a student picks on the
  complaint form (Morning / 10-12 / 14-16 / 16-18); complaints use the
  maintenance-style categories (Electrical, Plumbing, Carpentry, Room,
  Furniture, Internet, Other).

The initial migration SQL was generated offline with
`prisma migrate diff --from-empty` and committed under
`server/prisma/migrations/`; apply it with `prisma migrate dev` (or `deploy`).

### `seed.js`

`seedDatabase(prisma)` inserts fully deterministic seed data (users, hostels,
blocks, rooms, students, allocations, and all module data) with
`deleteMany` reset in FK order and bcrypt-hashed passwords. `resetSequences`
`setval`s every serial sequence after the reset. The module exports both
functions (used by the tests) and only seeds directly when executed by `node`
(the direct-run guard checks `import.meta.url` against `process.argv[1]`).

## Authentication & session

- `POST /api/auth/login` returns `{ token, user }`; token is a JWT signed with
  `JWT_SECRET` (`server/.env`, default `dev-secret` in dev; **required** when
  `NODE_ENV=production`) containing `{ sub, role, ver }` plus issuer/audience
  claims and a unique `jti` (expiry `JWT_EXPIRES_IN`, default 24 h).
- The client stores `token`, `sessionExpiry` (24 h) and `user` in
  `localStorage` (`AuthContext`).
- Every request sends `Authorization: Bearer <token>`; the server resolves the
  user from the JWT `sub` and rejects tokens whose `ver` no longer matches the
  user's `tokenVersion` (incremented by `POST /auth/logout` to invalidate all
  sessions server-side).
- Helper guards mirror the old mock helpers: `getUser`, `adminUser`,
  `wardenUser`, `roleUser`, `messUser`, `staffHostelUser`, `guardUser`,
  `parentUser`, `studentScope` (all async, in `routes/index.js`).
- `publicUser(user)` strips `password` from any returned user record.

## RBAC & portals

Role-to-portal mapping lives in `client/src/routes/navigation.jsx`
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
| `parent` | parent | `/parent/dashboard` |

All nine portals are fully built. Portal routes live in `routes/PortalRoutes.jsx`;
staff portals are scoped server-side by `hostelId` where applicable.

## API surface (endpoints by module)

**Auth**: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
**Notifications**: `GET /notifications` (scoped to the requester's audience:
admin sees all; wardens see `all`/`wardens`/their hostel + direct; students see
`all`/`students` + direct), `POST /notifications/read-all`,
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
`GET /student/complaints` — history maps mock field names
(`complaintid`, `compalintStatus`, `complaintRemark`, `postingDate`)
**Leaves / Out-passes**: `GET /leaves` (admin all / warden scoped),
`GET /student/leaves`, `POST /leaves` (student, quota `settings.leaveTotal` +
one-open check), `POST /leaves/:id/decision` (warden), `POST /leaves/:id/activate`,
`POST /leaves/:id/complete`
**Entry / exit**: `GET /entry-exit` (admin all / warden scoped, `?studentId`,
`?date`), `GET /student/entry-exit`, `POST /entry-exit` (warden / admin /
security) — auto-links approved→active / active→completed leaves and
computes `late` / `violation` from in-times
**Mess**: `GET /mess-menu`, `PUT /mess-menu/:id` (mess manager / warden / admin),
`GET/POST /mess/feedback`, `GET /student/mess/feedback`, `GET/POST
/mess/complaints`, `GET /student/mess/complaints`, `PUT /mess/complaints/:id`
(mess manager / warden / admin), `GET/POST /mess/inspections`
**Complaints**: `GET /complaints` (admin all / warden scoped), `POST /complaints`
(student; stores `preferredVisitingHours`), `POST /complaints/:id/action`,
`GET /complaints/:id/history`, `GET /student/complaints`
**Security**: outside count from `GET /leaves` (active leaves)
**Housekeeping**: `GET /housekeeping`
(admin all / warden, caretaker, housekeeping scoped by
`hostelId`), writes guarded by role
**Committee**: `GET /committee`, `POST /committee/meetings`,
`PUT /committee/meetings/:id` (admin / warden)
**Audit logs**: `GET /audit-logs` (admin only; optional `?actor=`, `?entity=`,
`?action=`, `?date=` filters) — entries carry `actorId`/`actorRole` plus the
requester `ip`/`user-agent`
**Parent portal**: `GET /parent/ward` (linked ward + attendance + leaves +
notices)
**Attendance**: `GET /attendance`, `GET/PUT /warden/attendance/register`,
`GET /student/attendance`
**Notices**: `GET/POST/PUT/DELETE /notices` (student calls are filtered by
`audience`: `all`/`students`, `girls`, `boys`)
**Reports/Settings**: `GET /admin/reports` (occupancy + complaints by type +
mess rating),
`GET/PUT /settings`

## Client data fetching

- `api/client.js`: `apiFetch(path, options)` prefixes `/api`, attaches
  `Authorization: Bearer <token>` from `localStorage`, sets `Content-Type:
  application/json` unless the body is `FormData`, and throws `Error` with the
  server `message` on non-OK responses.
- `resourceApi`: `get`, `getById`, `post`, `create`, `patch`, `update`,
  `remove`.
- `useResource(path)`: loads an array from `path` on mount; returns
  `{ data, setData, loading, error, reload }`.
- CSV: `utils/format.js` exports pure `buildCsv(rows, columns)` plus
  `downloadCsv(filename, rows, columns)` wrapper.

## Routing & layout (client)

- `App.jsx` composes `Routes`. Each portal is wrapped in
  `ProtectedRoute roles=[...]` then a layout (`AdminLayout`, `WardenLayout`,
  `StudentLayout`, or `PortalLayout`).
- `AdminRoutes` / `WardenRoutes` / `StudentRoutes` export arrays of `<Route>`
  used inside the layout route. Every page component is loaded with
  `React.lazy(() => import(...))`, so each route is its own chunk. `AppLayout`
  wraps `<Outlet />` in a `<Suspense fallback={<Skeleton active />}>` so
  navigation shows a skeleton while a chunk loads.
- `AppLayout` renders the sidebar (`SidebarMenu`), header (`Navbar` with
  notifications + theme toggle + profile), and `Outlet` for page content.
  It fetches `/notifications` on mount. `Navbar` builds a breadcrumb from `NAV`
  via `utils/breadcrumb.js`.

## Code splitting & bundle

- Route-level lazy loading keeps the app shell small; each page is a separate
  chunk fetched on demand.
- `vite.config.js` defines a `vendor` `codeSplitting` group
  (`build.rolldownOptions.output.codeSplitting`) with `maxSize` ~400 kB so no
  chunk (shared antd/rc/react/recharts core included) exceeds the 500 kB
  warning threshold. Largest chunk is ~180 kB minified.

## Testing strategy

Two suites, both Vitest with `pool: 'threads'`:

- **Client** (`client/`, jsdom, 39 tests): component + unit tests
  (`auth.test.jsx`, `protected-route.test.jsx`, `navigation.test.js`,
  `breadcrumb.test.js`, `useTableFilter.test.js`, `format.test.js`). No API
  tests — those live on the server.
- **Server** (`server/`, node, 72 tests): `tests/api.test.js` drives the
  Express app with **supertest** against real Prisma/PostgreSQL. `beforeEach`
  reseeds the database via `seedDatabase(prisma)`; `tokenFor(role, id)` signs a
  JWT with the shared dev secret. These tests are the port of the old
  `mock-api.test.js` contract tests, plus hardening cases (async error → 500,
  404 for unknown API routes, helmet headers, SPA fallback). They require a
  running PostgreSQL (`DATABASE_URL` in `server/.env`).