# 01_PROJECT_OVERVIEW.md

## Project Purpose

Hostel Management System — a full-stack application for managing hostel operations including student admissions, room allocations, warden duties, mess management, complaints, leaves, attendance, and administrative functions.

## Tech Stack

### Frontend
- **Framework**: React 19.2.0 (function components with hooks)
- **Routing**: react-router-dom 6.28.0
- **UI Components**: Ant Design 6.6.1 (Ant Design icon set 6.3.2)
- **Build Tool**: Vite 8.2.0
- **Charting**: recharts 3.10.1
- **Testing**: vitest 4.1.10, @testing-library/react, @testing-library/jest-dom
- **Linting**: oxlint 1.75.0
- **HTTP Client**: fetch-based API client (`frontend/src/api/client.js`)

### Backend
- **Runtime**: Node.js with Express 4.21.2
- **ORM/Database Client**: Prisma Client 6.16.0
- **Database**: PostgreSQL
- **Authentication**: JSON Web Tokens (jsonwebtoken 9.0.2) with bcryptjs 3.0.2 for password hashing
- **Security**: helmet 8.3.0, cors, express-rate-limit
- **Environment**: dotenv 16.4.7

### Infrastructure
- **Database**: PostgreSQL 17 (docker-compose: `db` service, `hostel_management` database)
- **Frontend Deployment**: Vercel (`frontend/dist` served by Express in production, or Vercel platform)
- **Backend Deployment**: Render (Express app listening on port 5000 or `process.env.PORT`)
- **Docker**: `docker-compose.yaml` defines `db` (PostgreSQL) and `adminer` services

## Architecture

### Frontend Architecture
- **Client-side routing** via React Router DOM with lazy-loaded route components
- **Role-based navigation** determined by `navigation.jsx` (`PORTAL_FOR_ROLE`, `HOME_FOR_ROLE`, `NAV`)
- **Authentication context** via `AuthContext` (`frontend/src/context/auth.js`, `AuthContext.jsx`) — token stored in `localStorage`, user session in `localStorage`
- **Notification polling** via `NotificationsContext` (`frontend/src/context/NotificationsContext.jsx`) — polls `/api/notifications` every 30 seconds
- **Data fetching** via custom hook `useResource` (`frontend/src/hooks/useResource.js`) — manages loading, error, and reload state
- **Table filtering** via `useTableFilter` hook (`frontend/src/hooks/useTableFilter.js`)
- **Page structure**: `pages/` directory contains auth, student, warden, admin, caretaker, housekeeping, mess, parent, portal, security pages
- **Route configuration**: `frontend/src/routes/` — `AdminRoutes.jsx`, `WardenRoutes.jsx`, `StudentRoutes.jsx`, `PortalRoutes.jsx`, `PortalRoutes.jsx`
- **Layout components**: `frontend/src/layout/` directory
- **Global components**: `frontend/src/components/` — DataTable, EntityModal, ConfirmDelete, NotificationsList, PageHeader, StatusTag, TableSearchBar, Navbar, ErrorBoundary

### Backend Architecture
- **Express app** (`backend/src/app.js`) — middleware-ordered, CORS, rate limiting, static serving
- **Router** (`backend/src/routes/index.js`) — single router with all API routes mounted at `/api`
- **Authentication middleware** (`backend/src/routes/index.js`) — `getUser()`, `adminUser()`, `wardenUser()`, `roleUser()`, `studentScope()`, `messUser()`, `guardUser()`, `parentUser()`
- **Authorization** — role-checked at each route handler (`adminUser`, `wardenUser`, etc.)
- **Prisma client** (`backend/src/prisma.js`) — connection with test database URL detection
- **API structure**: Resource-based endpoints under `/api/<resource>`

### Database Architecture
- **Prisma ORM** with schema at `backend/prisma/schema.prisma`
- 32+ models: User, Hostel, Block, Room, Student, Allocation, Complaint, ComplaintAction, InventoryItem, HousekeepingTask, Attendance, EntryExit, Notice, Leave, MessMenu, MessFeedback, MessComplaint, MessInspection, WifiAccessPoint, MedicalDispensary, MedicalIncident, CommitteeMember, CommitteeMeeting, AuditLog, Notification, Setting
- Relationships: one-to-many (User→Allocations, Complaints, Leaves, etc.), many-to-many through Allocation, hostel→rooms→blocks→students

### Authentication & Authorization Architecture
- **Login**: POST `/api/auth/login` — verifies username/email + password via bcrypt, returns JWT
- **JWT payload**: `{ sub: user.id, role: user.role, ver: user.tokenVersion }` signed with `JWT_SECRET`
- **Token expiry**: 24 hours (`JWT_EXPIRES_IN`)
- **Token storage**: `localStorage` (key: `TOKENT_KEY` = `'token'`)
- **Frontend attachment**: `Authorization: Bearer <token>` header on all API calls
- **Backend verification**: `verifyToken()` — checks issuer, audience, and validates `tokenVersion` against database (prevents logout-invalidation attacks)
- **Role enforcement**: per-route checks (`adminUser`, `wardenUser`, `studentScope`, etc.)
- **Token invalidation**: increment `tokenVersion` on logout (`auth.js:302`), forcing re-authentication

### API Communication Architecture
- **Base URL**: `import.meta.env.VITE_API_URL` or `/api` (development proxy)
- **API client** (`frontend/src/api/client.js`):
  - `authApi`: login, me, logout
  - `resourceApi`: get, getById, post, create, patch, put, update, remove
- **Token auto-attachment**: `apiFetch()` reads token from `localStorage` and adds `Authorization: Bearer <token>` header
- **401 handling**: API client throws; `NotificationsContext` catches status 401 and logs out
- **Polling**: `NotificationsContext` polls `/api/notifications` every 30 seconds with visibility-change listener

### Application Startup Flow

1. **Frontend** (`frontend/`):
   - `npm run dev` → Vite dev server at `localhost:5173`
   - App mounts `<AuthProvider>` → checks `localStorage` for token/user
   - If valid session, user is authenticated; otherwise redirects to `/login`
   - Router resolves based on `navigation.jsx` role-based navigation

2. **Backend** (`backend/`):
   - `npm run dev` → `node --watch src/index.js` → Express app on port 5000
   - Loads `.env` → validates `JWT_SECRET` in production
   - Creates PrismaClient (test DB URL if `VITEST=true` or `NODE_ENV=test`, otherwise `DATABASE_URL`)
   - Mounts CORS, helmet, rate limiters
   - Mounts router at `/api`
   - Serves static `frontend/dist` if exists (production build)

3. **Database**:
   - Prisma connects to PostgreSQL (`hostel_management` database)
   - Migrations deployed via `npm run build` → `npx prisma migrate deploy`

## Directory Structure

```
Hostel-Management-v2/
├── frontend/                     # Frontend React application
│   ├── src/
│   │   ├── api/                # API client (fetch-based)
│   │   ├── context/            # AuthContext, NotificationsContext
│   │   ├── hooks/              # useResource, useTableFilter
│   │   ├── layout/             # Layout components
│   │   ├── pages/              # Page components (auth, student, warden, admin, ...)
│   │   ├── routes/             # Route configurations (AdminRoutes, WardenRoutes, StudentRoutes, PortalRoutes)
│   │   ├── utils/              # Utility functions
│   │   └── pages/              # Page components
│   ├── package.json
│   ├── vite.config.js (likely)
│   └── dist/                   # Production build
├── backend/                     # Backend Express application
│   ├── src/
│   │   ├── app.js              # Express app creation with middleware
│   │   ├── auth.js             # JWT signing/verification, constants, WARDEN_ROLES
│   │   ├── prisma.js           # PrismaClient initialization
│   │   └── routes/index.js     # All API route handlers
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (32+ models)
│   │   └── migrations/         # Prisma migration files
│   ├── tests/                  # Vitest API tests
│   └── prisma/seed.js          # Seed data
├── docs/                       # Documentation (interview-preparation/)
├── docker-compose.yaml         # PostgreSQL + Adminer services
└── .github/                    # CI/CD workflows
```

## Key Files to Understand the System

| File | Purpose |
|------|---------|
| `backend/src/app.js` | Express app creation, middleware ordering, CORS, error handling |
| `backend/src/routes/index.js` | All API route handlers, authentication & authorization middleware |
| `backend/src/auth.js` | JWT sign/verify, BCRYPT_ROUNDS, WARDEN_ROLES, SECRET |
| `backend/prisma/schema.prisma` | Database model definitions (32+ models, relations) |
| `frontend/src/api/client.js` | API fetch base, auth token attachment, auth/resource API helpers |
| `frontend/src/context/auth.js` | TOKEN_KEY, EXPIRY_KEY, USER_KEY constants, readUser() |
| `frontend/src/context/AuthContext.jsx` | Auth state (token, user, login, logout, session expiry) |
| `frontend/src/context/NotificationsContext.jsx` | Notification polling, unread count, 401→logout |
| `frontend/src/routes/navigation.jsx` | ROLE_LABEL, PORTAL_FOR_ROLE, HOME_FOR_ROLE, NAV per role |
| `frontend/src/pages/auth/Login.jsx` | Login form, demo accounts, quick login |
| `backend/tests/api.test.js` | Comprehensive API test suite |