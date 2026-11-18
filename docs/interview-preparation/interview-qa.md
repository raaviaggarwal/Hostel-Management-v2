# ZS Associates BTSA Project Interview Preparation

## Accuracy policy

This document is based on the implementation currently present in the repository. It distinguishes:

- **Implemented:** verified in source, schema, configuration, or tests.
- **Inferred:** reasonable from the code, but not explicitly documented.
- **Potential future improvement - not currently implemented:** a recommendation only.
- **Not verifiable from the provided project:** information the repository does not establish.

The repository does not prove personal authorship, production usage, cloud deployment, customer adoption, performance metrics, revenue, or business outcomes. Do not claim those without independent evidence.

## Project overview

### Project name

Hostel Management v2.

### Problem and users

The system coordinates university hostel operations: hostels, blocks, rooms, student profiles, accommodation applications, room allocation, leaves and out-passes, entry/exit, attendance, complaints, mess services, housekeeping, inventory, medical incidents, notices, reports, audit logs, notifications, and settings.

Verified roles are admin, warden, chief warden, deputy warden, assistant warden, student, parent, security, mess manager, caretaker, and housekeeping. The role-to-portal mapping is implemented in `frontend/src/routes/navigation.jsx` and `frontend/src/App.jsx`.

### Business use case

An institution can give different users role-specific screens and API workflows. Students submit applications, leave requests, complaints, and mess feedback. Wardens and administrators manage accommodation and operations. Security records movement. Parents view linked ward information. Mess, caretaker, and housekeeping roles manage their operational areas.

The repository does not verify a real customer, payment model, user count, or quantified business impact.

## Architecture

```text
React 19 + Vite + React Router + Ant Design + Recharts
        |
        | apiFetch/resourceApi, bearer JWT
        v
Express createApp()
  Helmet -> CORS -> JSON parser -> production rate limits
        |
        v
Single router: backend/src/routes/index.js
  route-local auth helpers + domain helpers + Prisma calls
        |
        v
Prisma Client
        |
        v
PostgreSQL
```

### Request lifecycle

1. The browser opens a React route.
2. `ProtectedRoute` checks cached client authentication and role.
3. A page calls `apiFetch` or `resourceApi` in `frontend/src/api/client.js`.
4. The client adds `Authorization: Bearer <token>` from `localStorage`.
5. `backend/src/app.js` applies Helmet, CORS, JSON parsing, and production rate limits.
6. The `/api` router dispatches the request.
7. A handler may call `getUser`, `adminUser`, `wardenUser`, `studentScope`, or another role helper.
8. Domain helpers perform validation/business checks and Prisma reads/writes.
9. Important workflows may create `AuditLog` and `Notification` records.
10. JSON returns to the page, which updates local state or displays an error.

There is no separate controller, service, repository, or global authentication directory. Route handlers and domain helpers are concentrated in `backend/src/routes/index.js`.

## Technology stack: verified facts and tradeoffs

| Technology | Verified use | Why it fits | Alternative/tradeoff |
|---|---|---|---|
| JavaScript/JSX | Server and React source | One language across frontend/server | TypeScript could improve contract safety; not currently used across the app. |
| React 19 | Frontend UI | Component and portal-based UI | Other UI frameworks were possible; no evidence they were evaluated. |
| Vite | Client dev/build | Fast frontend tooling | Webpack/Next.js are alternatives; SSR is not verified here. |
| React Router | Role routes/layouts | Nested protected portals | Server-side routing is not used for the SPA. |
| Ant Design | Tables, forms, modals, theme | Useful for operations-heavy screens | Custom UI would give more control but more maintenance. |
| Recharts | Dashboard charts | React chart components | A chart library is present; the exact visual requirements are project-specific. |
| Node.js/Express | HTTP API | Familiar middleware and quick iteration | A structured framework could enforce modules, but rewriting is not the first need. |
| Prisma | ORM/frontend/migrations | Relational schema and generated client | SQL is still useful for locking and complex reports. |
| PostgreSQL | Database provider | Relationships, constraints, transactions | A document database would be a worse fit for core relational workflows. |
| JWT/jsonwebtoken | Bearer authentication | Signed identity/role/version claims | Cookies/session storage are alternatives with different CSRF/XSS tradeoffs. |
| bcryptjs | Password comparison | Password hashing without native build dependency | Async comparison should replace synchronous comparison under load. |
| Helmet | HTTP security headers | Baseline hardening | It does not replace authorization or input validation. |
| CORS | Origin policy | Controls browser origins | It is not authentication or CSRF protection. |
| express-rate-limit | Production API/login limiting | Basic abuse control | A shared store is needed for multiple API instances. |
| Vitest/Supertest/Testing Library | Tests | Unit/UI/API integration testing | Full browser E2E and load testing are not verifiable. |
| Docker Compose | Local PostgreSQL/Adminer | Repeatable local database setup | Cloud deployment is not verified. |

No AI/ML, OAuth, Redux, Redis, refresh-token system, message queue, CDN, Kubernetes, or cloud provider is verifiable from the project.

## Core workflows

### Login

`Login.jsx` calls `authApi.login`, which calls `POST /api/auth/login`. The server queries `User` by username/email, compares bcrypt, signs `{sub, role, ver}` in `signToken`, and returns `{token, user}`. `AuthProvider` stores token, user, and a client expiry in local storage. `getUser` later verifies the JWT and reloads the database user.

### Allocation

`studentScope` binds the authenticated user's `regNo` to a `Student`. The application route checks for an existing active application, applies `eligibleHostels`, and creates an `Allocation`. Staff can decide, allocate, check in, transfer, or cancel. `findRoomFor` searches available non-medical rooms and uses derived occupancy. `doAllocate` updates allocation, room, and student placement, then writes audit and notification records.

Important limitation: these writes are separate Prisma calls. A transaction and concurrency control are potential future improvements, not current verified behavior.

### Leave and movement

A student creates a leave request through `/leaves`; the code checks settings and student scope. Staff transition leave status, and gate operations create `EntryExit` records. The route family is a business state machine, but server-side authorization and transaction coverage are inconsistent and must be discussed honestly.

### Dashboard and search

Pages call dashboard/list endpoints through `apiFetch` or `useResource`. Some endpoints return arrays, while others return objects/envelopes such as `{stats, charts}`, `{items, total}`, or `{members, meetings}`. `useResource` converts non-array responses to `[]`, which is a verified response-shape risk.

## Authentication and security

`backend/src/auth.js` defines `signToken`, `verifyToken`, `publicUser`, the JWT issuer/audience, bcrypt rounds, and warden roles. JWT expiry defaults to 24 hours. Production requires `JWT_SECRET`; development has a fallback secret.

`getUser` reads the bearer header, verifies signature/issuer/audience, reloads the user, and checks role and token version. Logout increments `User.tokenVersion`, invalidating old tokens. This is database-backed revocation, not a token blacklist.

Current risks:

- The client stores bearer tokens in `localStorage`, exposing them to successful XSS.
- There is no global auth middleware; every route must opt in.
- Several sensitive reads and mutations do not consistently enforce server-side role/ownership checks.
- `publicUser` removes the password but does not necessarily remove every internal field.
- `/wardens` should use an explicit safe field selection rather than a raw user projection.
- Login uses synchronous bcrypt comparison.
- No signup, OAuth, refresh token, MFA, or cookie session is verified.

Potential future improvement - not currently implemented: central `requireAuth`, `requireRole`, and resource policy middleware; request schemas; HttpOnly cookie sessions or a documented bearer-token threat model; CSP; async bcrypt; and cross-hostel IDOR tests.

## Database

The Prisma schema targets PostgreSQL and contains models including `User`, `Hostel`, `Block`, `Room`, `Student`, `Allocation`, `Complaint`, `ComplaintAction`, `InventoryItem`, `HousekeepingTask`, `Attendance`, `EntryExit`, `Notice`, `Leave`, `MessMenu`, `MessFeedback`, `MessComplaint`, `MessInspection`, `WifiAccessPoint`, `MedicalDispensary`, `MedicalIncident`, `CommitteeMember`, `CommitteeMeeting`, `AuditLog`, `Notification`, and `Setting`.

Core relations:

```text
Hostel -> Block -> Room
Student -> Allocation -> optional Room
Student -> Complaint -> ComplaintAction
Student -> Attendance, EntryExit, Leave, MessFeedback,
           MessComplaint, MedicalIncident
User -> role and optional student/hostel/block links
```

Some IDs are application-level references rather than declared relations. Dates and statuses are often strings. Placement is denormalized across `Student`, `Room`, and `Allocation`.

Potential future improvement - not currently implemented: typed date fields, status enums/checks, composite uniqueness, foreign keys for denormalized references, indexes based on query plans, transactions, and reconciliation jobs.

## Key code-level questions

### Question 1: Tell me about your project.

**Category:** Project, Easy

**What the interviewer is testing:** Clear business and technical summary.

**Best Answer:** Hostel Management v2 is a role-based hostel operations platform. It centralizes rooms, student allocation, leave, gate movement, complaints, attendance, mess, housekeeping, medical, notices, and reporting. The frontend is React/Vite with role-specific portals. The backend is an Express API using Prisma with PostgreSQL. Authentication uses bcrypt and JWTs with database token-version invalidation. It is a compact monolith, and the most important production improvements would be authorization consistency, validation, and transactional workflow updates.

**Project Evidence:** `frontend/src/App.jsx`, `frontend/src/api/client.js`, `backend/src/app.js`, `backend/src/routes/index.js`, `backend/prisma/schema.prisma`.

**Follow-up:** What is the most important workflow?

**Follow-up Answer:** Room allocation, because it connects student identity, eligibility, capacity, placement, audit, notifications, and staff decisions.

**Interview Warning:** Do not claim users, customers, revenue, or production scale that are not verified.

### Question 2: Explain the request lifecycle.

**Category:** Architecture, Medium

**What the interviewer is testing:** Whether you understand all layers.

**Best Answer:** A React page calls `apiFetch`; the client adds the bearer token and sends `/api` request. Express applies Helmet, CORS, JSON parsing, and production rate limits. The router invokes a local auth helper, business helper, and Prisma query. The response is JSON, and the page updates state or handles an error. Important actions can also create audit and notification records.

**Project Evidence:** `apiFetch`, `createApp`, `getUser`, `prisma`, `logAudit`, and `addNotification`.

**Follow-up:** Is there a global authentication middleware?

**Follow-up Answer:** No. Authentication is route-local through helpers such as `getUser`; this is a maintainability and security risk because a new route can forget to call it.

**Interview Warning:** Do not describe a controller/service pipeline that does not exist.

### Question 3: Why did you choose this architecture?

**Category:** Architecture, Medium

**What the interviewer is testing:** Decision-making and tradeoffs.

**Best Answer:** The monolith is appropriate for a relational operational product with one team and closely connected workflows. It simplifies deployment and lets the API and database share one consistency boundary. The tradeoff is that `routes/index.js` contains too many responsibilities. I would first extract internal domain modules and policies, then consider services only after load, ownership, or failure-isolation requirements are demonstrated.

**Project Evidence:** Single router and Prisma schema.

**Follow-up:** Why not microservices now?

**Follow-up Answer:** They would introduce distributed consistency, contract management, tracing, and operational overhead before the project proves a need. Allocation is strongly relational and is easier to keep consistent in a modular monolith initially.

### Question 4: Explain authentication.

**Category:** Security, Medium

**Best Answer:** Login finds a user by username/email, compares the password with bcrypt, and signs a JWT containing user ID, role, and token version. The frontend stores the token and user. Protected handlers verify the token and reload the user to compare role and token version. Logout increments the database token version, invalidating old tokens. There is no verified signup, OAuth, refresh-token endpoint, or cookie session.

**Project Evidence:** `backend/src/auth.js`, `/auth/login`, `getUser`, `/auth/logout`, `frontend/src/context/AuthContext.jsx`.

**Follow-up:** Why reload the user from the database?

**Follow-up Answer:** JWT claims can become stale after role changes, account deletion, or logout. The lookup makes the current database record authoritative.

### Question 5: Is `ProtectedRoute` security?

**Category:** Security, Hard

**Best Answer:** It is client-side navigation protection, not API security. A caller can bypass React and call the API directly. The server must enforce authentication, role, hostel scope, student ownership, and resource-level permissions. The current code has helpers for some of these but not consistent coverage across all sensitive routes.

**Project Evidence:** `frontend/src/routes/ProtectedRoute.jsx` and server auth helpers.

**Follow-up:** What would you add?

**Follow-up Answer:** Central `requireAuth`, `requireRole`, and policy functions such as `canAccessHostelResource`, then direct API tests for missing, wrong-role, and cross-hostel requests.

### Question 6: What happens if two users allocate the same room?

**Category:** Database/concurrency, Very Hard

**Best Answer:** Both requests can read the same available capacity before either writes. The current code does not show a transaction and row lock around selection and updates, so over-allocation or inconsistent status is possible. I would use a transaction, lock or version the room, re-check capacity inside the transaction, reject if unavailable, and retry safe serialization conflicts.

**Project Evidence:** `findRoomFor` and `doAllocate`.

**Follow-up:** How would you test it?

**Follow-up Answer:** Use a one-bed remaining room, send concurrent allocation requests, assert only one succeeds, and verify the final student/room/allocation state.

**Interview Warning:** Do not claim the current schema enforces room capacity.

### Question 7: What is the biggest security risk?

**Category:** Security, Hard

**Best Answer:** There are two related risks: bearer tokens in `localStorage` are exposed to XSS, and server-side authorization is inconsistent because some routes do not consistently require authentication and ownership checks. I would prioritize central API authorization and IDOR protection, then improve token storage/CSP and input validation. I would test the API independently of the UI.

### Question 8: What is the biggest performance concern?

**Category:** Performance, Hard

**Best Answer:** The visible concerns are N+1 allocation lookups when listing students, broad reads, in-memory aggregation, and inconsistent database-level pagination. I would profile first, then add indexes, bounded queries, safe field selection, batched lookups, and read models or caching where measurement justifies them. No performance improvement or metric should be claimed without a benchmark.

**Project Evidence:** `studentActiveAllocation`, `roomOccupancyMap`, `paginate`, and `paginateList`.

### Question 9: What testing exists?

**Category:** Testing, Medium

**Best Answer:** The server uses Vitest and Supertest with Prisma seed data for API workflows such as authentication, logout invalidation, dashboards, room occupancy, warden scope, and allocation. The client tests auth, protected routes, navigation, formatting, breadcrumbs, and table filtering with Vitest and Testing Library. Full browser E2E, load testing, coverage percentage, and production monitoring are not verifiable.

**Project Evidence:** `backend/tests/api.test.js` and `frontend/src/__tests__/`.

### Question 10: What would you change before production?

**Category:** Production readiness, Hard

**Best Answer:** First, centralize authentication and ownership authorization and fix sensitive unauthenticated routes. Second, add request schemas, safe projections, status/date validation, consistent errors, and transactions for allocation and leave/gate workflows. Third, add indexes, remove N+1/unbounded work, and add structured logs, request IDs, health checks, metrics, and backup/recovery tests. Caching, queues, and services should follow measurement rather than precede basic correctness.
## Added interview chain and deep-dive Q&A

The following questions and answers are grounded in the repository’s verified implementation and should be treated as the code-backed explanation path for a project discussion.

### 1. Explain the complete project

**Answer:** Hostel Management v2 is a role-based hostel operations management system. It allows students to apply for rooms, submit complaints, create leave requests, view notices, submit mess feedback, and review their own attendance and profile. It allows wardens, admins, security, mess staff, housekeeping, and parent-facing workflows via a unified Express API and a React SPA with role-aware screens.

### 2. Explain architecture

**Answer:** The frontend uses React 19, Vite, React Router, Ant Design, and Recharts. The backend uses Node.js, Express, a single route file in `backend/src/routes/index.js`, JWT helpers in `backend/src/auth.js`, and Prisma-generated SQL access to PostgreSQL. Requests move from `apiFetch()` into `/api` routes, route-local auth helpers, Prisma-domain helpers, and database writes. Data access is strongly relational through the Prisma schema.

### 3. Explain login flow

**Answer:** Login route `POST /auth/login` accepts `usernameOrEmail` and `password`, looks up the `User` record in `prisma.user.findFirst()`, compares the submitted password with the stored bcrypt hash via `bcrypt.compareSync`, and returns a signed JWT and a public user object. Client-side `AuthContext` persists the token in local storage and the app stores the expiry and user snapshot.

### 4. Explain JWT

**Answer:** The JWT created in `backend/src/auth.js` includes `sub`, `role`, and `ver` claims, where `sub` is the user id, `role` is the assigned role, and `ver` is the `tokenVersion` field. It is signed with `jsonwebtoken` and includes issuer, audience, expiry, and unique `jwtid` metadata.

### 5. Explain JWT verification

**Answer:** `verifyToken(token)` verifies the signature and checks issuer and audience. In the route helper `getUser(req)`, the server parses the `Authorization: Bearer <token>` header, calls `verifyToken`, then queries `prisma.user.findUnique({ where: { id: payload.sub }})`. It confirms that the database user still exists, that the user role still matches the payload role, and that `tokenVersion` still matches the token’s `ver` claim.

### 6. Explain RBAC

**Answer:** RBAC is implemented with route-local role helper functions. `adminUser`, `wardenUser`, `messUser`, `staffHostelUser`, `guardUser`, `parentUser`, and `studentScope` each decide whether a request belongs to the right role. The frontend also uses `ProtectedRoute` to prevent role-mismatched screens from rendering. This is a practical role-gating model rather than a formal policy engine.

### 7. Explain role-based middleware

**Answer:** The project does not implement a separate role-based middleware file. Instead, the route file itself implements authorization by invoking helpers before database work. Authorization is therefore route-local and consistency depends on every route developer remembering to call the correct helper. This is a weakness in production, but it is the repository’s verified pattern.

### 8. What happens if a student calls an admin API?

**Answer:** If a student sends a valid JWT but calls a route that checks only `adminUser(req)`, the request is rejected with `401 Unauthorized` because the helper returns `null` for non-admin users. On the client side, `ProtectedRoute` also blocks the role-nonmatching UI page. However, if an admin-only route forgets to check the helper, the request could still reach the DB. That is a danger point and one of the largest security improvement topics.

### 9. Why bcrypt?

**Answer:** `bcryptjs` is used because it is a standard password hashing library that can verify a user-supplied password against a stored password hash without storing plaintext data. This is safer than reversible encryption and is already the repository’s verified pattern through `bcrypt.compareSync` in the login route.

### 10. Hashing vs encryption

**Answer:** Encryption is reversible. It can take a plaintext value and turn it into an unreadable but reversible value with a key. Hashing is one-way; the system stores a digest and compares a candidate input to that digest, but the digest cannot be retrieved directly. Password storage should be hashed, not encrypted. Here, `bcrypt.compareSync` is acting as the secure password-verification mechanic, and the stored password is a bcrypt hash in the database.

### 11. Explain database schema

**Answer:** The schema in `backend/prisma/schema.prisma` is a relational PostgreSQL model with `User`, `Hostel`, `Block`, `Room`, `Student`, `Allocation`, `Complaint`, `ComplaintAction`, `Attendance`, `EntryExit`, `Leave`, `MessMenu`, `MessFeedback`, `MessComplaint`, `MessInspection`, `InventoryItem`, `HousekeepingTask`, `WifiAccessPoint`, `MedicalDispensary`, `MedicalIncident`, `Notice`, `CommitteeMember`, `CommitteeMeeting`, `AuditLog`, `Notification`, and `Setting`. These tables model hostel operations and are connected through foreign keys and relational references.

### 12. Explain Prisma

**Answer:** Prisma is the ORM used in the repository. It gives a typed client for PostgreSQL and manages the model relationships from `schema.prisma`. Route handlers call `prisma.<model>.findMany`, `findUnique`, `findFirst`, `create`, `update`, and `deleteMany` directly. This means Prisma is both the database access layer and the source of object-level query behavior.

### 13. Explain complaint workflow

**Answer:** A student creates a complaint through `POST /complaints` by filling `complaintType`, `complaintDetails`, and optional `preferredVisitingHours`. The route uses `studentScope(req)` to locate the student and creates a `Complaint` row with `complaintStatus: null` and a registration timestamp. A warden/admin or route-local user can then call `POST /complaints/:id/action` to update the complaint status and push a `ComplaintAction` audit row. The workflow adds a `ComplaintAction` history record and writes an audit log using `logAudit()`.

### 14. Explain leave approval workflow

**Answer:** A student creates `POST /leaves` with a date range, destination, reason, and optional parent approval timeline. The route checks for an open leave and a leave quota from settings. A warden or authorized staff workflow can transition the leave via `POST /leaves/:id/decision` by changing `status` and syncing `student.leaveUsed`. Later, `/leaves/:id/activate` creates an `EntryExit` record of type `exit`, and `/leaves/:id/complete` creates an `EntryExit` record of type `entry`, completing the leave lifecycle in the database.

### 15. Explain room allocation

**Answer:** The route `POST /allocations` creates an allocation application from the student and validates eligibility using `eligibleHostels(student)` and preferences. A later `POST /allocations/:id/allocate` checks that the allocation is approved or waitlisted; then `findRoomFor()` selects a room based on room preferences, gender/hostel eligibility, and room capacity. `doAllocate()` writes the allocation record, room status, student room assignment, and emits audit and notification records.

### 16. How do you prevent duplicate room allocation?

**Answer:** In the repository, the code prevents a student from having an active application through `studentActiveAllocation()` before creating an allocation. During room allocation, `roomOccupancyMap()` calculates the current occupancy of a room and `findRoomFor()` filters using the seat capacity and medical reserved status. This prevents the selector from offering rooms already full. However, the repository does not yet use a transaction or row-level lock to prevent duplicate concurrent writes in production.

### 17. What happens with concurrent requests?

**Answer:** The current app will process concurrent allocation requests independently because `findRoomFor()` and `doAllocate()` are separate operations with no transaction or locking. If two requests evaluate occupancy at the same moment, both may see the room as available and both may choose it. The schema’s actual room capacity is not guarded by a database constraint. A production-safe design should use a transaction, `SELECT FOR UPDATE`, or an application-level lock around the room update.

### 18. Where is authorization enforced?

**Answer:** Authorization is enforced mainly in the route file via helper functions such as `adminUser(req)`, `wardenUser(req)`, and `studentScope(req)`. The request can only continue after the helper returns a verified user object. Client-side `ProtectedRoute` screens also enforce role mapping before the page loads. However, consistency across all routes is not guaranteed because there is no central policy middleware.

### 19. Why PostgreSQL?

**Answer:** PostgreSQL is a strong relational database choice for hostel data because the schema has relationships, constraints, reporting, and operational data that are easier to express in tables. Prisma is configured against `postgresql` and the project’s data schema uses the relational model heavily. It is a good fit for room occupancy, allocation, attendance, leave records, complaints, and audit tables.

### 20. What would you improve in production?

**Answer:** I would add central authorization middleware, consistent validation middleware, request schemas, transactions around allocation/leave transitions, concurrency-safe room selection, database indexes, structured logs, observability, and a service layer extraction. I would also shift JWT storage to secure cookie or safer token strategy, add Redis for cache and rate limiting, and improve the route file by separating high-risk business logic into domain modules.

## High Priority Questions

### 1. JWT vs sessions

**Answer:** A JWT is a signed, bearer token that carries identity and role claims. A session uses a server-side token or session record that the server looks up. JWTs are easier to pass across services but are harder to revoke by default unless you store token versions or use a blacklist. Sessions are more server-control friendly but require the session store / cookie model. This repo uses JWTs only and stores token in localStorage.

### 2. JWT security

**Answer:** JWT security depends on a strong `JWT_SECRET`, correct issuer and audience verification, token expiry, token versioning, and avoiding placement in browser storage that is vulnerable to XSS. This repository verifies issuer and audience and uses `tokenVersion` to invalidate sessions. The biggest weakness is client-side local storage storage.

### 3. JWT expiration

**Answer:** `JWT_EXPIRES_IN` defaults to `24h`. The token is meant to be short-lived, and database-backed `tokenVersion` creates a complete revocation path. Expiry is a separate security control and must be shorter than business tolerance.

### 4. JWT theft

**Answer:** If a token is stolen, a valid bearer token can be replayed by an attacker until expiry or version mismatch. In this project, a stolen token would be valid until the server sees `tokenVersion` mismatch on a logout or system invalidation. Prevention includes HttpOnly cookies, CSP, XSS prevention, token rotation, short expiry, and secure transport.

### 5. Password security

**Answer:** Passwords should never be stored in plain text. This repository uses `bcryptjs` and compares using `bcrypt.compareSync`. In production, I would make password hashing asynchronous, add rate limits on login, and use password policy and account lockout rules.

### 6. SQL injection

**Answer:** Prisma uses parameterized queries, so the route handlers are mostly protected from classic SQL injection in the normal ORM path. User-provided strings still need validation and normalization because string search and dynamic filters can become unsafe if filters or relations are not hard-coded. This repository does not show raw SQL; Prisma is used consistently.

### 7. CORS

**Answer:** CORS is configured in the Express app using `app.use(cors({ origin: allowedOrigins }))`. This restricts which browser origins can send requests to the server. It does not provide authentication, but it is useful in limiting browser-level cross-origin attacks.

### 8. REST API design

**Answer:** The code uses REST-like resource endpoints with `GET`, `POST`, `PUT`, `DELETE`, and custom action endpoints like `POST /allocations/:id/allocate`. The API is resource-oriented in route naming, but the service boundary is not fully formalized, and there is no OpenAPI contract. It is not a clean, strict design but is easy to follow.

### 9. HTTP status codes

**Answer:** The route file uses a consistent pattern with `ok(res, payload, status=200)` and `fail(res, message, status=400)` plus standard HTTP statuses for success and unauthorized/errors. Examples include `404` for not found, `401` for unauthorized, and `201` for create success. I would improve this with a consistent error model and a common error envelope.

### 10. Prisma vs raw SQL

**Answer:** Prisma is more maintainable for a relational application with many models and relationships. Raw SQL can give explicit performance tuning and analytics but increases query correctness complexity and eliminates type safety. Prisma is a better match for the codebase’s schema- and route-driven CRUD pattern.

### 11. Database relationships

**Answer:** The repository represents relationships mostly through relational fields in Prisma and route access patterns: `Hostel` has `Room`, `Block`, and `User`; `Room` is related to `Student` and `Allocation`; `Student` owns complaints, leaves, attendance, entry-exit records, and medical records. Those relationships model hostel operational data and enforce lifecycle semantics in the schema.

### 12. Primary/foreign keys

**Answer:** Prisma `@id @default(autoincrement())` models are primary keys, and relation tables such as `Block.hostelId` and `Room.hostelId` serve as foreign keys. The schema has full relation support and many powerful relational mappings. However, some references like `Allocation.roomId`, `Student.hostelId`, and `Student.roomId` are modeled as optional fields rather than declared relations with strict constraints.

### 13. Indexes

**Answer:** The present schema uses `@id` and `@unique` markers like `User.username`, `email`, and `Student.regNo`. It does not show a full App-created index list for analytics-heavy queries like `FindMany({ where: { hostelId }})`, `where: { studentId }`, or route text search. In production, I would add indexes for `hostelId`, `studentId`, `roomId`, `date`, `status`, and any heavily filtered route queries.

### 14. Transactions

**Answer:** The route file does not use `prisma.$transaction()` for necessary multi-table workflows. For example, room allocation writes user information and room information separately. A transaction should protect the steps that should be atomic: room capacity check, allocation record patch, room update, student room update, audit/log event, and notification record. This is a current gap.

### 15. ACID

**Answer:** PostgreSQL is ACID-compliant and is a good fit for operations that need consistency, such as room allocation, leave transitions, or assignments with respect to student records. The application uses separate calls to the database and lacks many transactions, so ACID consistency across the whole workflow is not yet fully guaranteed by the code.

### 16. Race conditions

**Answer:** Race conditions appear when many requests select the same room or reach a `POST /allocations/:id/allocate` endpoint at the same time. Since occupancy is read before write, two requests can pass the room availability check, then both update the same student or room record. A production-safe design adds transactions and row locking or an atomic capacity check.

### 17. Leave request edge cases

**Answer:** The leave flow checks for an existing open leave record and ensures the `leaveTotal` quota is not exceeded. It also generates `EntryExit` records when status transitions occur. An edge case is when a student submits a leave with a date range that overlaps another active leave or schedules an `approved` leave that is later activated. The project has basic validation but not an exhaustive state-machine model.

### 18. Complaint status transitions

**Answer:** The complaint model uses a nullable `complaintStatus` and an action-history model `ComplaintAction`. The route `POST /complaints/:id/action` updates the complaint status and writes a new action row. The app tracks the current complaint status and history. In production, I would enforce `new -> inprocess -> closed` transitions with a proper enum and guard checks.

### 19. Room capacity

**Answer:** A `Room` stores `seater` and `status`. Occupancy is derived from students with `roomId`. In the route layer, occupancy map and candidate room selection are computed from students and room capacity. Capacity is checked by comparing candidate occupancy length `< room.seater`. This is a route-level business rule rather than a schema constraint.

### 20. API error handling

**Answer:** The route file uses a `fail(res, message, status)` helper for user-facing API errors and a `wrap(fn)` wrapper that catches asynchronous exceptions and forwards them to Express error handling. On the client, `apiFetch()` parses JSON and throws a `Error` that carries a `status` field. In production, I would expand the error model to include error codes, correlation IDs, request IDs, and structured server logs.

## Deeper Questions

### 1. Database normalization

**Answer:** The schema is relational and normalized in the usual sense for institutional data: rooms belong to hostels and blocks, students belong to hostels and rooms, complaints belong to students, and actions belong to complaints. However, some data such as `roomNo`, `hostelId`, `blockId`, `bedNo`, and `hostelPrefs` are duplicated or denormalized across records, especially in the Allocation and Student tables. This design prioritizes local workflow convenience and speed.

### 2. N+1 queries

**Answer:** The implementation has several route flows where object lists are fetched and then additional data is read in a loop. For example, `students` list includes `allocationStatus` by calling `studentActiveAllocation(s)` per student in a loop. That is an N+1 pattern. Production should reduce such loops with batched queries or denormalized tables.

### 3. Query optimization

**Answer:** The route file uses `findMany`, `findUnique`, and `count` operations with `where` filters and pagination. It also uses `Promise.all` for some dashboard aggregations. Query optimization would include indexes on `studentId`, `hostelId`, `roomId`, `status`, `date`, and strings associated with search. I would measure the exact hot query path and add indexes where the route file proves the bottleneck.

### 4. Connection pooling

**Answer:** Prisma uses a pooled database client and PostgreSQL connection pool should be configured externally in production. The repository only implements a single `PrismaClient` instance and does not show explicit pooling configuration. This is an area where `DATABASE_URL` settings and pool size telemetry matter in scale.

### 5. Database scaling

**Answer:** PostgreSQL can scale through read replicas, partitioning by date or entity, connection pooling, stronger indexes, and query workload separation. Since the app is a relational operational system, sharding and microservice splitting should happen only after demand and data partitioning requirements justify it.

### 6. Caching

**Answer:** The repository does not implement Redis or cache layers. The observed candidates for caching are `hostels`, `rooms`, `settings`, notices, mess-menu, and dashboard count pre-aggregation. Caching is useful for read-heavy endpoints but must avoid returning stale hostel or room data without invalidation events.

### 7. Horizontal scaling

**Answer:** The current server is a single Express node application. It can be scaled horizontally by placing several Express instances behind a load balancer. However, the app uses `localStorage` only on client, not shared server sessions. JWT-style stateless token auth works well in a horizontally scaled cluster. Shared state for rate limiting and notifications would need an external cache or shared DB.

### 8. Handling 100,000 students

**Answer:** A monolithic route file and a single PostgreSQL node database become expensive. I would keep the same relational domain but add read replicas, indexes, query caches, a split dashboard/reporting model, a background job for asynchronous notification/audit operations, and careful pagination. I would also audit all list endpoints for full scans and concurrency risk.

### 9. Production security

**Answer:** Production security would include more than the current Helmet, CORS, JSON parsing, and rate limiting. I would implement role policy middleware in one place, stronger field filtering, password policy, secure secret management, CSRF where cookies are used, standardized error handling, OAuth or SSO integration if needed, and automated security tests for IDOR, inventory, and room assignment privilege boundaries.

### 10. Redesign the entire system for production

**Answer:** I would move from a single route file toward a modular monolith or layered services architecture: API layer, application service layer, domain policy module, repository/Prisma layer, and observability/infrastructure services. I would introduce typed DTOs, schema validation, central permission checks, transactions, caching, background workers for audit/notifications, better indexes, and a read model for reports and dashboards. In a production redesign, I would convert the route-level policy logic into a policy engine and enforce cross-resource consent checks with tests.

## Why questions

### Why React?

React is verified in the client and fits componentized role portals, shared layouts, tables, forms, and reusable controls. `App.jsx` and route files demonstrate that structure. A server-rendered or different SPA framework could be appropriate, but the repository does not document a comparison. Do not claim React was selected after a measured benchmark.

### Why Express?

Express provides the middleware and routing primitives used by `app.js` and the router. It is simple for a compact API. The tradeoff is that structure and authorization conventions must be created by the team; a more opinionated framework could help, but migration is not currently justified by repository evidence.

### Why Prisma?

Prisma maps the relational schema to generated JavaScript client calls and supports migrations. It reduces repetitive SQL and makes relations readable. Complex reporting and row-locking may still require explicit SQL or careful transaction usage.

### Why PostgreSQL?

The domain has relational ownership and capacity rules. PostgreSQL supports joins, foreign keys, transactions, indexes, and operational reporting. A document store could be useful for some flexible records, but the repository does not show a need to replace the relational source of truth.

### Why JWT?

JWT gives the API a signed bearer credential containing minimal identity/role/version claims. The database token version supplies revocation. The tradeoff is token exposure risk and a database lookup for protected requests. Refresh tokens and cookie sessions are not implemented.

### Why Ant Design?

The product is operations-heavy and needs tables, forms, modals, notifications, status tags, and themes. Ant Design provides those primitives. It reduces custom UI work, but the team still must test accessibility, bundle size, and visual behavior.

## What-if questions

### What if the API goes down during a leave submission?

**Testing:** Failure handling and idempotency.

**Answer:** The UI should not display success without a successful response. The server should support an idempotency key or safe lookup so a retry cannot create duplicates. Current generic error handling exists, but idempotent mutation support is not verifiable. A transaction should cover the leave and its notification decision.

### What if the database connection fails?

**Testing:** Operational resilience.

**Answer:** Current Prisma failures reach the generic 500 handler. A production design would add readiness checks, structured database error metrics, bounded retries for safe reads, careful handling of writes, connection-pool limits, and managed database recovery. Automatic failover is not verifiable.

### What if invalid input is sent directly to the API?

**Testing:** Trust boundary.

**Answer:** The server must validate independently of the frontend. The current `pick` helper limits fields and numeric conversion exists, but comprehensive type/range/cross-record schema validation is not verified. Add schemas, reject unknown fields, validate relationships and state transitions, and return field-level errors.

### What if users increase 100 times?

**Testing:** Scaling judgment.

**Answer:** First address N+1, unbounded reads, in-memory aggregation, missing indexes, and database connection load. Then add observability, database pagination, low-risk caching, API replicas, and queues for notifications/reports. Read replicas or projections come after measured read pressure. No 100x result is currently verified.

### What if requirements change?

**Testing:** Consulting mindset.

**Answer:** Identify the affected user workflow and invariant, clarify acceptance criteria with the decision owner, estimate impact, document the tradeoff, and add or update tests before changing the API contract. Keep changes additive where possible and version breaking changes.

## Business and behavioral preparation

### How would you explain it to a non-technical stakeholder?

“It gives each hostel role the right screens and actions for rooms, students, leave, movement, and issues, while keeping connected records so staff can make decisions from consistent information.”

### How would you measure success?

Potential KPIs are allocation turnaround, occupancy accuracy, leave processing time, complaint resolution time, gate-record completeness, API availability, and failed workflow rate. Current values are not verifiable from the project.

### Tell me about a challenge.

Use a truthful story from your actual work. A code-grounded example is allocation consistency: one workflow affects allocation, room, student, audit, and notification. Explain the symptom, investigation, fix, test, and lesson. Do not claim you personally solved it unless your history confirms that.

### Tell me about a failure or mistake.

A credible project lesson is that client-side route protection can create false confidence if API authorization is not equally centralized. Explain how you would detect this through direct API tests and correct it with server-side policies. Personal ownership of this mistake is not verifiable from the repository.

### How do you handle disagreement?

Clarify the business objective, compare options using impact, risk, effort, and maintainability, document the decision, and prototype the highest-risk assumption. The project itself does not verify a particular team disagreement.

### How do you estimate a feature?

Break the workflow into UI, API, schema/migration, authorization, tests, migration/backfill, deployment, and operational work. Identify unknowns and dependencies, provide a range, and refine after a spike. Do not estimate from only the number of screens.

## Debugging playbooks

### API 500

Check the exact route and redacted payload, reproduce with Supertest, classify parsing/auth/validation/Prisma/application failure, inspect server error context, check for partial writes, and add a regression test. The generic error response is intentionally not enough diagnostic detail for the client.

### Empty frontend data

Inspect the network status and response shape first. Check whether `useResource` converted an object to `[]`. Verify the token and role, call the endpoint directly, inspect server authorization and Prisma data, then add a response-contract test.

### Incorrect occupancy

Compare `Student.roomId`, `Allocation.roomId`, `Room.status`, and `roomOccupancyMap`. Look for incomplete transfer/cancel/allocation writes, reproduce concurrent requests, add transaction/invariant handling, and reconcile existing data.

## Top 30 questions to prepare

### 1. Tell me about your project.

**Answer:** “Hostel Management v2 is a role-based hostel operations system. It manages rooms, students, allocations, leave, entry and exit, complaints, attendance, mess, housekeeping, medical incidents, notices, and reports. The frontend uses React and Vite, the backend uses Express, and Prisma connects it to PostgreSQL. The main workflow I would explain is room allocation, because it connects students, hostels, rooms, staff decisions, audit logs, and notifications.”

### 2. What business problem does it solve?

**Answer:** “It gives a university one place to manage hostel operations instead of keeping room, leave, complaint, and movement information in disconnected records. Different users get different portals and permissions. The project shows how a business process can be converted into connected workflows and data. The repository does not verify any real customer or measured business savings.”

### 3. Who are the users?

**Answer:** “The verified roles are admin, wardens, students, parents, security, mess managers, caretakers, and housekeeping staff. Admins manage the system, wardens handle hostel operations, students submit requests, parents view ward information, security records gate movement, and operational staff manage their areas. These roles are mapped in `frontend/src/routes/navigation.jsx` and `App.jsx`.”

### 4. Explain the architecture.

**Answer:** “The user interacts with the React frontend. A page calls `apiFetch` or `resourceApi`, which sends a request to Express under `/api`. `app.js` applies Helmet, CORS, JSON parsing, and production rate limits. The single router in `backend/src/routes/index.js` runs route-local authentication and business helpers, then uses Prisma to talk to PostgreSQL. The server returns JSON and the page updates its state.”

### 5. Explain login end to end.

**Answer:** “The login page sends a username or email and password to `/auth/login`. The server finds the user and compares the password with the bcrypt hash. If it matches, `signToken` creates a JWT containing the user ID, role, and token version. The frontend stores the token and user in `AuthContext` and local storage. Later protected requests send the bearer token, and `getUser` verifies it and reloads the user from the database.”

### 6. How does token-version logout work?

**Answer:** “The JWT contains the current `User.tokenVersion`. When the user logs out, `/auth/logout` increments that database value. The old JWT still has the old number, so the next call to `getUser` rejects it. This gives server-side token invalidation without keeping a separate token blacklist.”

### 7. Why is `ProtectedRoute` not enough?

**Answer:** “`ProtectedRoute` runs in the browser, so it only controls what the UI displays. A user can bypass the React app and call the API directly. The server must check authentication, role, hostel scope, and ownership itself. This project has helpers such as `getUser`, `adminUser`, and `studentScope`, but those checks are not consistently applied to every sensitive route.”

### 8. Explain allocation.

**Answer:** “A student submits hostel preferences. `studentScope` identifies the student from the authenticated registration number, and the server checks whether the student already has an active application. `eligibleHostels` applies gender and year rules. Staff later decide the application, and `findRoomFor` selects an available room with capacity. `doAllocate` updates the allocation, room, and student placement, then creates an audit log and notification.”

### 9. What happens during concurrent allocation?

**Answer:** “Two requests could read the same available room before either one updates it. The current code does not show one transaction with a room lock around the complete operation, so over-allocation is possible. I would use a Prisma transaction, re-check capacity inside it, lock or version the room, and test two simultaneous requests. That is a future improvement, not a current feature.”

### 10. Where is the service layer?

**Answer:** “There is no separate service directory. Service-like logic is inside `backend/src/routes/index.js`, in helpers such as `studentScope`, `eligibleHostels`, `findRoomFor`, `doAllocate`, `paginate`, and `logAudit`. This was simple for a compact project, but I would extract allocation, leave, authorization, and notification modules as the code grows.”

### 11. Why a monolith?

**Answer:** “The system has strongly related data and workflows, so one API and one database are easier to develop and keep consistent. A monolith also reduces deployment and operational complexity for a small team. I would first modularize the monolith internally. I would use microservices only after measured scaling, ownership, or failure-isolation needs justify the extra distributed-system complexity.”

### 12. Why React, Express, Prisma, and PostgreSQL?

**Answer:** “React fits the role-based portal and reusable component structure. Express gives a simple API and middleware pipeline. Prisma makes the relational schema and database calls easier to manage. PostgreSQL fits students, rooms, allocations, and their relationships. These are the technologies actually present; I would not claim they were selected after a benchmark because that is not verifiable from the repository.”

### 13. What are the core database relationships?

**Answer:** “A `Hostel` contains `Block` and `Room` records. A `Student` has allocations, complaints, attendance, entry and exit records, leaves, mess records, and medical incidents. An `Allocation` belongs to a student and can reference a room. A complaint has complaint actions. `User` stores roles and optional links to students, hostels, and blocks.”

### 14. What is the main schema weakness?

**Answer:** “Placement is stored in more than one place: `Student` has room fields, `Allocation` has room fields, and `Room` has a status. Keeping those values synchronized is difficult. Also, many dates and statuses are strings, and some ID fields are application-level references instead of declared relations. I would use typed dates, status constraints, stronger foreign keys, and transactions.”

### 15. Where is the N+1 risk?

**Answer:** “The student list first loads students and then calls `studentActiveAllocation` for each student. That creates one allocation query per student. I would batch the allocation lookup or use a relation/query that gets the latest allocation for all students together. The code contains this risk, but no measured performance number is available.”

### 16. How is pagination implemented?

**Answer:** “The `paginate` helper calculates page and page size, counts records, and uses `skip` and `take` for a database query. `paginateList` instead loads an array and slices it in memory. The database approach is better for large data. I would replace unbounded in-memory pagination and consider cursor pagination for very large logs or events.”

### 17. What tests exist?

**Answer:** “The server uses Vitest and Supertest with Prisma seed data. The tests cover login, invalid credentials, logout invalidation, dashboards, rooms, warden scope, and allocation workflows. The client tests cover authentication, protected routes, navigation, formatting, breadcrumbs, and table filtering. Full browser end-to-end testing, load testing, and coverage percentages are not verifiable.”

### 18. What would you fix before production?

**Answer:** “First I would fix authorization and ownership checks on sensitive API routes. Then I would add request validation, safe response fields, consistent error codes, and transactions for allocation and leave or gate workflows. After that I would add indexes, remove N+1 queries, add health checks and structured logs, and test backups. Caching and microservices would come later, based on measurements.”

### 19. What security risks exist?

**Answer:** “The frontend stores the bearer token in local storage, so XSS could expose it. Server authorization is also inconsistent because some sensitive routes do not consistently check role and ownership. There is no comprehensive request-schema validation, and `/wardens` should return selected safe fields instead of a broad user record. Helmet, CORS, rate limiting, bcrypt, and JWT checks are useful controls, but they do not solve all of these risks.”

### 20. How do you prevent IDOR?

**Answer:** “I would not authorize only by role. After loading a resource, I would check that the student owns it or that the warden's hostel matches it. The server should derive scope from the verified user, not trust a hostel or student ID from the request body. I would centralize policies such as `canAccessStudent` and `canManageAllocation`, then write cross-hostel tests.”

### 21. How is invalid input handled?

**Answer:** “The code has small helpers such as `pick` for allowed fields and `num` for numeric conversion, but it does not have complete schema validation. That means types, ranges, dates, ratings, status values, and relationships are not uniformly checked. I would add server-side request schemas and return clear field-level errors. Frontend validation alone is not enough.”

### 22. What if the API fails?

**Answer:** “`apiFetch` throws an error with the HTTP status and message, so the page can show a failure state. The user should not see a successful mutation unless the server confirms it. For retryable writes such as leave submission, I would add idempotency keys or a safe status lookup to avoid duplicates. Automatic idempotent retries are not currently verified.”

### 23. What if the database fails?

**Answer:** “A Prisma error currently reaches the Express error handler and becomes a generic 500 response. In production I would add readiness checks, structured database metrics, bounded retries only for safe transient reads, connection-pool limits, and tested recovery procedures. I would not expose raw database errors to users.”

### 24. How would you scale it?

**Answer:** “I would first measure and fix N+1 queries, broad reads, missing indexes, and in-memory aggregation. Then I would add database pagination, safe field selection, API replicas behind a load balancer, and low-risk caching. Notifications and reports could move to a queue. Read replicas or read models would come after measured database read pressure.”

### 25. Where would you use Redis?

**Answer:** “I would consider Redis for distributed rate-limit counters and short-lived, low-risk dashboard or notice caches. Every cache needs a key, TTL, invalidation rule, and clear tolerance for stale data. I would not cache authorization or room capacity casually. Redis is not currently used in the project.”

### 26. Where would you use queues?

**Answer:** “Queues would be useful for notifications, email or SMS, report generation, audit exports, and external integrations. The main allocation or permission decision should remain synchronous because it is authoritative. I would use an outbox pattern so a committed database change is not lost before its event is published. Queues are a future improvement, not an existing feature.”

### 27. Would you use microservices?

**Answer:** “Not immediately. The current data is strongly relational and the repository does not prove a scale problem. I would first split the large router into internal modules and improve transactions and authorization. If a boundary became necessary, reporting or notifications might be extracted before allocation because they can work from committed events.”

### 28. What did you personally build?

**Answer:** “I would mention only the files and features I personally worked on. The repository proves where the functionality exists, but it does not prove authorship. A good answer would name one feature, explain its input-to-database flow, describe a bug or tradeoff, and point to its test. I should say ‘not verifiable from the provided project’ rather than claim I built everything.”

### 29. What was hardest?

**Answer:** “The technically hardest area is allocation because one action affects several records and has capacity and authorization concerns. I would explain the actual challenge I faced, if I have one, using the sequence: problem, investigation, change, test, and lesson. If my personal history is not available, I should not invent a bug story. From the code, transaction and concurrency are the biggest design challenges.”

### 30. What would you redesign?

**Answer:** “I would keep the product workflow but refactor the backend into domain modules. I would add centralized authorization policies, request schemas, typed status transitions, safe database selections, and transactions around multi-record workflows. I would remove N+1 and unbounded queries, then add structured observability. I would not start by rewriting everything or adding microservices without evidence.”

## Rapid-fire round

1. **Frontend?** “React 19 with Vite.”
2. **Backend?** “Node.js with Express.”
3. **Database?** “PostgreSQL accessed through Prisma.”
4. **API prefix?** “`/api`.”
5. **Authentication?** “JWT bearer tokens.”
6. **Password hashing?** “bcryptjs.”
7. **How does logout work?** “It increments `User.tokenVersion`.”
8. **Refresh tokens?** “Not implemented.”
9. **OAuth?** “Not implemented.”
10. **Signup?** “No public signup route is verified.”
11. **Global auth middleware?** “Not present; route-local helpers are used.”
12. **Main route file?** “`backend/src/routes/index.js`.”
13. **Room helper?** “`findRoomFor`.”
14. **Allocation helper?** “`doAllocate`.”
15. **Student helper?** “`studentScope`.”
16. **Audit model?** “`AuditLog`.”
17. **Notification model?** “`Notification`.”
18. **Where is the token stored?** “In `localStorage` on the client.”
19. **What protects frontend routes?** “`ProtectedRoute`, but it is not backend security.”
20. **Charts?** “Recharts.”
21. **UI library?** “Ant Design.”
22. **Rate limits?** “Production general and login limiters.”
23. **JSON body limit?** “2 MB.”
24. **API client?** “`apiFetch`.”
25. **Generic hook risk?** “`useResource` turns non-array responses into `[]`.”
26. **N+1 risk?** “Per-student active allocation lookups.”
27. **Transaction risk?** “Allocation updates multiple records separately.”
28. **Cache?** “No cache library is verified.”
29. **AI/ML?** “None is verified.”
30. **Best first fix?** “Authorization and transaction correctness.”
31. **Local database setup?** “Docker Compose with PostgreSQL and Adminer.”
32. **Testing tools?** “Vitest, Supertest, and Testing Library.”
33. **Cloud provider?** “Not verifiable from the project.”
34. **Performance metrics?** “Not verifiable from the project.”
35. **Production users?** “Not verifiable from the project.”

## Simulated ZS BTSA interview

### 1. Tell me about your project.

**Answer:** “It is a role-based hostel management platform. It helps different hostel users manage rooms, allocations, leave, movement, complaints, attendance, mess, and other operations. The frontend is React, the backend is Express, and the database is PostgreSQL through Prisma.”

### 2. What business problem does it solve?

**Answer:** “It connects hostel records and workflows in one system. Instead of managing rooms, student requests, leave, complaints, and gate movement separately, each role gets the information and actions relevant to its work.”

### 3. Why is it useful to multiple roles?

**Answer:** “Each role has a different responsibility. A student submits requests, a warden manages hostel operations, security records movement, parents view ward information, and admins manage the overall system. The frontend routes and backend role helpers represent these differences.”

### 4. Show me the architecture.

**Answer:** “The flow is React page, then `apiFetch`, then Express middleware, then the router in `backend/src/routes/index.js`, then Prisma and PostgreSQL. The JSON response comes back through the same path to the page.”

### 5. Why this stack?

**Answer:** “React supports reusable role-based screens, Express is a simple API framework, Prisma makes PostgreSQL access readable, and PostgreSQL fits the relationships between students, rooms, hostels, and allocations. Those are the technologies verified in the code.”

### 6. Explain login.

**Answer:** “The server finds the user, compares the bcrypt password, signs a JWT with user ID, role, and token version, and returns it. The client stores the token. Later, `getUser` verifies the token and checks the current database user.”

### 7. How does logout work?

**Answer:** “Logout increments `tokenVersion` in the database. The old token still contains the old version, so `getUser` rejects it on the next request.”

### 8. Is the frontend guard enough?

**Answer:** “No. `ProtectedRoute` only controls browser navigation. The API must separately check roles and resource ownership because users can call the API directly.”

### 9. Explain allocation.

**Answer:** “The student is found through `studentScope`, hostel eligibility is checked, and an application is created. Staff decide the application. `findRoomFor` finds a suitable room, and `doAllocate` updates the allocation, room, student, audit log, and notification.”

### 10. What if allocation races?

**Answer:** “Two requests could see the same free bed. The current code does not show a complete transaction with locking, so I would add a transaction, recheck capacity, and use a lock or version check.”

### 11. Where is business logic?

**Answer:** “Mostly in helper functions beside the route handlers in `backend/src/routes/index.js`. There is no separate service layer. I would extract domain modules when the file becomes harder to maintain.”

### 12. What are the core relationships?

**Answer:** “Hostels contain blocks and rooms. Students have allocations and service records. Allocations can reference rooms. Complaints have actions, and users have roles and optional student or hostel links.”

### 13. What is the N+1 risk?

**Answer:** “The student list can query the active allocation separately for each student. I would batch those lookups or use one database query.”

### 14. How would you optimize?

**Answer:** “I would measure first, then fix N+1 queries, add justified indexes, use database pagination, select only required fields, and cache only low-risk data. These are improvements, not current verified features.”

### 15. What security issue matters most?

**Answer:** “The API does not apply authorization consistently to every sensitive route, and the browser stores the bearer token in local storage. I would fix server-side ownership checks first, then improve token storage and XSS protection.”

### 16. What tests exist?

**Answer:** “The server has Vitest and Supertest API tests, and the client has Vitest and Testing Library tests for auth, routes, navigation, and utilities. Full browser E2E and load-test results are not verified.”

### 17. What would you fix first?

**Answer:** “I would fix authorization and ownership checks, then add input validation and transactions for multi-record workflows. These affect security and data correctness before performance tuning.”

### 18. What if the database fails?

**Answer:** “The current request becomes a generic 500. In production I would add readiness checks, structured logs, safe retry rules, connection limits, and tested recovery procedures.”

### 19. How would you scale?

**Answer:** “I would first optimize queries and pagination, then run stateless API instances behind a load balancer. I would add low-risk caching, queue notifications and reports, and use read replicas or read models only when measurements show the need.”

### 20. Would you use Redis?

**Answer:** “Possibly for rate-limit counters and short-lived dashboard or notice caches. I would define TTL and invalidation rules first and would not use it to hide an authorization or consistency problem.”

### 21. Would you use microservices?

**Answer:** “Not initially. I would first modularize this monolith and measure the system. Reporting or notifications could be extracted later if they need independent scaling.”

### 22. What did you build?

**Answer:** “I would name only the modules I personally worked on and explain their code path. The repository does not prove authorship, so I should not say I built every part unless my own work history supports that.”

### 23. What was hardest?

**Answer:** “The most technically difficult area is allocation because it changes several connected records and must respect room capacity. I would describe my real bug or challenge; from the code itself, concurrency and consistency are the main challenges.”

### 24. What KPI matters?

**Answer:** “Useful KPIs could be allocation turnaround, occupancy accuracy, complaint resolution time, and leave processing time. The project does not provide baseline values, so I would not invent numbers.”

### 25. Why should we believe you understand it?

**Answer:** “I can trace a request from the React page to `apiFetch`, Express, `getUser`, the domain helper, Prisma, and the response. I can also explain the limitations, such as missing centralized authorization and transaction risk, instead of only listing technologies.”

## Final cheat sheet

### Project in one sentence

A React and Express role-based hostel operations platform backed by Prisma and PostgreSQL.

### Problem

Coordinate hostel rooms, allocations, students, movement, leaves, complaints, attendance, and operations.

### Architecture

React portals -> `apiFetch` -> Express middleware -> single router/helpers -> Prisma -> PostgreSQL.

### Key implementation names

`createApp`, `apiFetch`, `ProtectedRoute`, `AuthProvider`, `signToken`, `verifyToken`, `getUser`, `studentScope`, `eligibleHostels`, `findRoomFor`, `doAllocate`, `paginate`, `logAudit`, and `addNotification`.

### Biggest limitation

The route module is dense and authorization, validation, and transaction boundaries are inconsistent.

### Future improvement

Potential future improvement - not currently implemented: centralized policies, request schemas, transactions, concurrency controls, indexes, observability, and measured caching/queues.

### Ten facts to remember

1. The API is mounted under `/api`.
2. The main backend route file is `backend/src/routes/index.js`.
3. PostgreSQL is accessed through Prisma.
4. JWT claims include user ID, role, and token version.
5. Logout increments the database token version.
6. React `ProtectedRoute` is not backend authorization.
7. Allocation updates multiple records and is not currently verified as transactional.
8. The client stores the bearer token in local storage.
9. The test suite includes API integration and client utility/UI tests.
10. AI/ML, OAuth, refresh tokens, Redis, cloud deployment, and performance metrics are not verified.

### Ten things not to claim

1. Do not claim microservices.
2. Do not claim a separate service/repository layer.
3. Do not claim every API endpoint is protected.
4. Do not claim frontend guards secure the API.
5. Do not claim allocation is concurrency-safe today.
6. Do not claim refresh tokens or OAuth exist.
7. Do not claim Redis, queues, CDN, or Kubernetes exist.
8. Do not claim cloud deployment or CI/CD without evidence.
9. Do not claim AI/ML exists.
10. Do not invent personal contribution, customers, revenue, adoption, uptime, latency, or business metrics.
