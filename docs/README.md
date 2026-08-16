# Hostel Management System — Documentation

Central reference for the Hostel Management System (HMS). This folder is the
single source of truth for how the project is structured, how it works, and how
to work on it.

## Documents

| Document | Purpose |
| --- | --- |
| [`architecture.md`](./architecture.md) | System design: stack, folder layout, data layer, API, RBAC, routing, testing. |
| [`workflow.md`](./workflow.md) | Project workflow: allocation pipeline and role-based user journeys. |
| [`development-workflow.md`](./development-workflow.md) | Development workflow: commands, conventions, how-to guides, slice roadmap. |

## Quick facts

- **Current build**: `client/` — React 19 + Vite 8 + Ant Design 6 + MSW (mock-first).
- **Backend**: none yet. A real Express + Prisma + PostgreSQL backend is planned
  after the mock phase is feature-complete.
- **Legacy**: the PHP/MySQL files at the repository root (`*.php`, `hostel.sql`)
  are the previous version and are no longer maintained.
- **Demo logins** (see `client/src/mocks/data.js` `users`):

  | Role | Username | Password |
  | --- | --- | --- |
  | Admin | `admin` | `admin123` |
  | Warden | `warden` | `warden123` |
  | Student | `student` (Aarav Sharma) | `student123` |
  | Student (any) | first name, e.g. `raavi` | `student123` |
  | Caretaker | `caretaker` | `caretaker123` |
  | Mess manager | `mess` | `mess123` |
  | Security | `security` | `security123` |
  | Housekeeping | `housekeeping` | `house123` |
  | Maintenance staff | `maintenance` | `main123` |

- **Verification**: run `npm run test`, `npm run lint`, `npm run build` in
  `client/` after every change. Currently 41 tests, all green.