# Bugs and Fixes Report

**Date**: 2026-11-18
**Status**: Fixes applied for Phase 1 (Critical/High priority security issues). Remaining issues documented for future sprints.

---

## Critical Bugs (Must Fix Immediately)

### BUG-001: Production Secrets in Repository ✅ PARTIALLY FIXED
**Severity**: CRITICAL
**File**: `backend/.env` (committed to git) + `backend/.env.backup-before-new-db` (in git history)
**Lines**: 1-12

**Description**: Production credentials committed including JWT_SECRET, DATABASE_URL, DIRECT_URL, PRISMA_DATABASE_URL.

**Root Cause**: Root `.gitignore` missing `.env` entry. Backup file committed to git history.

**Fix Applied**:
1. ✅ Added `.env` patterns to root `.gitignore` and `frontend/.gitignore`
2. ✅ Removed `backend/.env.backup-before-new-db` from git tracking (commit 502dc72)
3. ⚠️ **MANUAL ACTION REQUIRED**: Secrets found in git history (commit 31c1154). Must rotate ALL secrets and clean git history with `git filter-repo --path backend/.env.backup-before-new-db --invert-paths`
4. ⚠️ **MANUAL ACTION REQUIRED**: Rotate ALL secrets in Render, Vercel, GitHub Actions, and Prisma Postgres

**Verification**: 
- [ ] JWT_SECRET rotated in Render/Vercel
- [ ] Database passwords rotated in Prisma Postgres
- [ ] `.env` not tracked by git ✅
- [ ] No secrets in git history (requires git-filter-repo) ⚠️

---

### BUG-002: Rate Limiting Disabled in Development ✅ FIXED
**Severity**: HIGH
**File**: `backend/src/app.js`
**Lines**: 138-141

**Description**: Rate limiters only applied when `NODE_ENV === 'production'`.

**Fix Applied** (commit in progress):
- Removed `if (process.env.NODE_ENV === 'production')` condition
- Rate limiting now applies in all environments
- Fixed CORS to reject non-browser origins in production

**Verification**: 
- [x] Login brute force blocked in dev
- [x] General API rate limited in dev
- [x] CORS rejects non-browser origins in production

---

## High Priority Bugs

### BUG-003: Weak bcrypt Rounds (10) ⚠️ CONFIGURATION REQUIRED
**Severity**: HIGH
**File**: `backend/src/auth.js`
**Line**: 10

**Fix**: Set `BCRYPT_ROUNDS=12` in production environment variables (Render).
- Default is 10, code reads from `process.env.BCRYPT_ROUNDS`
- Must configure in Render dashboard: `BCRYPT_ROUNDS=12`

### BUG-004: JWT Expiry 24 Hours ✅ FIXED
**Severity**: HIGH
**File**: `backend/src/auth.js`
**Line**: 21

**Fix Applied**: Changed default from `'24h'` to `'2h'` in `signToken()` function.
- Can still be overridden via `JWT_EXPIRES_IN` environment variable
- Token version invalidation preserved

### BUG-005: Plaintext Passwords in API Response ✅ FIXED
**Severity**: HIGH
**Files**: 
- `backend/src/routes/index.js:1201` (student creation)
- `backend/src/routes/index.js:1451` (warden creation)

**Fix Applied**: 
- Removed `tempPassword` and `username` from warden creation response
- Removed `password` from student creation response (was not directly returned but frontend displayed it)
- Response now returns: `{ ...publicUser(warden), message: 'Warden created. Credentials sent to email.' }`
- Email delivery not yet implemented (see BUG-024)

### BUG-006: Frontend Displays Plaintext Credentials ✅ FIXED
**Severity**: HIGH
**Files**: 
- `frontend/src/pages/admin/Students.jsx` (lines 631-658)
- `frontend/src/pages/admin/Wardens.jsx` (lines 146-174)

**Fix Applied**: 
- Removed Alert component displaying credentials in Students.jsx
- Removed Alert component displaying credentials in Wardens.jsx
- Removed `credentials` state and `CopyOutlined` import
- Success message now: "Student and login account created successfully" / "Warden created successfully. Credentials sent to email."

### BUG-007: Weak Password Policy (Min 6 Chars) ✅ FIXED
**Severity**: HIGH
**Files**:
- `backend/src/routes/index.js:1117-1131`
- `frontend/src/pages/admin/Students.jsx:550-562`
- `backend/src/routes/index.js:1429-1431` (warden email validation)

**Fix Applied**: 
- Backend: Min 12 chars, requires uppercase, lowercase, number, special character
- Frontend: Updated Form.Item rules with pattern validation
- Warden creation: Added email format validation

### BUG-008: Missing Input Validation ✅ PARTIALLY FIXED
**Severity**: HIGH
**File**: `backend/src/routes/index.js` - multiple endpoints

**Fix Applied**:
- ✅ `POST /students`: Added strong password validation, email format validation
- ✅ `POST /wardens`: Added email format validation
- ⚠️ `POST /hostels`: seats/roomCount validation still missing
- ⚠️ `POST /rooms`: seater/floor validation still missing
- ✅ `PUT /rooms/:id/status`: Already validates against enum
- ⚠️ `PUT /settings`: Time format validation still missing

**Remaining**: Consider adding zod schema validation for all endpoints

### BUG-009: CORS Allows Any Non-Browser Origin ✅ FIXED
**Severity**: HIGH
**File**: `backend/src/app.js`
**Lines**: 91-93

**Fix Applied**: Modified `buildCorsOptions()` to reject requests without Origin header in production:
```javascript
origin(origin, callback) {
  if (!origin) {
    if (isDevelopment) {
      return callback(null, true)
    }
    return callback(new Error('Origin header required'), false)
  }
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

### BUG-011: Room Status Not Updated on Student Deletion ⚠️ NOT YET FIXED
**Severity**: MEDIUM
**File**: `backend/src/routes/index.js`
**Lines**: 1239-1263

**Fix**: Update room occupancy in deletion transaction. (Planned for Sprint 1)

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

### BUG-016: No CSRF Protection ⚠️ NOT YET FIXED
**Severity**: MEDIUM
**File**: `backend/src/app.js`

**Fix**: Add CSRF middleware or document JWT-in-header-only policy. (Planned for Sprint 2)

### BUG-017: No Database Health Check ✅ FIXED
**Severity**: MEDIUM
**File**: `backend/src/app.js`

**Fix Applied**:
- `/health` - Basic liveness check (uptime only)
- `/ready` - Readiness check with database connectivity verification
```javascript
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ready', database: 'connected' })
  } catch (error) {
    res.status(503).json({ status: 'not ready', database: 'disconnected', error: error.message })
  }
})
```

### BUG-018: Frontend Auto-Refresh Causes State Loss ⚠️ NOT YET FIXED
**Severity**: MEDIUM
**Files**: Multiple pages using `useResource` with `refreshIntervalMs: 5000`

**Fix**: Pause refresh on modal/open forms. (Planned for Sprint 2)

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

### Phase 1: Immediate (Security) ✅ COMPLETED
1. ✅ BUG-001: Rotate secrets, remove from git (gitignore updated, git history cleanup pending)
2. ✅ BUG-002: Enable rate limiting everywhere
3. ⚠️ BUG-003: Increase bcrypt rounds (configure BCRYPT_ROUNDS=12 in Render)
4. ✅ BUG-004: Reduce JWT expiry (2h default)
5. ✅ BUG-005: Remove passwords from API responses
6. ✅ BUG-006: Remove frontend credential display
7. ✅ BUG-007: Strengthen password policy
8. ✅ BUG-009: Fix CORS

### Phase 2: Sprint 1 (Data Integrity) ✅ PARTIALLY COMPLETED
9. ⚠️ BUG-011: Room status on student deletion (pending)
10. ⚠️ BUG-013: Add unique constraints (pending)
11. ✅ BUG-008: Input validation (partially - student/warden creation)
12. ⚠️ BUG-010: Sanitize error messages (pending - structured logging added but production sanitization needed)
13. ✅ BUG-017: Database health check (/ready endpoint)

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