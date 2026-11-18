# Hostel Management v2 — Technical Deep Dive & Interview Documentation

This document is based on the implementation currently present in the repository and traces the actual execution files in the workspace:

- `backend/src/app.js`
- `backend/src/auth.js`
- `backend/src/prisma.js`
- `backend/src/routes/index.js`
- `backend/prisma/schema.prisma`
- `frontend/src/api/client.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/routes/ProtectedRoute.jsx`

## 1. Executive Understanding

### Problem this system solves
The system coordinates hostel operational workflows for a university or institution: admissions, room assignment, allocation review, room movement, student records, notices, complaints, leave/out-pass, attendance, mess and housekeeping, medical records, audit logs, and notifications.

This is not an API-only service. It is a role-aware operations dashboard with a React SPA on the client and an Express + Prisma + PostgreSQL backend.

### Business use case
The project implements a multi-role hostel operations platform. Students can create applications, submit mess feedback, complain about issues, request leave, and view their own profile/dashboard. Warden/admin roles can review applications, allocate rooms, raise room transfer or check-in workflow, inspect attendance, monitor entry/exit events, create notices, create reports, maintain settings, and manage hostel operations. Supporting staff roles such as mess manager, security, caretaker, housekeeping, and parent are supported through route and portal mapping.

### Users
The role taxonomy implemented in the schema and route layer is:

- admin
- warden
- chief_warden
- deputy_warden
- assistant_warden
- student
- parent
- security
- mess_manager
- caretaker
- housekeeping

The route helper layer in the server uses `adminUser`, `wardenUser`, `roleUser`, `messUser`, `staffHostelUser`, `guardUser`, and `parentUser`. The client route mapping enforces UI screens by role.

### Main workflows
Main workflows are:

1. Login and JWT creation.
2. Student allocation application and room assignment.
3. Warden/admin allocation decisions and room occupancy changes.
4. Complaint lifecycle.
5. Leave request and activation/completion flows.
6. Entry and exit records for security.
7. Student dashboard and profile.
8. Mess feedback/complaints and menu inspections.
9. Inventory, housekeeping, medical, and notice management.
10. Parent ward view and audit dashboard.

### Request lifecycle
The browser opens a Route in the client. A route can be protected. If the user is authenticated, the token is loaded from local storage and included in the `Authorization: Bearer <token>` header for each `apiFetch()` call. The Express server receives it in `/api`, checks role helpers via `getUser()` and `studentScope()`, and queries or mutates Prisma models, then returns JSON. The route file also emits notification and audit records in the same flow.

### Architecture diagram

```text
React 19 + Vite SPA
  -> apiFetch / resourceApi
  -> Authorization: Bearer <JWT>
  -> Express Router (/api)
       -> Route handler in backend/src/routes/index.js
       -> Auth helper: getUser / adminUser / wardenUser / roleUser
       -> Prisma queries / mutations
       -> Notification + AuditLog side-effects
       -> JSON response
  -> PostgreSQL database via Prisma Client
```

### Major modules

1. `backend/src/app.js` — Express middleware assembly and static dist serving.
2. `backend/src/auth.js` — JWT config, token signing, verification, role constants, password security metadata.
3. `backend/src/prisma.js` — Prisma client singleton.
4. `backend/src/routes/index.js` — all API route handlers, route-local auth helpers, pagination helpers, notification helpers, audit helpers, and domain logic.
5. `backend/prisma/schema.prisma` — data model for users, students, rooms, hostels, allocations, complaints, leaves, etc.
6. `frontend/src/api/client.js` — central API wrapper that injects token and handles JSON.
7. `frontend/src/context/AuthContext.jsx` — client-side token/user/session lifecycle.
8. `frontend/src/routes/navigation.jsx`, `frontend/src/routes/ProtectedRoute.jsx` — role mapping and route protection.

### Technology stack and reason

| Technology | Used in repo | Why it fits |
|---|---|---|
| Node.js + Express | Server runtime | Quick REST API and middleware composition |
| React + Vite | SPA UI | Fast local development and route rendering |
| Prisma + PostgreSQL | Relational persistence | Strong schema-driven model and easy relation traversal |
| JWT | Token carrier | Stateless authentication with issuer/audience and ver checks |
| bcryptjs | Password verification | Hash comparison during login |
| Helmet | HTTP security headers | Basic security hardening |
| CORS | Cross-origin control | Limits origin abuse |
| Express-rate-limit | Basic abuse control | Rate-limiting in production |
| Ant Design + Recharts | Client UI | Consistent admin dashboard components and charting |

## 2. Elevator Pitch / Interview Narratives

### Elevator Pitch (30 seconds)
This is a hostel operations management platform that coordinates admissions, room allocation, attendance, complaints, messaging, inventory, mess services, notices, medical incidents, and parent/student portals through a single backend and role-aware frontend.

### Recruiter Explanation (1 minute)
The repository is a full-stack software system for university hostel administration. A React SPA presents different screens depending on role; an Express API authenticates users with bearer JWTs, and all operational records are stored relationally through Prisma connected to PostgreSQL. The strongest business value is that students, wardens, staff, security, and parents get separate operational workflows without custom code for every user.

### Technical Explanation (3 minutes)
The architecture separates the client and API but keeps the project simple by placing route handlers, data validation, authorization checks, Prisma access, audit hooks, and notification hooks directly in one server route file. Role-based helpers such as `adminUser`, `wardenUser`, `messUser`, `guardUser`, and `studentScope()` decide authorization. The API returns JSON and uses pagination wrappers, Prisma create/read/update/delete patterns, and audit/notification side-effects. On the frontend, `apiFetch()` attaches the JWT token from local storage and ensures role-specific UI routing by using `ProtectedRoute` wrappers and `HOME_FOR_ROLE` mapping.

### Deep Technical Explanation (5 minutes)
The backend is organized as an Express router with route-local business logic concentrated in `backend/src/routes/index.js`. Database access is ORM-oriented using Prisma. Authentication is based on signed JWTs generated in `backend/src/auth.js` and validated by `verifyToken()` classically. Each route must manually fetch the authenticated user via `getUser(req)` and role checks. Users are not separated into formal controllers or services. Instead, helper functions such as `eligibleHostels`, `findRoomFor`, `doAllocate`, `roomOccupancyMap`, `roomStatusLabel`, `notificationWhereFor`, and `logAudit` represent the business domain helpers. This is a typical greenfield-but-compact single-service style implementation that prioritizes speed and a complete resource model over strict layered separation.

## 3. Folder Structure Analysis

### `/backend/src/`
Purpose: Node runtime source.
Responsibilities: Express app, auth, Prisma client, and the unified route file.
Interaction: `app.js` assembles middleware and static serving; `routes/index.js` is the main domain API; `auth.js` is token utilities; `prisma.js` is the client.
Interview explanation: There is no formal services folder. Domain and route code are concentrated in one file.

### `/backend/src/routes/`
Purpose: The only route file for the API.
Responsibilities: All resource endpoints and route-local business checks.
Interacts with: Prisma and helpers.
Interview explanation: This is the heart of the server. All API endpoints are in one file. Addition of a route is easy but route complexity can become high.

### `/backend/src/auth.js`
Purpose: Central JWT metadata, signing, secret, and audience/issuer constants.
Responsibilities: token generation and verification.
Interaction: `backend/src/routes/index.js` imports `signToken`, `verifyToken`, `publicUser`, `WARDEN_ROLES`, etc.
Interview explanation: Security of all token-based calls depends on this file.

### `/backend/src/prisma.js`
Purpose: Instantiate the Prisma client.
Responsibilities: Provide a single database access object.
Interaction: All endpoint handlers reference `prisma`.
Interview explanation: This keeps Prisma state consistent across the app.

### `/backend/prisma/`
Purpose: Prisma schema and seed.
Responsibilities: Data model, Postgres datasource, DB migration data.
Interaction: `backend/src/routes/index.js` imports `prisma`.
Interview explanation: The schema is source of truth for relationships.

### `/frontend/src/api/`
Purpose: API-client wrapper.
Responsibilities: Send auth headers and route requests.
Interaction: Client feature pages and route flows call this wrapper.
Interview explanation: `apiFetch()` centralizes error and token behavior.

### `/frontend/src/context/`
Purpose: Auth and notification contexts.
Responsibilities: Session tracking and global notification state.
Interaction: Layout views and portal screens rely on contexts.
Interview explanation: The frontend uses context rather than Redux or another store.

### `/frontend/src/routes/`
Purpose: UI route and role protection.
Responsibilities: ProtectedRoute and role navigation mapping.
Interaction: UI screens and portal layouts.
Interview explanation: The protected route pattern is the client’s role enforcement layer.

### `/frontend/src/components/`
Purpose: Reusable UI fragments and page widgets.
Responsibilities: Navbar, sidebar, notifications, modals, data table, page header, status tags, etc.
Interaction: Layout pages and portal screens.
Interview explanation: Component library supports consistent operations UI.

### `/frontend/src/pages/`
Purpose: Screens by portal and domain.
Responsibilities: Student, admin, warden, mess, security, complaints, dashboard, reports, etc.
Interaction: Route tree and API hooks.
Interview explanation: This is the primary end-user interface surface.

## 4. API Documentation

The route inventory is actually implemented in `backend/src/routes/index.js` and is enumerated below. The route file uses no formal controllers, only route-local handlers.

### API Table

| Method | Route | Purpose | Auth Required | DB Tables Used |
|---|---|---|---|---|
| POST | `/auth/login` | Student/admin/role user login | No | `User` |
| GET | `/auth/me` | Return current user from JWT | Bearer token | `User` |
| POST | `/auth/logout` | Increment tokenVersion and end session | Bearer token | `User` |
| GET | `/notifications` | Get role-scoped notifications | Optional via token | `Notification` |
| POST | `/notifications/read-all` | Mark all visible notifications read | Optional via token | `Notification` |
| POST | `/notifications/:id/read` | Mark a notification read | Optional via token | `Notification` |
| GET | `/admin/dashboard` | Administrative metrics | Admin via helper | `Hostel`, `Room`, `Student`, `Allocation`, `Complaint`, `Leave` |
| GET | `/warden/dashboard` | Warden metrics and charts | Warden role | `Room`, `Student`, `Allocation`, `Complaint`, `Leave`, `Block` |
| GET | `/student/profile` | Student profile with hostel/wing | Student role or token-scoped | `Student`, `Hostel`, `Block` |
| GET | `/student/dashboard` | Student home page metrics and feed | Student role | `Complaint`, `Leave`, `Attendance`, `Allocation`, `MessMenu`, `Notice`, `Room`, `Hostel`, `Setting` |
| GET | `/hostels` | Hostel listing | Public | `Hostel`, `Room`, `Block` |
| GET | `/hostels/:id` | Hostel detail | Public | `Hostel`, `Block`, `Room` |
| POST | `/hostels` | Create hostel | Admin | `Hostel` |
| PUT | `/hostels/:id` | Update hostel | Admin | `Hostel` |
| DELETE | `/hostels/:id` | Delete hostel | Admin | `Hostel` |
| GET | `/blocks` | List blocks | Public | `Block` |
| POST | `/blocks` | Create block | Admin | `Block` |
| PUT | `/blocks/:id` | Update block | Admin | `Block` |
| DELETE | `/blocks/:id` | Delete block | Admin | `Block` |
| GET | `/rooms` | List rooms | Public | `Room` |
| GET | `/rooms/:id` | Room detail with wing/hostel/occupants/inventory | Public | `Room`, `Block`, `Hostel`, `Student`, `InventoryItem` |
| POST | `/rooms` | Create room | Admin | `Room` |
| PUT | `/rooms/:id` | Update room | Admin | `Room` |
| DELETE | `/rooms/:id` | Delete room | Admin | `Room` |
| PUT | `/rooms/:id/status` | Toggle medical or status update | Public or route-level unguarded | `Room` |
| GET | `/students` | List students | Public | `Student`, `Allocation` |
| GET | `/students/:id` | Student detail | Public | `Student` |
| POST | `/students` | Create student | Admin | `Student` |
| PUT | `/students/:id` | Update student | Public or route-level unguarded | `Student` |
| DELETE | `/students/:id` | Delete student | Admin | `Student` |
| PUT | `/students/:id/room` | Assign or move student room | Public | `Student`, `Room`, `Room`, `AuditLog`, `Notification` |
| GET | `/wardens` | List wardens | Admin-helper? route-level uses `paginate()` | `User` |
| POST | `/wardens` | Create warden | Admin | `User`, `AuditLog` |
| PUT | `/wardens/:id` | Update warden | Admin | `User`, `AuditLog` |
| DELETE | `/wardens/:id` | Delete warden | Admin | `User`, `AuditLog` |
| GET | `/allocations` | Allocation list with role/hostel filters | Any tokened user helper or no auth? | `Allocation` |
| GET | `/allocations/:id` | Allocation detail | Public? | `Allocation` |
| GET | `/student/allocation` | Student allocations | Student role | `Allocation` |
| GET | `/student/application` | Student application | Student role | `Allocation` |
| POST | `/allocations` | Create application | Student role | `Allocation`, `Notification`, `AuditLog` |
| POST | `/allocations/:id/decision` | Approve/waitlist/reject decision | Role? route-level unguarded | `Allocation`, `Notification`, `AuditLog` |
| POST | `/allocations/:id/allocate` | Allocate room given allocation | Public route-level | `Allocation`, `Room`, `Student`, `Notification`, `AuditLog` |
| POST | `/allocations/:id/checkin` | Check-in room | Public route-level | `Allocation`, `Student`, `AuditLog` |
| POST | `/allocations/:id/transfer` | Transfer occupant room | Public route-level | `Allocation`, `Room`, `Student`, `AuditLog` |
| POST | `/allocations/:id/cancel` | Cancel assignment | Public route-level | `Allocation`, `Room`, `Student` |
| GET | `/complaints` | Complaints list | Public | `Complaint` |
| GET | `/complaints/:id` | Complaint detail | Public | `Complaint` |
| GET | `/complaints/:id/history` | Complaint action history | Public | `ComplaintAction` |
| POST | `/complaints` | Create complaint | Student role | `Complaint`, `Notification` |
| POST | `/complaints/:id/action` | Update complaint status and create action history | Public/unconditional | `Complaint`, `ComplaintAction`, `AuditLog` |
| GET | `/student/complaints` | Student complaints | Student role | `Complaint` |
| GET | `/leaves` | Global leave list filtered by warden hostel | Public | `Leave`, `Student` |
| GET | `/student/leaves` | Student leaves | Student role | `Leave` |
| POST | `/leaves` | Create leave | Student role | `Leave`, `Notification` |
| POST | `/leaves/:id/decision` | Approve/deny active leave | Public route-level | `Leave`, `Student`, `AuditLog` |
| POST | `/leaves/:id/activate` | Activate leave and create exit log | Public route-level | `Leave`, `EntryExit`, `AuditLog` |
| POST | `/leaves/:id/complete` | Complete leave and create entry log | Public route-level | `Leave`, `EntryExit`, `AuditLog` |
| GET | `/entry-exit` | Entry/exit records with filters | Warden or role-scope | `EntryExit`, `Student` |
| GET | `/student/entry-exit` | Student entry/exit records | Student role | `EntryExit` |
| POST | `/entry-exit` | Create entry/exit log | Guard role | `EntryExit`, `Leave`, `Setting`, `Notification` |
| GET | `/inventory` | Inventory list | Public | `InventoryItem` |
| POST | `/inventory` | Create inventory item | Admin | `InventoryItem` |
| PUT | `/inventory/:id` | Update inventory item | Admin | `InventoryItem` |
| DELETE | `/inventory/:id` | Delete inventory item | Admin | `InventoryItem` |
| GET | `/housekeeping` | Housekeeping tasks | Warden/staff hostel user | `HousekeepingTask` |
| POST | `/housekeeping` | Create task | Admin or Warden | `HousekeepingTask` |
| PUT | `/housekeeping/:id` | Update task | Admin/Warden/caretaker/housekeeping | `HousekeepingTask`, `AuditLog` |
| GET | `/mess/feedback` | Public mess feedback | Public | `MessFeedback` |
| GET | `/student/mess/feedback` | Student mess feedback | Student role | `MessFeedback` |
| POST | `/mess/feedback` | Create feedback | Student role | `MessFeedback` |
| GET | `/mess/complaints` | Mess complaints list | Public | `MessComplaint` |
| GET | `/student/mess/complaints` | Student mess complaints | Student role | `MessComplaint` |
| POST | `/mess/complaints` | Create mess complaint | Student role | `MessComplaint` |
| PUT | `/mess/complaints/:id` | Update mess complaint status | Mess roles | `MessComplaint`, `AuditLog` |
| GET | `/mess/inspections` | Mess inspection list | Auth? public | `MessInspection` |
| POST | `/mess/inspections` | Create inspection | Mess roles | `MessInspection` |
| GET | `/wifi` | Wi-Fi access point inventory | Public | `WifiAccessPoint` |
| PUT | `/wifi/:id` | Update access point | Admin | `WifiAccessPoint` |
| GET | `/medical` | Medical dispensary and incidents | Public | `MedicalDispensary`, `MedicalIncident` |
| PUT | `/medical/dispensary` | Update dispensary | Admin | `MedicalDispensary` |
| POST | `/medical/incidents` | Create medical incident | Admin or Warden | `MedicalIncident`, `Notification` |
| PUT | `/medical/incidents/:id` | Update incident | Public route-level | `MedicalIncident` |
| GET | `/mess-menu` | Get mess menu | Public | `MessMenu` |
| PUT | `/mess-menu/:id` | Update menu item | Mess role | `MessMenu`, `AuditLog` |
| GET | `/attendance` | Attendance list | Public | `Attendance` |
| GET | `/warden/attendance/register` | Attendance register by student and date | Warden role | `Attendance`, `Student` |
| PUT | `/warden/attendance/register` | Bulk attendance update | Warden role | `Attendance` |
| GET | `/student/attendance` | Student attendance | Student role | `Attendance` |
| GET | `/notices` | Notices, filter by role/student audience | Public | `Notice` |
| POST | `/notices` | Create notice | Admin | `Notice`, `AuditLog` |
| PUT | `/notices/:id` | Update notice | Admin | `Notice`, `AuditLog` |
| DELETE | `/notices/:id` | Delete notice | Admin | `Notice`, `AuditLog` |
| GET | `/committee` | Committee members and meetings | Admin or Warden | `CommitteeMember`, `CommitteeMeeting` |
| POST | `/committee/meetings` | Create committee meeting | Admin or Warden | `CommitteeMeeting` |
| PUT | `/committee/meetings/:id` | Update committee meeting | Admin or Warden | `CommitteeMeeting` |
| GET | `/audit-logs` | Audit search log | Admin | `AuditLog` |
| GET | `/parent/ward` | Parent ward dashboard | Parent role | `Student`, `Room`, `Attendance`, `Leave`, `Notice` |
| GET | `/admin/reports` | Admin reports and metrics | Public route-level? Admin? | `Complaint`, `Attendance`, `Hostel`, `Room`, `MessFeedback` |
| GET | `/settings` | Read settings | Public | `Setting` |
| PUT | `/settings` | Update settings | Admin | `Setting`, `AuditLog` |

## 5. Authentication System Analysis

### Login flow
The server route `POST /auth/login` runs in the central router. It receives `usernameOrEmail` and `password`. It queries `prisma.user.findFirst()` with an OR expression matching by `username` or `email`. Then it compares `bcrypt.compareSync(password || '', user.password)` against the stored password. If the password passes, the route returns `token: signToken(user)` and `user: publicUser(user)` in a JSON response.

### JWT generation
The token is created by `signToken(user)` in `backend/src/auth.js`:

```js
return jwt.sign(
 { sub: user.id, role: user.role, ver: user.tokenVersion },
 SECRET,
 {
   expiresIn: process.env.JWT_EXPIRES_IN || '24h',
   issuer: JWT_ISSUER,
   audience: JWT_AUDIENCE,
   jwtid: randomUUID(),
 }
)
```

The token is signed using `JWT_ISSUER = 'hostel-management'` and `JWT_AUDIENCE = 'hostel-management-web'`.

### JWT verification
`verifyToken()` applies `jwt.verify(token, SECRET, { issuer, audience })`.

### getUser()
`getUser(req)` is the route-local authentication helper in `backend/src/routes/index.js`. It reads the `Authorization` header, extracts `Bearer <token>`, decodes and verifies token, looks up the current user by `id`, and checks local `role` and `tokenVersion` fields for consistency. If verification fails, it returns `null` and the route uses `Unauthorized` responses.

### Logout
`POST /auth/logout` obtains a user from `getUser(req)` and increments `tokenVersion` in the database. Because all future tokens compare the `ver` field in the payload with the user’s stored `tokenVersion`, a logout or token version bump invalidates the old issuance.

### Session handling in client
The client stores the token in local storage and tracks a session expiry timestamp. `AuthContext` and `auth.js` implement `TOKEN_KEY`, `EXPIRY_KEY`, `USER_KEY`, and `SESSION_DURATION = 24*60*60*1000`. `login()` writes token and user into local storage; `logout()` calls `authApi.logout()` and clears the session.

### Password hashing
The password field is stored in the database as a password hash created by `bcryptjs`. The route uses `bcrypt.compareSync` for password validation; `BCRYPT_ROUNDS` is configurable in `backend/src/auth.js`.

### RBAC and permission maps
The backend route helper layer uses role-scoping functions:

- `adminUser(req)` only admin.
- `wardenUser(req)` accepts WARDEN_ROLES array.
- `messUser(req)` accepts `['mess_manager','admin',...WARDEN_ROLES]`.
- `guardUser(req)` accepts `admin`, `security`, wardens.
- `staffHostelUser(req)` accepts caretaker/housekeeping if attached to hostel.
- `parentUser(req)` accepts `parent`.
- `studentScope(req)` follows a student role and expects a `regNo`.

These are route-local checks rather than a formal policy framework.

## 6. Middleware Analysis

The Express app is assembled in `backend/src/app.js` with behavior:

```js
const app = express()
app.use(helmet())
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '2mb' }))
if (NODE_ENV === 'production') {
  app.use('/api', generalLimiter)
  app.use('/api/auth/login', loginLimiter)
}
app.use('/api', router)
```

Middleware chain:

```text
Request
  -> Helmet headers
  -> CORS origin validation
  -> JSON body parser (2MB)
  -> Production rate limit for /api and login endpoint
  -> /api router
  -> route-local auth helper getUser/role helper
  -> Prisma query or mutation
  -> JSON success or error response
```

### Security implications

- Helmet sets baseline HTTP response headers.
- CORS restricts allowed client origins.
- JSON parser limits request body size.
- rate limiters protect login and general API traffic in production.
- Authorization uses route-local token validation.
- No cookie-based session; user context is token-based.

## 7. Database Analysis

### Data model overview
The core model definitions in `backend/prisma/schema.prisma` include:

- `User`
- `Hostel`
- `Block`
- `Room`
- `Student`
- `Allocation`
- `Complaint`
- `ComplaintAction`
- `InventoryItem`
- `HousekeepingTask`
- `Attendance`
- `EntryExit`
- `Notice`
- `Leave`
- `MessMenu`
- `MessFeedback`
- `MessComplaint`
- `MessInspection`
- `WifiAccessPoint`
- `MedicalDispensary`
- `MedicalIncident`
- `Setting`

### ER summary
The schema joins models through a familiar relational model.

```text
Hostel 1--n Block
Hostel 1--n Room
Hostel 1--n User
Hostel 1--n Student
Block 1--n Room
Room 1--n Student
Student 1--n Allocation
Student 1--n Complaint
Complaint 1--n ComplaintAction
Student 1--n Attendance
Student 1--n EntryExit
Student 1--n Leave
Student 1--n MessFeedback
Student 1--n MessComplaint
Student 1--n MedicalIncident
```

### Important business rules encoded through data flow

- `Student` has `regNo` as unique.
- `User` has `username` and `email` unique.
- `Allocation` stores `hostelPrefs` as JSON.
- `ComplaintAction` is a complaint history model and deletes cascaded on parent complaint.
- `Room` has status lifecycle and `medicalReserved` flag.
- `EntryExit` is linked to `leave` via `linkedLeaveId`.
- `Notice` can filter audience based on gender.

## 8. Business Logic Analysis

The business logic is mostly route-local in the single server file. It is not separated into controllers or services. Some representative helpers are:

- `roomOccupancyMap()` — compute room occupant map.
- `roomStatusLabel()` — derive normalized room status.
- `studentActiveAllocation(student)` — detect active approvals and avoid duplicate active applications.
- `eligibleHostels(student)` — gender/year hostel eligibility.
- `findRoomFor(student, roomType, hostelId, occ)` — room placement.
- `doAllocate(allocation, room, actorName, occ, meta)` — single orchestration of room allocation, status update, student update, and audit.
- `notificationWhereFor(user)` — feed scope rules for notifications.
- `paginate(req, model, args)` and `paginateList(req, items)` — central paged API response wrappers.

### Why logic exists in route file
The strongest reason is that the project uses a very compact route architecture. No independent service layer is present. That means route handlers directly encode domain validation and database operations. This is fast to build, but it makes route file large and business logic harder to unit test in isolation.

## 9. Frontend Architecture Analysis

The client uses React 19 and route structure. The core pieces are:

- `frontend/src/api/client.js` — the uniform API wrapper.
- `frontend/src/context/auth.js` — authentication context constants and session window.
- `frontend/src/context/AuthContext.jsx` — session and login/logout lifecycle.
- `frontend/src/routes/ProtectedRoute.jsx` — gate route access by role.
- `frontend/src/layout/AppLayout.jsx` — shell and sidebar navigation.

The UI imports Ant Design, Graph charts, and uses context to supply notifications and sidebar state.

### Routing model
The route wrappers and navigation mapping are role-aware. `ProtectedRoute` checks `isAuthenticated` and `user` and then checks `roles.includes(user.role)`. It redirects to a role’s home route if failing.

### State and context
The client uses contexts exactly in the same way heavy React apps use them:

- Auth context for token, user, session expiry, sidebar status.
- Notification context for feed and notification badge.

## 10. System Design Assessment

### Current architecture

```text
Client (Vite React 19 + AntD + Recharts)
  -> Auth + token in localStorage
  -> apiFetch resourceApi wrapper
  -> Express API Router in single file
  -> Prisma ORM -> PostgreSQL
  -> AuditLog + Notification side effects
```

### Strengths

- Very direct and fast to understand.
- Route-local patterns are easy to trace.
- Token-based role checks are lightweight.
- Prisma implements relational consistency.

### Weaknesses

- No service/controller layering.
- Route file is huge and monolithic.
- Business logic and route logic strongly coupled.
- Role checks are partly route-local with no separated policy engine.
- LocalStorage JWT storage is a known security trade-off.

### Bottlenecks and risks

- One large route file for all resources.
- Querying many tables through route handlers without a service layer.
- Occasional per-request in-memory loops (`for...of` list fetches and `Promise.all` combos) in large route patterns.
- Route-level authorization checks missing for some endpoints.

## 11. Interview Prep Questions & Answers

### Likely Questions

1. How would you explain the architecture in one minute?
2. Why are API endpoints grouped in one router file?
3. How do you identify a user’s role in a request?
4. How is JWT generation and validation implemented?
5. What is the purpose of `tokenVersion`?
6. Why does the logout API increment tokenVersion?
7. How is Prisma used in the route layer?
8. What is the difference between a route and a controller in this repo?
9. Where are notifications and audit logs created?
10. What would you improve for scale?

### Ideal answer pattern

A light answer should explain that the app is a full-stack role-aware hostel operations management system with a single Express route file and Prisma/PostgreSQL data access. It should define the core client and API handshake, JWT handling, route helpers, domain helper functions, and the relational data model. It should identify that there is no service layer and that the route file concentrates business logic and authorization checks.

## 12. Interview Version Snippets

### 30-second version
This project is a full-stack hostel management system for a university. Students submit applications, complaints, leaves, and mess feedback; wardens and admins approve allocations, manage rooms, and monitor operational metrics. The API is built with Node.js, Express, and Prisma, while the React frontend is role-aware and uses JWT-based session state.

### 1-minute version
The project implements the internal operations of a hostel management system. A React single-page app presents different screens for students, wardens, parents, security, and mess/caretaker/housekeeping users. Requests go through an Express API that verifies a bearer JWT and checks the user’s role using helper functions in the route file. Prisma translates access to PostgreSQL models such as Hostel, Room, Student, Allocation, Complaint, Leave, and Attendance. The route file also triggers audit logs and notifications so the system records important state changes.

### 3-minute version
The backend is organized around a single route registry in `backend/src/routes/index.js` instead of service classes. The route handler performs token verification through `getUser(req)` and then uses helpers like `adminUser`, `wardensUser`, `messUser`, `guardUser`, `studentScope`, and `parentUser` to authorize operations. Resource flows, including room assignments, allocation decisions, complaint handling, leave usages, attendance monitoring, and inventory operations, are layered with Prisma operations and additional side-effect functions such as `addNotification` and `logAudit`. The frontend uses React Router and a protected route wrapper, and all requests are converted from UI actions into JSON API calls through a `apiFetch()` helper that adds the bearer token.

### 5-minute version
The architecture is intentionally compact and direct: one server file handles route declarations, one schema file defines all tables, and the client uses a route-protected role model. Data flows from UI to route handler to Prisma then back to the React component. Security is handled primarily through `helmet`, CORS, JSON parsing limits, production rate limiting, the signed JWT, token versioning, and explicit role helper filters. The biggest design tradeoff is that route code and business logic become monolithic, making the project easy to run locally and explain in a demo, but less maintainable if the business domain expands further.

## 13. Code Explanation Cheat Sheet

### Auth
What it does: login, verify token, token version invalidation, role helper mapping.
Why it exists: protect business routes and provide user identity.
How it works: login route verifies password with `bcrypt.compareSync`; token is signed with `jwt.sign` and later verified. On auth error, route returns `401`.

### Route register
What it does: central Express router with all endpoints.
Why it exists: one route file for the monolithic API domain.
How it works: `router.get('/...')` etc. and wrapper catches asynchronous route errors and forwards to Express error handling.

### Prisma data model
What it does: persistent relational data model.
Why it exists: strongly typed schema for entire hostel operations.
How it works: route file calls `prisma.<Model>.findMany/create/update/delete` patterns.

### Frontend client
What it does: sends and receives JSON.
Why it exists: central point for token injection and error mapping.
How it works: `apiFetch()` reads localStorage token and sets `Authorization` header automatically.

## 14. Final Summary

The workspace demonstrates a compact but operationally complete hostel management system. Its main design value is the role-aware boolean protection of API flows and dashboard screens, while the main technical tradeoff is a route file as the near-universal domain and business layer. In an interview, the strongest technical explanation is: this project is a full-stack Prisma-backed role-platform with a forgotten concept of strict layered separation, and the route file is the main source of business logic.
