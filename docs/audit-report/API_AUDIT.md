# API Audit Report

**Date**: 2026-11-18
**Base URL**: `/api`
**Total Endpoints**: ~120+

---

## API Overview

All endpoints under `/api` prefix. Single routes file (`backend/src/routes/index.js` ~2820 lines).

### Response Format
```javascript
// Success
{ data..., status: 200/201 }

// Error
{ message: "Error description", status: 400/401/403/404/409/500, code?: "ERROR_CODE" }
```

### Pagination
Query params: `page` (default 1), `pageSize` (default 50, max 100)
Response:
```javascript
{ items: [...], total: 100, page: 1, pageSize: 50, totalPages: 2 }
```

---

## Endpoint Inventory by Category

### Authentication (4 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | ❌ | Login with username/email + password |
| GET | `/auth/me` | ✅ | Current user profile |
| POST | `/auth/logout` | ✅ | Invalidate token (increment tokenVersion) |
| POST | `/auth/change-password` | ✅ | Change password (requires current) |

### Admin - Dashboard & Reports (3 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/dashboard` | Admin | System-wide stats + hostel breakdown |
| GET | `/admin/reports` | Admin | Aggregated reports (complaints, attendance, occupancy, mess) |
| GET | `/settings` | Public | System settings (mess times, in-times, leave quota) |
| PUT | `/settings` | Admin | Update system settings |

### Hostels (5 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/hostels` | Staff | List hostels with occupancy |
| GET | `/hostels/:id` | Staff | Hostel detail with wings/rooms |
| POST | `/hostels` | Admin | Create hostel |
| PUT | `/hostels/:id` | Admin | Update hostel |
| DELETE | `/hostels/:id` | Admin | Delete hostel |

### Blocks/Wings (4 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/blocks` | Staff | List all blocks |
| POST | `/blocks` | Admin | Create block |
| PUT | `/blocks/:id` | Admin | Update block |
| DELETE | `/blocks/:id` | Admin | Delete block |

### Rooms (8 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/rooms` | Admin/Warden | List rooms (warden: hostel-scoped) |
| GET | `/rooms/:id` | Staff/Student | Room detail (occupants: admin/warden only) |
| POST | `/rooms` | Admin | Create room |
| PUT | `/rooms/:id` | Admin | Update room |
| DELETE | `/rooms/:id` | Admin | Delete room (checks occupants/inventory) |
| PUT | `/rooms/:id/status` | Admin | Update room status |
| GET | `/inventory` | Admin | List inventory items |
| POST/PUT/DELETE | `/inventory/*` | Admin | Inventory CRUD |

### Students (7 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/students` | Staff | List students (warden: hostel-scoped, student: self) |
| GET | `/students/:id` | Staff | Student detail (warden: hostel-scoped) |
| POST | `/students` | Admin/Warden | Create student + user account |
| PUT | `/students/:id` | Admin | Update student |
| DELETE | `/students/:id` | Admin | Delete student + user account |
| PUT | `/students/:id/room` | Admin/Warden | Assign/change room (with concurrency control) |
| GET | `/student/profile` | Student | Own profile with hostel/block names |

### Wardens (4 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wardens` | Admin | List wardens |
| POST | `/wardens` | Admin | Create warden (generates temp password) |
| PUT | `/wardens/:id` | Admin | Update warden (hostel/block assignment) |
| DELETE | `/wardens/:id` | Admin | Delete warden |

### Allocations (9 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/allocations` | Admin/Warden | List allocations (warden: hostel-scoped) |
| GET | `/allocations/:id` | Staff/Student | Allocation detail (access controlled) |
| GET | `/student/allocation` | Student | Own allocation history |
| GET | `/student/application` | Student | Own applications |
| POST | `/allocations` | Student | Submit hostel application |
| POST | `/allocations/:id/decision` | Admin/Warden | Approve/waitlist/reject |
| POST | `/allocations/:id/allocate` | Admin/Warden | Allocate room (auto or manual) |
| POST | `/allocations/:id/checkin` | Admin/Warden | Check-in (occupied status) |
| POST | `/allocations/:id/transfer` | Admin/Warden | Transfer to another room |
| POST | `/allocations/:id/cancel` | Admin/Warden | Cancel allocation |

### Complaints (6 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/complaints` | Admin/Warden | List complaints (warden: hostel-scoped) |
| GET | `/complaints/:id` | Staff/Student | Complaint detail |
| GET | `/complaints/:id/history` | Staff/Student | Complaint action history |
| POST | `/complaints` | Student | Submit complaint |
| POST | `/complaints/:id/action` | Admin/Warden | Update status + add action |
| GET | `/student/complaints` | Student | Own complaints |

### Leaves & Out-Passes (8 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/leaves` | Admin/Warden/Security | List leaves (warden: hostel-scoped) |
| GET | `/student/leaves` | Student | Own leave history |
| POST | `/leaves` | Student | Submit leave/out-pass request |
| POST | `/leaves/:id/decision` | Admin/Warden | Approve/reject |
| POST | `/leaves/:id/activate` | Admin/Warden | Mark departed (creates entry-exit) |
| POST | `/leaves/:id/complete` | Admin/Warden | Mark returned (creates entry-exit) |
| GET | `/entry-exit` | Warden/Security | Gate logs (warden: hostel-scoped) |
| POST | `/entry-exit` | Warden/Security | Record entry/exit (auto-links leaves) |
| GET | `/student/entry-exit` | Student | Own gate logs |

### Attendance (4 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/attendance` | Public | All attendance records |
| GET | `/warden/attendance/register` | Warden | Get register for date/block |
| PUT | `/warden/attendance/register` | Warden | Submit attendance (upsert) |
| GET | `/student/attendance` | Student | Own attendance |

### Notices (4 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notices` | Student/Public | List notices (filtered by audience) |
| POST | `/notices` | Admin | Create notice |
| PUT | `/notices/:id` | Admin | Update notice |
| DELETE | `/notices/:id` | Admin | Delete notice |

### Notifications (4 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Authenticated | List notifications (role-scoped) |
| POST | `/notifications/read-all` | Authenticated | Mark all read |
| POST | `/notifications/:id/read` | Authenticated | Mark one read |

### Housekeeping (3 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/housekeeping` | Warden/Staff | List tasks (hostel-scoped) |
| POST | `/housekeeping` | Admin/Warden | Create task |
| PUT | `/housekeeping/:id` | Staff | Update task |

### Mess Module (9 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/mess/feedback` | Staff | All feedback |
| GET | `/student/mess/feedback` | Student | Own feedback |
| POST | `/mess/feedback` | Student | Submit feedback |
| GET | `/mess/complaints` | Staff | All mess complaints |
| GET | `/student/mess/complaints` | Student | Own mess complaints |
| POST | `/mess/complaints` | Student | Submit mess complaint |
| PUT | `/mess/complaints/:id` | Mess/Warden | Update status |
| GET | `/mess/inspections` | Staff | List inspections |
| POST | `/mess/inspections` | Mess/Warden | Create inspection |
| GET | `/mess-menu` | Staff | Weekly menu |
| PUT | `/mess-menu/:id` | Mess/Warden | Update menu |

### Wi-Fi (2 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wifi` | Public | List access points |
| PUT | `/wifi/:id` | Admin | Update access point |

### Medical (4 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/medical` | Public | Dispensary + incidents |
| PUT | `/medical/dispensary` | Admin | Update dispensary |
| POST | `/medical/incidents` | Admin/Warden | Record incident |
| PUT | `/medical/incidents/:id` | Staff | Update incident |

### Committee (3 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/committee` | Admin/Warden | Members + meetings |
| POST | `/committee/meetings` | Admin/Warden | Create meeting |
| PUT | `/committee/meetings/:id` | Admin/Warden | Update meeting |

### Audit Logs (1 endpoint)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/audit-logs` | Admin | Filterable audit logs |

### Parent Portal (1 endpoint)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/parent/ward` | Parent | Linked student's data |

---

## Authorization Matrix

| Endpoint Category | Admin | Chief Warden | Warden | Student | Security | Mess | Caretaker | Housekeeping | Parent |
|-------------------|-------|--------------|--------|---------|----------|------|-----------|--------------|--------|
| Auth (login/me/logout/password) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin Dashboard | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Hostels CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Blocks CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Rooms CRUD | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Students List | ✅ | ✅ | ✅* | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ |
| Student Create | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Student Update/Delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Student Room Assign | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Wardens CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Allocations List | ✅ | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| Allocation Decisions | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Room Allocation | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Checkin/Transfer/Cancel | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Complaints | ✅ | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| Leaves/Out-Pass | ✅ | ✅ | ✅* | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ |
| Leave Decisions | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Activate/Complete | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Entry-Exit | ✅ | ✅ | ✅* | ✅* | ✅ | ❌ | ❌ | ❌ | ❌ |
| Attendance | ✅ | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notices | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Housekeeping | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ✅ | ✅* | ❌ |
| Mess | ✅ | ✅ | ✅* | ✅* | ❌ | ✅ | ❌ | ❌ | ❌ |
| Wi-Fi | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Medical | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Committee | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Parent Ward | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

* = Hostel-scoped (only own hostel's data)

---

## Input Validation Analysis

### Current Validation (Inconsistent)

**Strong Validation**:
- Student creation: regNo, name, email format, password min 6, email uniqueness
- Warden creation: name, email, hostelId existence, blockId belongs to hostel
- Leave/Out-Pass: dates, reason, destination required; Out-Pass requires ISO timestamps
- Room allocation: room availability, capacity, eligibility checks

**Weak/Missing Validation**:
- Hostel creation: seats/roomCount can be negative
- Room creation: seater can be 0/negative
- Room status update: only validates against enum list
- Warden update: no email format validation
- Settings update: no validation of time formats
- Notice creation: no validation of date/expiryDate format
- Complaint: no validation of complaintType values
- Inventory: no validation of quantity > 0

### Recommended Validation Schema (Zod Example)
```typescript
// Hostel
const hostelSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/),
  gender: z.enum(['male', 'female']),
  type: z.enum(['freshers', 'seniors']),
  campus: z.enum(['campus', 'off-campus']),
  address: z.string().max(500),
  seats: z.number().int().positive(),
  roomCount: z.number().int().positive(),
  note: z.string().max(1000).optional(),
});

// Student
const studentSchema = z.object({
  regNo: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  gender: z.enum(['male', 'female']),
  year: z.number().int().min(1).max(10),
  course: z.string().max(100),
  cgpa: z.number().min(0).max(10),
  contactno: z.string().regex(/^[\d\s+-]{10,15}$/),
  emailid: z.string().email(),
  password: z.string().min(12).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  // ...
});
```

---

## Error Handling Analysis

### Current Patterns
1. **`fail(res, message, status, meta)`** - Standardized error response
2. **`wrap(fn)`** - Catches async errors, passes to Express error handler
3. **Global error handler** (app.js:165-178) - Returns 500, hides stack traces
4. **404 handler** (app.js:181-185) - Returns JSON 404

### Issues
1. **Inconsistent status codes**: Some 400 should be 409 (conflict), some 403 should be 404 (not found to prevent enumeration)
2. **Error messages leak internals**: "Room has occupants or inventory and cannot be deleted"
3. **No validation error details**: Single message string, no field-level errors
4. **No request ID**: Hard to correlate logs

### Recommended Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "code": "INVALID_FORMAT", "message": "Invalid email format" }
    ],
    "requestId": "req_abc123"
  }
}
```

---

## Rate Limiting

### Current Configuration
```javascript
// General: 1000 req / 15 min (production only)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
});

// Login: 10 req / 15 min (production only)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
});
```

### Issues
- Only enabled in `NODE_ENV === 'production'`
- No rate limiting on write endpoints (POST/PUT/DELETE)
- No per-user rate limits (only IP-based)
- No stricter limits for sensitive operations (password change, user creation)

### Recommended
- Enable in all environments
- Add stricter limits for auth endpoints (5 req/15min login, 3 req/hour password reset)
- Add per-user limits for write operations
- Consider adaptive rate limiting

---

## CORS Configuration

### Current
```javascript
function buildCorsOptions() {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const allowedOrigins = [
    ...(isDevelopment ? ['http://localhost:5173'] : []),
    ...(process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || []),
  ].filter(Boolean)

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true)  // Allows non-browser
      if (allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error(`CORS not allowed for origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }
}
```

### Issues
- Allows any non-browser origin in development (`!origin`)
- `credentials: true` with wildcard origin would be insecure (but origin is checked)
- No `maxAge` for preflight caching

---

## Security Headers (Helmet)

### Current (Helmet Defaults)
- `X-Content-Type-Options: nosniff` ✅
- `X-Frame-Options: SAMEORIGIN` ✅
- `X-XSS-Protection: 0` ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅
- `Content-Security-Policy: default-src 'self'` ⚠️ (may break inline scripts)
- No `Strict-Transport-Security` (handled by Vercel/Render)
- No `Permissions-Policy`

---

## API Versioning

### Current: None
All routes at `/api/*`

### Recommended: `/api/v1/*`
- Add version prefix to all routes
- Maintain backward compatibility
- Deprecation policy: 6 months notice

---

## Documentation

### Current: None
- No OpenAPI/Swagger spec
- No Postman collection
- Inline comments only

### Recommended
- Generate OpenAPI 3.0 spec from code
- Host Swagger UI at `/api/docs`
- Include in CI pipeline

---

## Testing Coverage

### Endpoints with Tests (api.test.js + others)
✅ Auth (login, me, logout, password change)
✅ Admin dashboard
✅ Hostels/Rooms
✅ Student CRUD
✅ Warden scope
✅ Allocation workflow (full)
✅ Leave workflow (full)
✅ Out-Pass workflow
✅ Entry/Exit
✅ Notifications
✅ Notices audience
✅ Complaints
✅ Inventory
✅ Housekeeping
✅ Mess module
✅ Wi-Fi
✅ Medical
✅ Security portal
✅ Mess manager portal
✅ Housekeeping staff portal
✅ Caretaker portal
✅ Committee
✅ Audit logs
✅ Parent portal
✅ Admin reports
✅ Server hardening
✅ Concurrency scenarios
✅ Security hardening

### Missing Test Coverage
- Hostel/Block/Room CRUD (partial)
- Warden CRUD
- Student room assignment (direct)
- Settings CRUD
- Notice CRUD
- Committee CRUD
- Medical CRUD
- Wi-Fi CRUD
- Mess menu CRUD
- Inventory CRUD
- Edge cases: invalid IDs, malformed payloads, large payloads

---

## Performance Considerations

### N+1 Queries
1. `/api/students` - fetches active allocation per student in loop
2. `/api/hostels` - computes occupancy in JS after fetching all rooms
3. `/api/admin/dashboard` - similar pattern
4. `/api/warden/dashboard` - similar pattern

### Large Payloads
- `/api/rooms` returns 1000+ rooms with occupancy
- `/api/students` returns all students (paginated but no default limit)
- `/api/allocations` returns all allocations

### Recommended Optimizations
1. Add database views for dashboard aggregations
2. Use Prisma `select`/`include` with counts
3. Implement cursor-based pagination for large datasets
4. Add `?fields=` parameter for partial responses
5. Consider GraphQL for flexible querying

---

## Webhook/Callback Support

### Current: None
- No webhook registration
- No event-driven architecture
- All integrations polling-based

### Recommended
- Add webhook endpoints for: student created, allocation changed, leave decided, complaint updated
- Retry with exponential backoff
- Signature verification

---

## Conclusion

The API is **comprehensive and well-structured** with consistent patterns, good authorization, and solid business logic. Main issues are:

1. **No API versioning** - breaking changes risky
2. **Inconsistent input validation** - some endpoints weak
3. **Error messages leak internals** - production hardening needed
4. **Rate limiting only in production** - dev/staging exposed
5. **No formal documentation** - OpenAPI spec needed
6. **N+1 query patterns** - performance at scale
7. **Single massive routes file** - maintainability concern

The authorization model is correctly implemented and thoroughly tested.