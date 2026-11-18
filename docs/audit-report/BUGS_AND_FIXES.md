# Bugs and Fixes Report

**Date**: 2026-11-18
**Status**: Issues identified during audit, fixes not yet applied

---

## Critical Bugs (Must Fix Immediately)

### BUG-001: Production Secrets in Repository
**Severity**: CRITICAL
**File**: `backend/.env` (committed to git)
**Lines**: 1-12

**Description**: Production credentials committed including JWT_SECRET, DATABASE_URL, DIRECT_URL, PRISMA_DATABASE_URL.

**Root Cause**: Root `.gitignore` missing `.env` entry.

**Fix Required**:
1. Rotate ALL secrets immediately
2. Remove from git history: `git filter-repo --path backend/.env --invert-paths`
3. Add `.env` to root `.gitignore`
4. Verify: `git log --all --full-history -- backend/.env` returns nothing

**Verification**: 
- [ ] JWT_SECRET rotated in Render/Vercel
- [ ] Database passwords rotated in Prisma Postgres
- [ ] `.env` not tracked by git
- [ ] No secrets in git history

---

### BUG-002: Rate Limiting Disabled in Development
**Severity**: HIGH
**File**: `backend/src/app.js`
**Lines**: 138-141

**Description**: Rate limiters only applied when `NODE_ENV === 'production'`.

**Fix**:
```javascript
// Apply in all environments, or use separate config
app.use('/api', generalLimiter)
app.use('/api/auth/login', loginLimiter)
```

**Verification**: 
- [ ] Login brute force blocked in dev
- [ ] General API rate limited in dev

---

## High Priority Bugs

### BUG-003: Weak bcrypt Rounds (10)
**Severity**: HIGH
**File**: `backend/src/auth.js`
**Line**: 10

**Fix**: Set `BCRYPT_ROUNDS=12` in production environment.

### BUG-004: JWT Expiry 24 Hours
**Severity**: HIGH
**File**: `backend/src/auth.js`
**Line**: 21

**Fix**: Set `JWT_EXPIRES_IN=2h` or `1h` in production. Consider refresh tokens.

### BUG-005: Plaintext Passwords in API Response
**Severity**: HIGH
**Files**: 
- `backend/src/routes/index.js:1201` (student creation)
- `backend/src/routes/index.js:1451` (warden creation)

**Fix**: Remove `tempPassword` and `password` from response. Send credentials via email.

**Code Change**:
```javascript
// BEFORE (line 1451)
return ok(res, { ...publicUser(warden), tempPassword, username }, 201)

// AFTER
await sendCredentialsEmail(warden.email, username, tempPassword);
return ok(res, { ...publicUser(warden), message: 'Credentials sent to email' }, 201)
```

### BUG-006: Frontend Displays Plaintext Credentials
**Severity**: HIGH
**File**: `frontend/src/pages/admin/Students.jsx`
**Lines**: 631-658

**Fix**: Remove Alert with credentials. Show success message only.

**Code Change**:
```javascript
// Remove lines 631-658 (Alert component with credentials)
// Replace with:
message.success('Student created. Credentials sent to student email.')
```

### BUG-007: Weak Password Policy (Min 6 Chars)
**Severity**: HIGH
**Files**:
- `backend/src/routes/index.js:1117`
- `frontend/src/pages/admin/Students.jsx:557`

**Fix**: Implement strong password validation.

**Backend** (line 1117):
```javascript
// BEFORE
if (typeof body.password !== 'string' || body.password.length < 6) {
  return fail(res, 'Password must be at least 6 characters', 400)
}

// AFTER
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
if (typeof body.password !== 'string' || !passwordRegex.test(body.password)) {
  return fail(res, 'Password must be 12+ chars with uppercase, lowercase, number, special char', 400)
}
```

**Frontend** (line 557):
```javascript
// Update Form.Item rules
rules={[
  { required: true, message: 'Password is required' },
  { min: 12, message: 'Password must be at least 12 characters' },
  { pattern: /[A-Z]/, message: 'Must contain uppercase letter' },
  { pattern: /[a-z]/, message: 'Must contain lowercase letter' },
  { pattern: /\d/, message: 'Must contain number' },
  { pattern: /[^A-Za-z0-9]/, message: 'Must contain special character' },
]}
```

### BUG-008: Missing Input Validation
**Severity**: HIGH
**File**: `backend/src/routes/index.js` - multiple endpoints

**Fix**: Add validation middleware or schema validation (zod).

**Priority Endpoints**:
1. `POST /hostels` (line 785) - validate seats>0, roomCount>0
2. `POST /rooms` (line 946) - validate seater>0, floor>=0
3. `PUT /rooms/:id/status` (line 1017) - already validates against enum
4. `POST /wardens` (line 1414) - validate email format
5. `PUT /settings` (line 2807) - validate time formats

### BUG-009: CORS Allows Any Non-Browser Origin
**Severity**: HIGH
**File**: `backend/src/app.js`
**Lines**: 91-93

**Fix**:
```javascript
origin(origin, callback) {
  // Require origin for all requests in production
  if (!origin && process.env.NODE_ENV === 'production') {
    return callback(new Error('Origin required'), false)
  }
  if (!origin) return callback(null, true)  // Allow in dev for curl
  // ... rest
}
```

### BUG-010: Error Messages Leak Internals
**Severity**: MEDIUM-HIGH
**File**: `backend/src/routes/index.js` - multiple fail() calls

**Fix**: Use generic messages in production.

```javascript
const isProd = process.env.NODE_ENV === 'production'
const message = isProd ? 'Operation failed' : detailedMessage
return fail(res, message, status)
```

---

## Medium Priority Bugs

### BUG-011: Room Status Not Updated on Student Deletion
**Severity**: MEDIUM
**File**: `backend/src/routes/index.js`
**Lines**: 1239-1263

**Fix**: Update room occupancy in deletion transaction.

```javascript
// In delete transaction (after student deleted)
if (student.roomId) {
  const occupants = await tx.student.count({ where: { roomId: student.roomId } })
  const room = await tx.room.findUnique({ where: { id: student.roomId } })
  if (room && !room.medicalReserved && !['maintenance','blocked','cleaning'].includes(room.status)) {
    const newStatus = occupants === 0 ? 'available' : occupants >= room.seater ? 'full' : 'partially_occupied'
    await tx.room.update({ where: { id: student.roomId }, data: { status: newStatus } })
  }
}
```

### BUG-012: No Soft Delete for Students/Wardens
**Severity**: MEDIUM
**Files**: 
- `backend/src/routes/index.js:1239` (student delete)
- `backend/src/routes/index.js:1494` (warden delete)

**Fix**: Add `deletedAt` field and filter queries.

```prisma
// schema.prisma
model Student {
  // ...
  deletedAt DateTime?
}
model User {
  // ...
  deletedAt DateTime?
}

// Query filter
where: { deletedAt: null, ... }
```

### BUG-013: Missing Unique Constraints
**Severity**: MEDIUM
**File**: `backend/prisma/schema.prisma`

**Fix**: Add constraints.

```prisma
model Allocation {
  // ...
  @@unique([studentId, status], where: { status: { in: ['approved', 'allocated', 'occupied', 'waitlisted'] } })
}

model Leave {
  // ...
  @@unique([studentId, status], where: { status: { in: ['pending', 'approved', 'active'] } })
}

model EntryExit {
  // ...
  @@unique([studentId, date, type])
}

model Complaint {
  // ...
  @@unique([complainNumber])
}
```

### BUG-014: String Dates Instead of DateTime
**Severity**: MEDIUM
**File**: `backend/prisma/schema.prisma`

**Fix**: Migration to DateTime/Date types. Requires careful migration.

### BUG-015: Duplicate Room Allocation Logic
**Severity**: MEDIUM
**File**: `backend/src/routes/index.js`
- Lines 1265-1392: `PUT /students/:id/room` (direct assignment)
- Lines 1687-1698: `POST /allocations/:id/allocate` (allocation workflow)

**Fix**: Consolidate into shared service function.

```javascript
// Create shared function
async function assignStudentToRoom(tx, studentId, roomId, actorName) {
  // Shared logic for both endpoints
}
```

### BUG-016: No CSRF Protection
**Severity**: MEDIUM
**File**: `backend/src/app.js`

**Fix**: Add CSRF middleware or document JWT-in-header-only policy.

### BUG-017: No Database Health Check
**Severity**: MEDIUM
**File**: `backend/src/app.js`
**Lines**: 144-146

**Fix**:
```javascript
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', uptime: process.uptime(), database: 'connected' })
  } catch {
    res.status(503).json({ status: 'degraded', uptime: process.uptime(), database: 'disconnected' })
  }
})
```

### BUG-018: Frontend Auto-Refresh Causes State Loss
**Severity**: MEDIUM
**Files**: Multiple pages using `useResource` with `refreshIntervalMs: 5000`

**Fix**: Pause refresh on modal/open forms.

```javascript
// In useResource hook
const [paused, setPaused] = useState(false)
// Pause when modal opens
// Resume when modal closes
```

### BUG-019: Magic String Status Values
**Severity**: MEDIUM
**Files**: Throughout codebase

**Fix**: Define enums in Prisma schema.

```prisma
enum RoomStatus { available partially_occupied full maintenance medical_reserved cleaning blocked }
enum AllocationStatus { applied under_review approved waitlisted allocated occupied cancelled rejected }
enum LeaveStatus { pending approved active completed rejected }
enum LeaveRequestType { LEAVE OUTPASS }
enum ComplaintStatus { New In_Process Closed }
```

### BUG-020: Console.log in Test Files
**Severity**: LOW
**Files**: `backend/tests/concurrency.test.js` lines 103, 110, 237, etc.

**Fix**: Remove or use test logger.

---

## Low Priority Bugs

### BUG-021: No API Versioning
**Severity**: LOW
**Fix**: Add `/api/v1/` prefix to all routes.

### BUG-022: Large Routes File (2820 lines)
**Severity**: LOW
**Fix**: Split into modules: `routes/auth.js`, `routes/admin.js`, `routes/warden.js`, `routes/student.js`, `routes/allocations.js`, `routes/hostels.js`, etc.

### BUG-023: Frontend Bundle Not Optimized
**Severity**: LOW
**File**: `frontend/vite.config.js`
**Fix**: Add manualChunks config.

### BUG-024: No Email Notifications
**Severity**: LOW
**Fix**: Integrate email service (SendGrid, Resend, etc.) for:
- Credential delivery
- Leave approval notifications
- Complaint updates
- Password reset

### BUG-025: Missing Permissions-Policy Header
**Severity**: LOW
**Fix**: Add to helmet config.

---

## Fix Implementation Order

### Phase 1: Immediate (Security)
1. BUG-001: Rotate secrets, remove from git
2. BUG-002: Enable rate limiting everywhere
3. BUG-003: Increase bcrypt rounds
4. BUG-004: Reduce JWT expiry
5. BUG-005: Remove passwords from API responses
6. BUG-006: Remove frontend credential display
7. BUG-007: Strengthen password policy
8. BUG-009: Fix CORS

### Phase 2: Sprint 1 (Data Integrity)
9. BUG-011: Room status on student deletion
10. BUG-013: Add unique constraints
11. BUG-008: Input validation
12. BUG-010: Sanitize error messages
13. BUG-017: Database health check

### Phase 3: Sprint 2 (Architecture)
14. BUG-012: Soft delete
15. BUG-014: DateTime migration
16. BUG-015: Consolidate allocation logic
17. BUG-016: CSRF protection
18. BUG-018: Pause auto-refresh
19. BUG-019: Enum migration

### Phase 4: Sprint 3 (Quality)
20. BUG-021: API versioning
21. BUG-022: Split routes file
22. BUG-023: Bundle optimization
23. BUG-024: Email notifications
24. BUG-025: Permissions-Policy

---

## Verification Checklist Per Fix

For each fix:
- [ ] Code changed
- [ ] Unit tests updated/added
- [ ] Integration tests pass
- [ ] Manual verification completed
- [ ] No regressions in related features
- [ ] Deployed to staging
- [ ] Deployed to production

---

## Rollback Plan

For each critical fix:
1. Tag release before deployment
2. Monitor error rates for 30 min
3. If issues: `git revert` or redeploy previous tag
4. Database migrations: ensure down migrations tested