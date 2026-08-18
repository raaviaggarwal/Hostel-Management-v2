# Development Workflow

How to run, test and extend this project. Follow this document every time you
work on the codebase.

## Prerequisites

- Node.js (the repo is developed on Windows / PowerShell).
- PostgreSQL 17 running locally (Windows service).
- Dependencies installed once: `npm install` in `client/` **and** `server/`.

## Commands

Run client commands from `client/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server (proxies `/api` to `:5000`). |
| `npm run build` | Production build. |
| `npm run preview` | Preview the production build. |
| `npm run lint` | oxlint. Keep this clean (new warnings = fix them). |
| `npm run test` | Vitest, run once. |
| `npm run test:watch` | Vitest watch mode. |

Run server commands from `server/` (server must see a valid `DATABASE_URL` in
`server/.env`):

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with `node --watch` (default port 5000). |
| `npm run start` | Start the API. |
| `npm run prisma:generate` | Generate the Prisma Client from `schema.prisma`. |
| `npm run prisma:migrate` | Apply/create migrations (`prisma migrate dev`). |
| `npm run prisma:seed` | Seed the database (`prisma db seed` → `seed.js`). |
| `npm run seed` | Seed directly (`node prisma/seed.js`). |
| `npm run lint` | Syntax-check the server sources (no DB needed). |
| `npm run test` | Vitest + supertest API tests (needs the database). |
| `npm run test:watch` | Vitest watch mode. |

**Verification gate**: after any change run the client gate
(`npm run test`, `npm run lint`, `npm run build` in `client/`) and the server
gate (`npm run lint` in `server/`, plus `npm run test` when the database is
available). All must pass before considering a task done. GitHub Actions
(`.github/workflows/ci.yml`) runs the same gates on every push to `main` and on
PRs (client job, plus a server job with a Postgres 17 service container).

## Production mode

When `NODE_ENV=production`, the server additionally:

- **Serves the client build** — after `npm run build` in `client/`, `npm run
  start` in `server/` serves `client/dist` statically and falls back to
  `index.html` for non-`/api` GET routes (single-origin SPA).
- **Requires `JWT_SECRET`** — the server fails fast at startup if it is unset.
- **Enables rate limits** — `/api` (1,000 req / 15 min per IP) and
  `/api/auth/login` (10 / 15 min per IP). Rate limits and the static/SPA
  serving are inactive in dev (`npm run dev`) and tests.

## Getting the database up (first time)

1. Create a database, e.g. `hostel_management`, and put the connection string in
   `server/.env` as `DATABASE_URL` (see `server/.env.example`).
2. `npm run prisma:migrate` — applies the committed initial migration
   (`prisma/migrations/20260816000000_init`).
3. `npm run prisma:seed` — loads the deterministic seed data.

## Demo accounts

Useful for manual testing (see `docs/README.md` for the full table). Accounts
are seeded by `server/prisma/seed.js`:

- Admin: `admin` / `admin123`
- Warden: `warden` / `warden123`
- Student: `student` / `student123` (this is **Aarav Sharma**, the first
  generated student — not Raavi). Any other student logs in with
  `firstname` / `student123` (e.g. `raavi` / `student123`).
- Caretaker/Mess/Security/Housekeeping/Maintenance:
  `caretaker`/`mess`/`security`/`housekeeping`/`maintenance` with their
  seeded passwords.
- Parent: `parent` / `parent123` (linked to **Raavi Aggarwal**, id 40).
- Staff portals are hostel-scoped via the user's `hostelId`
  (housekeeping + maintenance use hostel 5, caretaker uses hostel 2).

## Conventions

- **JavaScript + JSX**, function components and hooks only. No TypeScript.
- **No comments in code** unless explicitly requested.
- Match existing style: `PageHeader` for page titles, `Card` for sections,
  `DataTable` for tables, `StatusTag` for status rendering, `EntityModal` for
  add/edit dialogs, `ConfirmDelete` for destructive actions.
- Data access goes through `useResource` / `resourceApi` / `authApi`
  (`api/client.js`); never call `fetch` directly.
- Status strings must match the canonical values in `docs/workflow.md`.
- Server routes are grouped by module in `server/src/routes/index.js` with
  `// ---- Module ----` section comments.
- Server data writes go through Prisma (`prisma.<Model>`) with the async auth
  guards; keep related records in sync in a single handler (rooms, students,
  allocations) and `create` audit/notification rows for recordable events.

## How to add a new API endpoint

1. **Model** — add the Prisma model in `server/prisma/schema.prisma`; run
   `npm run prisma:generate` and create a migration with
   `npm run prisma:migrate`.
2. **Seed** — add the records to `seedDatabase(prisma)` in
   `server/prisma/seed.js` (and add the delete to the reset order + the
   sequence to `resetSequences`).
3. **Route** — add an async handler in `server/src/routes/index.js`:
   - Use the auth guards (`adminUser`, `wardenUser`, `studentScope`,
     `staffHostelUser`, …) to enforce access.
   - Keep related records in sync (rooms, students, allocations).
   - `prisma.auditLog.create(...)` for recordable actions and
     `prisma.notification.create(...)` for user-visible events.
4. **Client** — call it via `resourceApi` / `useResource`.
5. **Test** — add cases to `server/tests/api.test.js` (supertest; reseeds the
   DB per test via `beforeEach`).
6. Run the verification gate.

## How to add a new page

1. Create `client/src/pages/<portal>/<Page>.jsx` following the existing page
   patterns (`PageHeader` + `Card` + `DataTable`).
2. Import it in the matching routes file (`routes/AdminRoutes.jsx`,
   `WardenRoutes.jsx`, `StudentRoutes.jsx`) via
   `const Page = lazy(() => import('<path>'))` and add a `<Route>` element.
   Portal pages go in `routes/PortalRoutes.jsx` the same way.
3. Add a nav entry in `routes/navigation.jsx` (`NAV[<portal>]`) so it appears
   in the sidebar and breadcrumb.
4. If the page introduces a new role/portal, update `PORTAL_FOR_ROLE`,
   `HOME_FOR_ROLE`, `ROLE_LABEL` and `NAV`, and add the portal route in
   `App.jsx` with `ProtectedRoute roles=[...]`.
5. Update `navigation.test.js` if nav counts changed.
6. Run the verification gate.

## How to add tests

- Server API/contract tests go in `server/tests/api.test.js`:
  - `beforeEach` reseeds via `seedDatabase(prisma)`.
  - Drive the Express app with supertest (`app = createApp()`;
    `request(app).get('/api/...')`).
  - Build auth headers as `Bearer <jwt>` signed with the shared dev secret
    (`SECRET`); helper `tokenFor(role, id)`.
  - Query `prisma` directly (`byName`, `allocByName`, `userByUsername`) to
    prepare scenarios and assert on the resulting database state.
  - Needs a running PostgreSQL (`DATABASE_URL` in `server/.env`).
- Client tests (39, jsdom): component + unit tests
  (`protected-route.test.jsx`, `auth.test.jsx`, `navigation.test.js`,
  `breadcrumb.test.js`, `useTableFilter.test.js`, `format.test.js`) use Testing
  Library with `MemoryRouter` and the real providers.
- `navigation.test.js` asserts nav structure; `breadcrumb.test.js` asserts the
  breadcrumb builder; `auth.test.jsx` asserts login/session.

## Testing gotchas

- **Vitest pool**: both `client/vitest.config.js` and `server/vitest.config.js`
  set `pool: 'threads'`. On this machine the default `forks` pool times out
  starting workers; do not remove the pool override.
- **Server tests need PostgreSQL**: `server/tests/api.test.js` reseeds the real
  database per test. If `DATABASE_URL` is wrong the suite fails on auth; the
  initial migration must be applied first.
- **Seed changes break tests**: the server tests assert on the seed (hostel
  counts, room counts, allocation pipeline). If you change seed data, update
  the tests in the same change.
- **Seed data is deterministic** — never introduce `Math.random()` into student
  or room generation (complaint numbers may use randomness; that is fine).
- **Server tests and ports**: supertest drives the Express app in-process (no
  port), so tests never clash with a running `npm run dev`. Keep `createApp()`
  separate from `listen` (`app.js` vs `index.js`).

## Slice roadmap (planned feature build order)

The 50+ module scope is delivered in four feature slices plus the backend
split. **All slices are done.** Slice A–D were built mock-first (MSW); Phase 6
replaced the mock layer with a real backend.

| Slice | Focus | Status |
| --- | --- | --- |
| **A** | Model restructure + Hostel Allocation core + admin/warden dashboards + RBAC/portals | Done (54 tests green) |
| **B** | Student life workflows: leave, out-pass, entry-exit (biometric), fees, notices, notifications | Done (out-pass, entry-exit, notifications, notices audience + leave destination) |
| **C** | Service workflows: maintenance tickets, complaints, room inventory, housekeeping, mess module, Wi-Fi, medical, visitors | Done (admin maintenance/inventory/housekeeping/mess/wifi/medical/complaints/visitors + warden scoped maintenance/mess + student maintenance & mess feedback; 71 tests green) |
| **D** | Cross-cutting: caretaker / security / housekeeping / mess / maintenance / parent portals, committee, off-campus fee logic, analytics, reports, search/filters, audit logs | Done (staff portals fully built + scoped handlers, committee, audit logs, parent ward view, off-campus fee slab, fee-by-campus + maintenance/mess metrics in reports, global table search/filters, code splitting, complaint uploads, extended CSV exports, lint cleanup; 108 tests green) |
| **Phase 6** | Backend split: Express + Prisma + PostgreSQL + JWT server, MSW removed, API tests ported to supertest | Done (server built, client rewired; 72 API tests green) |
| **Phase 7** | Deployment readiness: async error handling, serve `client/dist`, helmet/CORS/rate limits, JWT_SECRET guard | Done (hardening tests added; 72 server tests green) |

Working notes:

- **Code splitting**: all route pages are `React.lazy`. Keep them lazy when
  adding new pages; `AppLayout` provides the `Suspense` fallback. Do not add
  static page imports to route files. `vite.config.js` caps vendor chunk size
  via `codeSplitting.groups[].maxSize` so the build stays under the 500 kB
  warning threshold.

- **Table search/filters**: `hooks/useTableFilter.js` + `components/TableSearchBar.jsx`
  provide substring search across chosen columns and an optional exact-match
  status dropdown. Every list page (admin, warden, student and the staff
  portals) uses them. Pages with existing tab/hostel filters chain the search on
  top of the derived list (`searchFiltered`). Students/Rooms/Wardens pages keep
  their original inline search.

- **Complaint uploads**: students attach an image/PDF (max 2 MB) to a complaint.
  `POST /api/upload` is handled by **multer** (memory storage) in
  `server/src/routes/index.js`, returning a base64 `data:` URL. The client
  stores it as `complaintDoc` on the complaint and renders it with
  `components/AttachmentLink.jsx`. Multipart tests build the body as a raw
  string buffer and send it with the `multipart/form-data` content type.

- **CSV exports**: `utils/format.js` exposes a pure `buildCsv(rows, columns)`
  (`columns = [{key,label}]`, falls back to first-row keys) that `downloadCsv`
  wraps. `admin/Reports.jsx` exports students, fees, complaints, maintenance,
  visitors, inventory, housekeeping, mess feedback and audit logs.

- **Lint hygiene**: context modules are split so `.jsx` files export only the
  `*Provider` component — hooks + constants live in `context/auth.js`,
  `context/theme.js`, `context/notifications.js` (`useAuth`/`useTheme`/
  `useNotifications`). Route files keep `/* oxlint-disable react/only-export-components */`
  because they export arrays of elements. `npm run lint` is warning-free.

- All nine portals (admin, warden, student, caretaker, mess, security,
  housekeeping, maintenance, parent) are fully built. Portal routes live in
  `routes/PortalRoutes.jsx`.
- Staff portals are scoped server-side by `hostelId` (caretaker, housekeeping,
  maintenance) or globally (security, mess). `housekeeping` and
  `maintenance_staff` demo users use hostel 5; `caretaker` uses hostel 2.
- The `parent` demo account (`parent` / `parent123`) is linked to Raavi
  Aggarwal via `studentId` and sees her profile, fees, attendance, leave and
  out-pass history plus notices.
- Off-campus hostels bill at ₹70,000/semester; `POST /fees` defaults to this
  slab for off-campus students and `/admin/reports` breaks fees out by campus.
- Out-pass status flow: `pending → approved → active → completed` (`rejected`).
  Activation/completion auto-log an entry-exit punch linked via
  `linkedOutpassId`; a gate punch can also drive the same transitions.
- Entry-exit computes `late` / `violation` from `settings.girlsInTime`
  (girls) or `settings.summerInTime` (boys); >30 minutes late is a violation.
- When building new modules, keep the server in sync: `schema.prisma`, then
  `seed.js`, then the route in `routes/index.js`, then the client UI, then the
  tests — in that order.

## Project structure quick reference

- `server/` — the backend: `src/{index,app,prisma,auth}.js`,
  `src/routes/index.js` (the whole API), `prisma/{schema,seed}.js`,
  `prisma/migrations/`, `tests/api.test.js`.
- `client/src/pages/<portal>/` — one folder per portal.
- `client/src/routes/navigation.jsx` — single source of truth for roles,
  portals, nav and home routes.
- `client/src/api/client.js` — the only place in the client that talks to `/api`.
- `docs/` — this documentation; keep it updated as the system evolves.

## Known audit findings

- `npm audit` reports 3 high-severity findings, all in the dev-only Prisma CLI
  chain (`@prisma/config` -> `deepmerge-ts`). `npm audit --omit=dev` reports 0
  vulnerabilities; production dependencies are clean.
- There is no non-breaking fix (the only "fix" is a breaking Prisma downgrade).
  Do **not** run `npm audit fix --force`. Revisit after a Prisma 7 upgrade.