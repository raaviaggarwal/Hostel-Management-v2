# Application Architecture

## Overview

This document describes the architecture of the Hostel Management System v2, a full-stack web application for managing hostel operations in educational institutions.

## Technology Stack

### Frontend
- **Framework**: React 19 with Vite 8
- **UI Library**: Ant Design 6 (antd)
- **Routing**: React Router DOM 6
- **State Management**: React Context (Auth, Theme, Notifications)
- **Charts**: Recharts 3
- **Testing**: Vitest 4 + React Testing Library
- **Linting**: oxlint
- **Build**: Vite

### Backend
- **Runtime**: Node.js (ESM modules)
- **Framework**: Express 4
- **ORM**: Prisma Client 6
- **Database**: PostgreSQL (Prisma Postgres in production)
- **Authentication**: JWT (jsonwebtoken 9)
- **Password Hashing**: bcryptjs 3
- **Security**: helmet 8, cors 2, express-rate-limit 8
- **Testing**: Vitest 4 + Supertest
- **Deployment**: Render

### Database
- **Provider**: PostgreSQL
- **Hosting**: Prisma Postgres (production), Local PostgreSQL (development)
- **Migrations**: Prisma Migrate

### Deployment
- **Frontend**: Vercel
- **Backend**: Render
- **CI/CD**: GitHub Actions

---

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   Database      │
│   (React/Vite)  │     │   (Express)     │     │   (PostgreSQL)  │
│   Vercel        │     │   Render        │     │   Prisma Postgres│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   Prisma ORM    │
                        └─────────────────┘
```

---

## Directory Structure

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── api/           # API client (client.js)
│   ├── components/    # Reusable UI components
│   ├── context/       # React Context providers (Auth, Theme, Notifications)
│   ├── hooks/         # Custom React hooks (useResource, useTableFilter)
│   ├── layout/        # Layout components (AdminLayout, WardenLayout, StudentLayout)
│   ├── pages/         # Page components organized by role
│   │   ├── admin/     # Admin portal pages
│   │   ├── warden/    # Warden portal pages
│   │   ├── student/   # Student portal pages
│   │   ├── auth/      # Authentication pages
│   │   └── ...        # Other portals (caretaker, mess, security, etc.)
│   ├── routes/        # Route definitions per role
│   ├── utils/         # Utility functions
│   ├── __tests__/     # Frontend tests
│   ├── App.jsx        # Main app component
│   └── main.jsx       # Entry point
├── public/            # Static assets
├── package.json
├── vite.config.js
└── vercel.json        # Vercel deployment config
```

### Backend (`/backend`)
```
backend/
├── src/
│   ├── index.js       # Entry point
│   ├── app.js         # Express app configuration
│   ├── auth.js        # JWT authentication utilities
│   ├── prisma.js      # Prisma client initialization
│   └── routes/
│       └── index.js   # All API routes (single file, ~2800 lines)
├── prisma/
│   ├── schema.prisma  # Database schema
│   ├── seed.js        # Database seeding script
│   └── migrations/    # Migration history
├── tests/             # Backend integration tests
├── scripts/           # Utility scripts
├── package.json
└── vitest.config.js
```

---

## Data Models (Prisma Schema)

### Core Models

| Model | Purpose | Key Relationships |
|-------|---------|-------------------|
| `User` | Authentication & authorization | Links to Student via `regNo`, to Hostel/Block via `hostelId`/`blockId` |
| `Student` | Student records | Belongs to Room, Hostel, Block; has Allocations, Attendance, Complaints, Leaves, EntryExit |
| `Hostel` | Hostel buildings | Has Blocks, Rooms, Students |
| `Block` | Hostel wings/floors | Belongs to Hostel; has Rooms |
| `Room` | Individual rooms | Belongs to Hostel & Block; has Allocations, Students, Inventory |
| `Allocation` | Room allocation requests | Links Student to Room; tracks status history |
| `Complaint` | Student complaints | Belongs to Student; has ComplaintActions |
| `Leave` | Leave & Out-Pass requests | Belongs to Student; tracks status (pending/approved/active/completed) |
| `Attendance` | Daily attendance | Unique per student per date |
| `EntryExit` | Gate entry/exit logs | Links to Student and optionally Leave |

### Supporting Models
- `InventoryItem`, `HousekeepingTask` - Room/hostel maintenance
- `MessMenu`, `MessFeedback`, `MessComplaint`, `MessInspection` - Mess management
- `WifiAccessPoint`, `MedicalDispensary`, `MedicalIncident` - Facilities
- `Notice`, `Notification` - Communication
- `AuditLog` - Activity tracking
- `Setting` - System configuration
- `CommitteeMember`, `CommitteeMeeting` - Governance

---

## API Structure

All API routes are under `/api` prefix.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with username/email & password |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/logout` | Invalidate token (increment tokenVersion) |
| POST | `/auth/change-password` | Change password (requires current password) |

### Admin Endpoints
- `/admin/dashboard` - System-wide statistics
- `/hostels` - CRUD for hostels
- `/blocks` - CRUD for blocks/wings
- `/rooms` - CRUD for rooms
- `/students` - Student management (full access)
- `/wardens` - Warden management
- `/allocations` - Allocation management
- `/complaints` - Complaint management
- `/leaves` - Leave/Out-Pass management
- `/attendance` - Attendance records
- `/inventory`, `/housekeeping`, `/mess/*`, `/wifi`, `/medical` - Facility management
- `/notices`, `/notifications`, `/audit-logs`, `/settings`, `/admin/reports`

### Warden Endpoints
- `/warden/dashboard` - Hostel-scoped statistics
- `/rooms` - Rooms in assigned hostel
- `/students` - Students in assigned hostel
- `/allocations` - Allocations for assigned hostel
- `/leaves` - Leave/Out-Pass for assigned hostel students
- `/complaints` - Complaints for assigned hostel students
- `/warden/attendance/register` - Mark attendance
- `/entry-exit` - Entry/exit logs for hostel

### Student Endpoints
- `/student/profile` - Own profile
- `/student/dashboard` - Personal dashboard
- `/student/allocation` - Own allocation history
- `/student/application` - Apply for hostel
- `/student/leaves` - Own leave/out-pass requests
- `/student/complaints` - Own complaints
- `/student/attendance` - Own attendance
- `/student/entry-exit` - Own gate logs
- `/student/mess/feedback`, `/student/mess/complaints` - Mess features

### Other Portals
- `/security`, `/mess`, `/caretaker`, `/housekeeping`, `/parent` - Role-specific endpoints

---

## Authentication & Authorization

### JWT Token Structure
```json
{
  "sub": <userId>,
  "role": <userRole>,
  "ver": <tokenVersion>,
  "iss": "hostel-management",
  "aud": "hostel-management-web",
  "jti": <randomUUID>
}
```

### Roles
| Role | Description | Scope |
|------|-------------|-------|
| `admin` | System administrator | Full system access |
| `chief_warden` | Chief warden | All hostels |
| `warden` | Hostel warden | Single assigned hostel |
| `deputy_warden` | Deputy warden | Single assigned hostel |
| `assistant_warden` | Assistant warden | Single assigned hostel |
| `student` | Student | Own data only |
| `mess_manager` | Mess manager | Mess module |
| `security` | Security guard | Gate entry/exit, leave viewing |
| `caretaker` | Caretaker | Inventory, housekeeping |
| `housekeeping` | Housekeeping staff | Assigned tasks |
| `parent` | Parent | Linked student's data |

### Authorization Patterns

1. **Admin-only**: `adminUser(req)` - checks `user.role === 'admin'`
2. **Warden roles**: `wardenUser(req)` - checks `WARDEN_ROLES.includes(user.role)`
3. **Hostel-scoped**: Wardens must have `hostelId`; can only access data for their hostel
4. **Student-scoped**: Students can only access their own records via `studentScope(req)`
5. **Cross-role checks**: `canAccessRequestStudent`, `canAccessAllocation` for granular permissions
6. **Password change enforcement**: `mustChangePassword` flag blocks access to most endpoints until changed

---

## Frontend Architecture

### Routing Structure
```
/login                    # Public login page
/                         # Redirects to role-appropriate dashboard
/admin/*                  # Admin portal (ProtectedRoute: admin)
/warden/*                 # Warden portal (ProtectedRoute: warden roles)
/student/*                # Student portal (ProtectedRoute: student)
/caretaker/*              # Caretaker portal (ProtectedRoute: caretaker)
/mess/*                   # Mess manager portal (ProtectedRoute: mess_manager)
/security/*               # Security portal (ProtectedRoute: security)
/housekeeping/*           # Housekeeping portal (ProtectedRoute: housekeeping)
/parent/*                 # Parent portal (ProtectedRoute: parent)
```

### State Management
- **AuthContext**: User session, token, login/logout, sidebar state
- **ThemeContext**: Dark/light mode
- **NotificationsContext**: Global notification system

### Data Fetching
- `useResource` hook: Fetches data from API, supports auto-refresh, pagination
- `useTableFilter` hook: Client-side search/filter for tables
- `resourceApi`: Generic API client methods (get, post, put, patch, delete)

---

## Database Design Considerations

### Key Constraints
- `User.username` and `User.email` are unique
- `Student.regNo` is unique
- `Attendance` has unique constraint on `(studentId, date)`
- `Room` status tracked: available, partially_occupied, full, maintenance, medical_reserved, cleaning, blocked

### Concurrency Handling
- Room allocation uses `SELECT FOR UPDATE` with `Serializable` isolation
- `withRetry` wrapper handles serialization failures (P2033, P2034)
- `tokenVersion` on User invalidates all sessions on password change/logout

### Data Integrity
- Room allocation transactions update Room, Student, Allocation, User atomically
- Room transfer/cancellation updates source and destination room occupancy
- Leave activation/completion creates EntryExit records automatically

---

## Deployment Configuration

### Frontend (Vercel)
- `vercel.json` rewrites `/api/*` to backend Render URL
- SPA fallback to `index.html`
- Build: `vite build`

### Backend (Render)
- Build: `prisma generate && prisma migrate deploy && node --check src/index.js`
- Start: `node src/index.js`
- Health endpoint: `/health`
- Serves frontend build if present (for monorepo deployments)

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooled for runtime) |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection (for Prisma CLI) |
| `JWT_SECRET` | Yes (prod) | JWT signing secret |
| `CORS_ORIGIN` | No | Comma-separated allowed origins |
| `PORT` | No | Server port (default 5000) |
| `BCRYPT_ROUNDS` | No | Password hash rounds (default 10) |
| `JWT_EXPIRES_IN` | No | Token expiry (default 24h) |

---

## Testing Strategy

### Backend Tests (`backend/tests/`)
- `api.test.js` - Comprehensive integration tests (auth, dashboards, allocations, leaves, complaints, etc.)
- `concurrency.test.js` - Race condition tests (room allocation, transfers, attendance, leaves)
- `security.test.js` - Security hardening tests (warden creation, password enforcement, auth)
- `room-security.test.js` - Room access control tests (mocked)
- `wardens-api.test.js`, `student-create.test.js`, `notifications.test.js` - Feature-specific tests

### Frontend Tests (`frontend/src/__tests__/`)
- Component tests for pages, hooks, utilities
- Auth flow tests
- Protected route tests

### CI Pipeline
- Frontend: lint, test, build
- Backend: prisma generate, migrate deploy, lint, test (against test database)

---

## Known Architecture Decisions

1. **Single routes file**: All API routes in `backend/src/routes/index.js` (~2800 lines) for simplicity
2. **No service layer**: Business logic directly in route handlers
3. **String dates**: Dates stored as ISO strings (TEXT) not DATE/TIMESTAMP types
4. **No foreign keys on User-Student**: Linked via `regNo` string, not foreign key
5. **In-memory password validation**: bcryptjs (not native bcrypt) for cross-platform compatibility
6. **Token version invalidation**: Logout/password change increments `tokenVersion` to revoke tokens
7. **Serializable transactions**: Critical operations (allocation, transfer, cancel) use Serializable isolation
8. **Role-based hostel scoping**: Wardens restricted to their `hostelId` via middleware checks