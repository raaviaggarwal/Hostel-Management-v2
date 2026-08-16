# Development Workflow

How to run, test and extend this project. Follow this document every time you
work on the codebase.

## Prerequisites

- Node.js (the repo is developed on Windows / PowerShell).
- Dependencies installed once: `npm install` in `client/`.

## Commands

Run all commands from `client/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server (MSW mocking is enabled here). |
| `npm run build` | Production build (mock worker is NOT included). |
| `npm run preview` | Preview the production build. |
| `npm run lint` | oxlint. Keep this clean (new warnings = fix them). |
| `npm run test` | Vitest, run once. |
| `npm run test:watch` | Vitest watch mode. |

**Verification gate**: after any change run `npm run test`, `npm run lint` and
`npm run build`. All three must pass before considering a task done.

## Demo accounts

Useful for manual testing (see `docs/README.md` for the full table):

- Admin: `admin` / `admin123`
- Warden: `warden` / `warden123`
- Student: `student` / `student123` (this is **Aarav Sharma**, the first
  generated student — not Raavi). Any other student logs in with
  `firstname` / `student123` (e.g. `raavi` / `student123`).
- Caretaker/Mess/Security/Housekeeping/Maintenance:
  `caretaker`/`mess`/`security`/`housekeeping`/`maintenance` with their
  passwords from `data.js`.

## Conventions

- **JavaScript + JSX**, function components and hooks only. No TypeScript.
- **No comments in code** unless explicitly requested.
- Match existing style: `PageHeader` for page titles, `Card` for sections,
  `DataTable` for tables, `StatusTag` for status rendering, `EntityModal` for
  add/edit dialogs, `ConfirmDelete` for destructive actions.
- Data access goes through `useResource` / `resourceApi` / `authApi`
  (`api/client.js`); never call `fetch` directly.
- Status strings must match the canonical values in `docs/workflow.md`.
- Keep handlers grouped by module with `// ---- Module ----` section comments.

## How to add a new API endpoint

1. **Seed data** — add the collection to `client/src/mocks/data.js` and export
   it. (If it's nested state, mirror it in `db.js` `createStore`.)
2. **Store** — if you added a top-level collection, add it to
   `db.js` `createStore()`.
3. **Handler** — add an MSW handler in `client/src/mocks/handlers.js`:
   - Use the module helpers (`adminUser`, `wardenUser`, `studentScope`) to
     enforce access.
   - Mutate `db` records in place so other modules (rooms, students,
     allocations) stay in sync.
   - Call `logAudit(...)` for recordable actions and `addNotification(...)`
     for user-visible events.
4. **Client** — call it via `resourceApi` / `useResource`.
5. **Test** — add cases to `client/src/__tests__/mock-api.test.js`.
6. Run the verification gate.

## How to add a new page

1. Create `client/src/pages/<portal>/<Page>.jsx` following the existing page
   patterns (`PageHeader` + `Card` + `DataTable`).
2. Import it in the matching routes file (`routes/AdminRoutes.jsx`,
   `WardenRoutes.jsx`, `StudentRoutes.jsx`) and add a `<Route>`.
3. Add a nav entry in `routes/navigation.jsx` (`NAV[<portal>]`) so it appears
   in the sidebar and breadcrumb.
4. If the page introduces a new role/portal, update `PORTAL_FOR_ROLE`,
   `HOME_FOR_ROLE`, `ROLE_LABEL` and `NAV`, and add the portal route in
   `App.jsx` with `ProtectedRoute roles=[...]`.
5. Update `navigation.test.js` if nav counts changed.
6. Run the verification gate.

## How to add tests

- API/contract tests go in `mock-api.test.js`:
  - `const server = setupServer(...handlers)` in `beforeAll`.
  - Reseed `beforeEach`: `Object.assign(db, createStore(seed))`.
  - Fetch against `${window.location.origin}/api/...` (jsdom origin is
    `http://localhost:3000`), never a bare relative path — MSW handler paths
    are relative and resolve against that origin.
  - Build auth headers as `Bearer mock-token-<role>-<id>` (helper `asRole`).
  - Mutate `db` directly to seed/prepare test scenarios, then assert on both
    the response and the resulting `db` state.
- Component tests (e.g. `protected-route.test.jsx`) use Testing Library with
  `MemoryRouter` and the real providers.
- `navigation.test.js` asserts nav structure; `breadcrumb.test.js` asserts the
  breadcrumb builder; `auth.test.jsx` asserts login/session.

## Testing gotchas

- **Vitest pool**: `vitest.config.js` sets `pool: 'threads'`. On this machine
  the default `forks` pool times out starting workers; do not remove the pool
  override.
- **MSW handler origin**: relative handler paths only match when requests use
  the page origin. In tests that is `window.location.origin`; in the browser it
  is the dev-server origin.
- **Seed changes break tests**: `mock-api.test.js` asserts on the seed
  (hostel counts, room counts, allocation pipeline). If you change seed data,
  update the tests in the same change.
- **`data.js` is deterministic** — never introduce `Math.random()` into student
  or room generation (complaint numbers may use randomness; that is fine).

## Slice roadmap (planned feature build order)

The 50+ module scope is delivered in four slices. **Slices A and B are done.**

| Slice | Focus | Status |
| --- | --- | --- |
| **A** | Model restructure + Hostel Allocation core + admin/warden dashboards + RBAC/portals | Done (54 tests green) |
| **B** | Student life workflows: leave, out-pass, entry-exit (biometric), fees, notices, notifications | Done (out-pass, entry-exit, notifications, notices audience + leave destination) |
| **C** | Service workflows: maintenance tickets, complaints, room inventory, housekeeping, mess module, Wi-Fi, medical, visitors | Pending |
| **D** | Cross-cutting: caretaker / security / housekeeping / mess / maintenance / parent portals, committee, off-campus fee logic, analytics, reports, search/filters, audit logs | Pending |

Working notes:

- Portals for caretaker, mess, security, housekeeping, maintenance, parent are
  shell-only (`PortalComingSoon`) until their slice. Entry-exit punches are
  already permitted for the `security` role in the mock layer.
- Parent portal is intentionally limited/placeholder.
- Room statuses include `medical_reserved`; allocation logic must never place a
  student into a `medical_reserved` room.
- Out-pass status flow: `pending → approved → active → completed` (`rejected`).
  Activation/completion auto-log an entry-exit punch linked via
  `linkedOutpassId`; a gate punch can also drive the same transitions.
- Entry-exit computes `late` / `violation` from `settings.girlsInTime`
  (girls) or `settings.summerInTime` (boys); >30 minutes late is a violation.
- When building new modules, keep the mock layer in sync with `data.js`,
  `db.js`, `handlers.js`, then the UI, then the tests — in that order.

## Project structure quick reference

- `client/src/mocks/` — the entire "backend" for now.
- `client/src/pages/<portal>/` — one folder per portal.
- `client/src/routes/navigation.jsx` — single source of truth for roles,
  portals, nav and home routes.
- `client/src/api/client.js` — the only place that talks to `/api`.
- `docs/` — this documentation; keep it updated as the system evolves.