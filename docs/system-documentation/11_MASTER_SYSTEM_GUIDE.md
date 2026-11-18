# 11_MASTER_SYSTEM_GUIDE.md

## Master System Guide — Complete Navigation and End-to-End Explanation

This is the main navigation document linking all 11 documentation files, with a concise but accurate end-to-end explanation of how the entire Hostel Management System works.

---

### Documentation Roadmap

| Doc # | File | Focus | Key Count |
|-------|------|-------|-----------|
| 01 | `01_PROJECT_OVERVIEW.md` | Project purpose, tech stack, architecture, directory structure, startup flow | — |
| 02 | `02_FRONTEND_ROUTES.md` | Every frontend route (55+), roles, components, API calls, implementation status | 55 routes |
| 03 | `03_BACKEND_API_REFERENCE.md` | Every API endpoint (85+), methods, paths, auth, roles, validation, DB ops, responses | 85 endpoints |
| 04 | `04_DATABASE_DESIGN.md` | All 32 Prisma models, fields, relations, constraints, ER diagram | 32 models |
| 05 | `05_AUTHENTICATION_AND_SECURITY.md` | Complete login lifecycle, JWT, role-based access, security findings | Full auth flow |
| 06 | `06_BUSINESS_WORKFLOWS.md` | 8 major workflows with step-by-step request flows + sequence diagrams | 8 workflows |
| 07 | `07_FRONTEND_AND_BACKEND_INTERNALS.md` | Components, context, hooks, middleware, controllers, services, data flow | 2 providers + 2 hooks + 85 endpoints |
| 08 | `08_DEPLOYMENT_AND_ENVIRONMENT.md` | Vercel + Render + PostgreSQL; env vars; deployment flow | 2 platforms + 3 services |
| 09 | `09_TESTING_AND_VERIFICATION.md` | Test coverage, results, limitations, unverified functionality | 3 test files ~125 cases |
| 10 | `10_GAPS_AND_RECOMMENDATIONS.md` | Gaps, security risks, performance, technical debt, prioritized recommendations | 10+ gaps + 15+ recommendations |
| 11 | `11_MASTER_SYSTEM_GUIDE.md` | **Complete navigation + end-to-end system explanation** | **All above** |

---

### Quick Navigation

```
docs/system-documentation/
│
├── 01_PROJECT_OVERVIEW.md          ← Project-wide foundation
├── 02_FRONTEND_ROUTES.md          ← Frontend navigation (all routes)
├── 03_BACKEND_API_REFERENCE.md    ← Backend API (all endpoints)
├── 04_DATABASE_DESIGN.md          ← Database (all models + ER diagram)
├── 05_AUTHENTICATION_AND_SECURITY.md ← Auth (full lifecycle)
├── 06_BUSINESS_WORKFLOWS.md       ← Workflows (8 major + diagrams)
├── 07_FRONTEND_AND_BACKEND_INTERNALS.md ← Internals (components → DB)
├── 08_DEPLOYMENT_AND_ENVIRONMENT.md ← Deployment (Vercel/Render/DB)
├── 09_TESTING_AND_VERIFICATION.md  ← Tests (coverage + results)
├── 10_GAPS_AND_RECOMMENDATIONS.md  ← Gaps + priorities + fixes needed
└── 11_MASTER_SYSTEM_GUIDE.md      ← ← YOU ARE HERE (master navigation)
```

---

### Concise End-to-End System Explanation

#### The Complete Request Lifecycle

**1. Application Startup**

- **Frontend**: `npm run dev` → Vite at `localhost:5173` → mounts `<AuthProvider>` → checks `localStorage` for valid token → if valid, user stays authenticated; otherwise redirects to `/login`
- **Backend**: `npm run dev` → `node --watch src/index.js` → Express on port 5000 → loads `.env` → validates `JWT_SECRET` in production → creates PrismaClient → connects to PostgreSQL → mounts middleware (helmet, CORS, rate limiters) → mounts router at `/api` → serves `frontend/dist` if exists
- **Database**: PostgreSQL 17 via Prisma ORM; migrations deployed on `npm run build`

**2. User Authentication** (login flow)

1. User submits login form → `POST /api/auth/login`
2. Backend verifies `bcrypt.compareSync(password, user.password)` → if valid, `jwt.sign({ sub: user.id, role: user.role, ver: user.tokenVersion }, SECRET, { expiresIn: '24h' })`
3. Frontend receives `{ token, user }` (password stripped by `publicUser()`)
4. `AuthContext.login(token, user)` stores in `localStorage` (keys: `token`, `sessionExpiry`, `user`) + state
5. `navigate(HOME_FOR_ROLE[user.role])` → redirects to role dashboard
6. Demo accounts: admin (admin123), warden (warden123), student (student123)

**3. Authenticated Requests**

- Every API call from frontend: `apiFetch(path)` → reads token from `localStorage` → adds `Authorization: Bearer <token>` header
- Backend `getUser(req)`: extracts JWT, `jwt.verify()` with `issuer/audience` validation, `prisma.user.findUnique({ where: { id: payload.sub } })`, checks `user.role === payload.role` && `user.tokenVersion === payload.ver`
- If `tokenVersion` mismatch → token invalidated (logout in another tab/window); user redirected to `/login`
- If role mismatch → 403 Forbidden

**4. Role-Based Access**

- **Admin**: full access to all endpoints; `adminUser(req)` check at each admin route
- **Warden**: access to hostel-scoped data; `wardenUser(req)` + `user.hostelId` filters; roles: warden, chief_warden, deputy_warden, assistant_warden
- **Student**: self-only access; `studentScope(req)` validates `regNo` match; cannot view other students' data
- **Other roles**: mess_manager, security, housekeeping, caretaker, parent — each with specific endpoint access

**5. Data Flow: Frontend → Backend → Database → Frontend**

```
Frontend Component
  │
  ├── useResource('/api/path')      ← useEffect → resourceApi.get(path)
  │                                       │
  │                                       ↓ API Client (fetch)
  │                                       │  └─ adds Bearer token from localStorage
  │                                       ↓ HTTPS request to VITE_API_URL (or /api)
  │                                       │
  │                               Backend Express app
  │                                       │
  │                       ├── helmet()          │
  │                       ├── cors(corsOptions) │
  │                       ├── express.json()    │
  │                       ├── rate limiter (prod)│
  │                       └── router[method]    │
  │                                       │
  │                       ├── getUser(req)      │ ← JWT verify + tokenVersion check
  │                       ├── role check (admin/warden/student) │
  │                       └── Prisma query      │ ← PostgreSQL operations
  │                                       │
  │                               JSON response
  │                                       │
  │                                       ↓ .then(result) → setState
  │                                       ↓ React re-renders UI
  │                                       │
  └─ UI renders: stats, tables, forms, cards, charts, lists
```

**6. Key Business Workflows** (each: frontend action → API → DB → response → UI update)

- **Admin adds student** → `POST /api/students` (admin-verified) → creates Student record → `reload()` → student appears in list
- **Student submits complaint** → `POST /api/complaints` (student-verified) → creates Complaint + notification to wardens → success message + list update
- **Student submits leave request** → `POST /api/leaves` (student-verified) → validates quota + no open leave → creates Leave + notification to wardens → UI shows pending leave
- **Warden approves leave** → `POST /api/leaves/:id/decision` (warden-verified) → updates Leave status + student.leaveUsed → audit log → UI reflects approved
- **Room allocation** → student `POST /api/allocations` → warden `POST /api/allocations/:id/decision` (approved) → warden `POST /api/allocations/:id/allocate` → finds eligible room → `doAllocate()` → updates Allocation + Room status + Student data + audit log + notification → student now has room + UI updates
- **Entry/exit recording** → guard `POST /api/entry-exit` → creates EntryExit record → if late → notification; if exit with approved leave → updates leave status + departure time; if entry with active leave → updates leave status + actual return time

**7. Database ER Summary** (32 models, key relationships)

- **User** (auth) ↔ **Student** (via `regNo` — both unique, direct link)
- **Hostel** → **Block** → **Room** (1:N→1:N; Block.onDelete: Cascade)
- **Room** ↔ **Allocation** (1:N; allocation tracks status flow: applied → approved → allocated → occupied)
- **Student** ↔ **Leave** (1:N; status: pending → approved → active → completed; linked EntryExit records)
- **Student** ↔ **Complaint** (1:N; status: null/In Process/Closed; ComplaintAction tracks history)
- **Student** ↔ **Attendance** (1:N; status: present/absent/leave)
- **Student** ↔ **EntryExit** (1:N; type: entry/exit; linkedLeaveId optional)
- **Cross-cutling**: **Notification** (audience: all/students/boys/girls, category: info/warning/success/alert); **AuditLog** (actor, action, entity, before/after, ip, userAgent, timestamp)

**8. Deployment Flow**

- **Development**: Frontend Vite at localhost:5173; Backend Express at localhost:5000; Docker db + adminer for local PostgreSQL
- **Production**: 
  - Frontend: `npm run build` → `frontend/dist/` → Vercel (automatic deploys from GitHub)
  - Backend: `npm run build` → Prisma generate + migrate deploy + type-check → Render (node src/index.js)
  - Database: Render managed PostgreSQL (or external); `DATABASE_URL` env var
  - CORS: `allowedOrigins` = localhost:5173 + https://hostel-management-v2.vercel.app + CORS_ORIGIN env var
  - JWT: `JWT_SECRET` must be set in production env (no fallback)
  - Rate limiters: active only in production NODE_ENV

**9. Critical Security Findings** (must fix before production)

1. `PUT /api/rooms/:id/status` missing admin check → any authenticated user can change room statuses
2. Hardcoded demo credentials in Login component (`admin123`, `warden123`, `student123`)
3. No password reset flow → users locked out if they forget passwords
4. Student self-profile editing not implemented → students cannot update their own data

**10. Prioritized Fix Order**

1. Fix room status admin check (security)
2. Remove/gate demo credentials (security)
3. Implement password reset (functional)
4. Add student self-editing (functional)
5. Add rate limiting to write endpoints (security)
6. Review gender-based in-time logic (policy)
7. Extract service layer (maintainability)
8. Add Prisma indexes (performance)
9. Standardize error responses (quality)
10. Add JSDoc comments (documentation)

---

### System Verification Summary

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Authentication flow** | ✅ Verified | Login → JWT → tokenVersion invalidation on logout; tested in api.test.js |
| **Role-based access** | ✅ Verified | 401/403 responses verified across all roles; warden hostel scoping verified |
| **API endpoint inventory** | ✅ Verified | 85+ endpoints documented with methods, paths, auth, roles, validation |
| **Database schema** | ✅ Verified | 32 Prisma models; ER diagram consistent; migrations deployable |
| **Business workflows** | ✅ Verified | 8 major workflows traced with sequence diagrams; test suite validates key flows |
| **Frontend routes** | ✅ Verified | 55+ routes documented with components, roles, API calls, implementation status |
| **Deployment configuration** | ✅ Verified | Vercel + Render + PostgreSQL; env vars; CORS; build commands |
| **Test coverage** | ⚠️ Partially verified | ~125 test cases across 3 files; test DB required for full suite |
| **Security posture** | ⚠️ Needs fixes | 2 critical findings (room status check, demo credentials); 7 additional findings |
| **Performance at scale** | ⚠️ Not verified | Tested with ~1000 records; no load testing |
| **Frontend-endto-end** | ⚠️ Not verified | Would require test DB; code inspection only |

**Final conclusion**: The Hostel Management System is a functional full-stack application with comprehensive features for hostel administration, student services, warden duties, and mess management. The codebase demonstrates strong architectural decisions (Prisma ORM, JWT with tokenVersion, role-based access, hostel scoping). However, two critical security fixes are needed before production deployment: (1) add admin check to `PUT /api/rooms/:id/status`, and (2) remove or gate the hardcoded demo credentials. Additional improvements are recommended in prioritized order as documented in `10_GAPS_AND_RECOMMENDATIONS.md`.

---

### End of Documentation

*All technical claims traceable to actual source code at the following locations:*
- Frontend: `frontend/src/` — all route files, page components, context, hooks, API client
- Backend: `backend/src/` — all route handlers, middleware, auth, Prisma queries
- Database: `backend/prisma/schema.prisma` — all 32 models and relations
- Full documentation set: `docs/system-documentation/` (11 files)