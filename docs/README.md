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

- **Current build**: two packages —
  - `client/` — React 19 + Vite 8 + Ant Design 6 SPA (no MSW; talks to the real
    backend via a dev-server proxy on `/api`).
  - `server/` — Express + Prisma + PostgreSQL + JWT REST API.
- **Legacy**: the PHP/MySQL files at the repository root (`*.php`, `hostel.sql`)
  are the previous version and are no longer maintained.
- **Demo logins** (seeded by `server/prisma/seed.js`; passwords bcrypt-hashed):

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
  | Parent | `parent` | `parent123` |

- **Verification**: after every change run the client gate (`npm run test`,
  `npm run lint`, `npm run build` in `client/` — 39 tests) and the server gate
  (`npm run lint` in `server/`, plus `npm run test` — 72 API tests — which
  require a running PostgreSQL).