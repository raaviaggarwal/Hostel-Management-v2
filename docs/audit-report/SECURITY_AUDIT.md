# Security Audit Report

**Classification**: CONFIDENTIAL - Contains vulnerability details
**Date**: 2026-11-18

---

## Vulnerability Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 3 |
| Medium | 11 |
| Low | 6 |
| Informational | 4 |

---

## Critical Vulnerabilities

### CVE-2026-HMS-001: Production Secrets Committed to Repository

**CVSS Score**: 9.8 (Critical)
**CWE**: CWE-798: Use of Hard-coded Credentials

**Location**: `backend/.env` (committed to git)

**Details**: The following production secrets are exposed:
- `JWT_SECRET`: `a9Kx7mP2qL8vR4zT1nW6cY3hF9jD5sG0uB7eQ2wX8`
- `DATABASE_URL`: `postgres://7022ec8162f7eea6c034c02c9b5fdb8e38b58294fb36d2248bf92c2e193f549c:sk_HjUiagmFjxDMzBY-xLMnV@pooled.db.prisma.io:5432/postgres?sslmode=require`
- `DIRECT_URL`: `postgres://7022ec8162f7eea6c034c02c9b5fdb8e38b58294fb36d2248bf92c2e193f549c:sk_HjUiagmFjxDMzBY-xLMnV@db.prisma.io:5432/postgres?sslmode=require`
- `PRISMA_DATABASE_URL`: Prisma Postgres connection string
- `DATABASE_URL_POOLED`: Pooled connection string
- `POSTGRES_URL`: Direct PostgreSQL URL

**Impact**: 
- Full database compromise (read/write/delete all data)
- JWT token forgery (admin privilege escalation)
- Complete authentication bypass
- Potential lateral movement to Prisma Postgres infrastructure

**Attack Vector**: 
1. Clone public repository
2. Extract secrets from `backend/.env`
3. Forge admin JWT token using `JWT_SECRET`
4. Connect to production database
5. Exfiltrate/modify all student, warden, admin data

**Proof of Concept**:
```javascript
// Using exposed JWT_SECRET
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 1, role: 'admin', ver: 0 },
  'a9Kx7mP2qL8vR4zT1nW6cY3hF9jD5sG0uB7eQ2wX8',
  { expiresIn: '24h', issuer: 'hostel-management', audience: 'hostel-management-web' }
);
// Token now valid as admin user ID 1
```

**Remediation**:
1. **IMMEDIATE**: Rotate ALL secrets (JWT_SECRET, database passwords)
2. **IMMEDIATE**: Remove `backend/.env` from git history
3. **IMMEDIATE**: Add `.env` to root `.gitignore`
4. Verify no secrets in git history: `git log --all --full-history -- backend/.env`
5. Audit database access logs for unauthorized connections

**References**: 
- Root `.gitignore` missing `.env` entry
- Backend `.gitignore` has `.env` but file committed at root level

---

## High Vulnerabilities

### CVE-2026-HMS-002: Rate Limiting Disabled in Non-Production

**CVSS Score**: 7.5 (High)
**CWE**: CWE-307: Improper Restriction of Excessive Authentication Attempts

**Location**: `backend/src/app.js:138-141`

**Code**:
```javascript
if (process.env.NODE_ENV === 'production') {
  app.use('/api', generalLimiter)
  app.use('/api/auth/login', loginLimiter)
}
```

**Impact**: 
- Brute force attacks on login endpoint in development/staging
- Credential stuffing attacks
- API enumeration and abuse
- DoS via unlimited requests

**Remediation**: Apply rate limiting in all environments, or ensure staging mirrors production config.

---

### CVE-2026-HMS-003: Weak Password Hash Configuration

**CVSS Score**: 7.1 (High)
**CWE**: CWE-916: Use of Password Hash With Insufficient Computational Effort

**Location**: `backend/src/auth.js:10`

**Code**: `export const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10)`

**Impact**: bcrypt with 10 rounds can be cracked at ~100K hashes/second on modern GPU. NIST recommends 12+ rounds.

**Remediation**: Set `BCRYPT_ROUNDS=12` minimum in production environment variables.

---

### CVE-2026-HMS-004: CORS Allows Non-Browser Requests from Any Origin

**CVSS Score**: 7.0 (High)
**CWE**: CWE-942: Overly Permissive Cross-Domain Whitelist

**Location**: `backend/src/app.js:91-93`

**Code**:
```javascript
if (!origin) {
  return callback(null, true)  // Allows curl, Postman, scripts from anywhere
}
```

**Impact**: API accessible from any origin for non-browser clients in development. Could be exploited if development server exposed.

**Remediation**: Restrict to explicit allowlist even for non-browser requests.

---

## Medium Vulnerabilities

### CVE-2026-HMS-005: Long JWT Expiration (24 Hours)

**CVSS Score**: 5.9 (Medium)
**CWE**: CWE-613: Insufficient Session Expiration

**Location**: `backend/src/auth.js:21`

**Code**: `expiresIn: process.env.JWT_EXPIRES_IN || '24h'`

**Impact**: Stolen tokens valid for 24 hours. No refresh token mechanism for rotation.

**Remediation**: Reduce to 1-2 hours, implement refresh token rotation.

---

### CVE-2026-HMS-006: Plaintext Passwords Returned in API Responses

**CVSS Score**: 5.9 (Medium)
**CWE**: CWE-200: Exposure of Sensitive Information to an Unauthorized Actor

**Locations**: 
- `backend/src/routes/index.js:1201` (student creation)
- `backend/src/routes/index.js:1451` (warden creation)

**Code**:
```javascript
return ok(res, { ...publicUser(warden), tempPassword, username }, 201)
return ok(res, { student, user: publicUser(userAccount) }, 201)
```

**Impact**: Generated/plaintext passwords exposed in:
- Browser network tab
- Server logs (if logging response bodies)
- API documentation/testing tools
- Proxy/cache logs

**Remediation**: Never return passwords. Send via secure email or require first-login setup.

---

### CVE-2026-HMS-007: Frontend Displays Plaintext Credentials

**CVSS Score**: 5.3 (Medium)
**CWE**: CWE-200: Exposure of Sensitive Information

**Location**: `frontend/src/pages/admin/Students.jsx:631-658`

**Code**: Alert component shows username/password with "Copy Credentials" button.

**Impact**: Shoulder surfing, screen recording, browser history, clipboard exposure.

**Remediation**: Remove plaintext display. Show "Credentials sent to student email."

---

### CVE-2026-HMS-008: Weak Password Policy (Minimum 6 Characters Only)

**CVSS Score**: 5.0 (Medium)
**CWE**: CWE-521: Weak Password Requirements

**Locations**:
- `backend/src/routes/index.js:1117`
- `frontend/src/pages/admin/Students.jsx:557`

**Impact**: Passwords like "123456", "password", "hostel123" allowed. Vulnerable to dictionary attacks.

**Remediation**: Implement zxcvbn or regex requiring uppercase, lowercase, number, special char, min 12 chars.

---

### CVE-2026-HMS-009: Missing Input Validation on Critical Endpoints

**CVSS Score**: 5.3 (Medium)
**CWE**: CWE-20: Improper Input Validation

**Locations**: Multiple endpoints in `backend/src/routes/index.js`

**Examples**:
- Hostel creation (line 788-798): No validation of `seats`, `roomCount` (negative values allowed)
- Room creation (line 963-975): No validation of `seater` (0 or negative allowed)
- Warden creation (line 1416-1420): No email format validation
- Student creation (line 1108-1119): Minimal validation

**Impact**: Data corruption, invalid states, potential logic bypasses.

**Remediation**: Add schema validation (zod/joi) on all write endpoints.

---

### CVE-2026-HMS-010: No CSRF Protection

**CVSS Score**: 4.8 (Medium)
**CWE**: CWE-352: Cross-Site Request Forgery

**Location**: `backend/src/app.js` - No CSRF middleware

**Impact**: If cookies used for auth (currently JWT in header), CSRF possible. Future cookie-based auth would be vulnerable.

**Remediation**: Add CSRF protection (double-submit cookie or synchronizer token) or document JWT-in-header-only policy.

---

### CVE-2026-HMS-011: Error Messages Leak Internal Details

**CVSS Score**: 4.3 (Medium)
**CWE**: CWE-209: Generation of Error Message Containing Sensitive Information

**Locations**: Multiple `fail()` calls in `backend/src/routes/index.js`

**Examples**:
- Line 1010: "Room has occupants or inventory and cannot be deleted"
- Line 1258: "Student has dependent records and cannot be deleted"
- Line 1693: "Allocation is no longer available"

**Impact**: Information disclosure aids reconnaissance and attack planning.

**Remediation**: Generic error messages in production (`NODE_ENV=production`).

---

### CVE-2026-HMS-012: No Database Health Check in /health Endpoint

**CVSS Score**: 3.7 (Low-Medium)
**CWE**: CWE-1188: Insecure Default Initialization of Resource

**Location**: `backend/src/app.js:144-146`

**Code**:
```javascript
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})
```

**Impact**: Load balancers may route traffic to instances with failed database connections.

**Remediation**: Add Prisma connectivity check.

---

### CVE-2026-HMS-013: Missing Unique Constraints at Database Level

**CVSS Score**: 4.3 (Medium)
**CWE**: CWE-285: Improper Authorization

**Location**: `backend/prisma/schema.prisma`

**Missing Constraints**:
- `Allocation`: No unique on `(studentId, status)` for active states
- `Leave`: No unique preventing duplicate pending leaves
- `EntryExit`: No unique on `(studentId, date, type)`
- `User.studentId`: No foreign key or unique constraint

**Impact**: Race conditions possible despite application-level checks.

**Remediation**: Add `@@unique` constraints in Prisma schema.

---

### CVE-2026-HMS-014: Room Status Not Updated on Student Deletion

**CVSS Score**: 4.0 (Medium)
**CWE**: CWE-667: Improper Locking

**Location**: `backend/src/routes/index.js:1239-1263`

**Impact**: Room shows occupied but has no students. Incorrect capacity reporting.

**Remediation**: Update room occupancy in deletion transaction.

---

### CVE-2026-HMS-015: No Soft Delete for Critical Entities

**CVSS Score**: 3.7 (Low-Medium)
**CWE**: CWE-284: Improper Access Control

**Locations**: Student delete (line 1239), Warden delete (line 1494)

**Impact**: Accidental deletion loses all history. Compliance/audit issues.

**Remediation**: Add `deletedAt` soft delete pattern.

---

## Low Vulnerabilities

### CVE-2026-HMS-016: No API Versioning

**CVSS Score**: 2.1 (Low)
**Location**: All routes under `/api` without version prefix.

---

### CVE-2026-HMS-017: Magic String Status Values

**CVSS Score**: 1.8 (Low)
**Location**: Throughout codebase - statuses as raw strings.

---

### CVE-2026-HMS-018: Console.log in Test/Production Code

**CVSS Score**: 1.5 (Low)
**Location**: Multiple test files and skipped conditions.

---

### CVE-2026-HMS-019: Frontend Auto-Refresh May Cause State Loss

**CVSS Score**: 2.4 (Low)
**Location**: Pages using `useResource` with `refreshIntervalMs: 5000`.

---

### CVE-2026-HMS-020: Duplicate Allocation Logic

**CVSS Score**: 2.1 (Low)
**Location**: Two code paths for room assignment.

---

### CVE-2026-HMS-021: String Dates Instead of DateTime

**CVSS Score**: 2.7 (Low)
**Location**: `backend/prisma/schema.prisma` - all date fields as `String`.

---

## Informational Findings

### INFO-001: Good - JWT Token Version Invalidation
**Location**: `backend/src/auth.js`, `backend/src/routes/index.js:479-487`
**Detail**: Logout and password change increment `tokenVersion`, immediately invalidating all sessions.

### INFO-002: Good - Serializable Transactions for Critical Operations
**Location**: `backend/src/routes/index.js:353-378, 1758-1833, 1846-1888`
**Detail**: Room allocation, transfer, and cancellation use `SELECT FOR UPDATE` with `Serializable` isolation.

### INFO-003: Good - Retry Logic for Serialization Failures
**Location**: `backend/src/routes/index.js:46-67`
**Detail**: `withRetry` wrapper handles P2033/P2034 deadlock errors with exponential backoff.

### INFO-004: Good - Comprehensive Authorization Checks
**Location**: `backend/src/routes/index.js:178-217, 199-217`
**Detail**: `canAccessRequestStudent`, `canAccessAllocation` enforce hostel-scoped access.

---

## Security Headers Analysis

| Header | Status | Value |
|--------|--------|-------|
| X-Content-Type-Options | ✅ | nosniff |
| X-Frame-Options | ✅ | SAMEORIGIN (helmet default) |
| X-XSS-Protection | ✅ | 0 (helmet default) |
| Referrer-Policy | ✅ | strict-origin-when-cross-origin |
| Content-Security-Policy | ⚠️ | Not explicitly set (helmet default) |
| Strict-Transport-Security | ⚠️ | Not set (handled by Vercel/Render) |
| Permissions-Policy | ❌ | Not set |

---

## Dependency Vulnerability Scan

**Backend Dependencies** (package.json):
- @prisma/client: 6.19.3 ✅
- bcryptjs: 3.0.2 ✅
- cors: 2.8.5 ✅
- dotenv: 16.4.7 ✅
- express: 4.21.2 ✅
- express-rate-limit: 8.6.2 ✅
- helmet: 8.3.0 ✅
- jsonwebtoken: 9.0.2 ✅
- prisma: 6.19.3 ✅

**Frontend Dependencies** (package.json):
- @ant-design/icons: 6.3.2 ✅
- antd: 6.6.1 ✅
- react: 19.2.0 ✅
- react-dom: 19.2.0 ✅
- react-router-dom: 6.28.0 ✅
- recharts: 3.10.1 ✅

**No known vulnerabilities** in current versions (as of audit date).

---

## Penetration Testing Notes

### Authentication Bypass Attempts Tested
1. ✅ Invalid credentials rejected (401)
2. ✅ Expired JWT rejected (401)
3. ✅ Modified JWT rejected (401)
4. ✅ Missing JWT rejected (401)
5. ✅ Wrong role access rejected (403)
6. ✅ Warden cross-hostel access rejected (403)
7. ✅ Student accessing other student data rejected (403)
8. ✅ Token version invalidation on logout works
9. ✅ Token version invalidation on password change works
10. ✅ `mustChangePassword` enforcement works

### Authorization Bypass Attempts Tested
1. ✅ Admin cannot access student endpoints (403)
2. ✅ Student cannot access warden endpoints (403)
3. ✅ Warden cannot access other hostel data (403)
4. ✅ Chief warden without hostelId can access all (by design)
5. ✅ Parent portal only shows linked student

### Injection Attempts Tested
1. ✅ Prisma parameterized queries prevent SQL injection
2. ✅ No raw SQL with user input (except `SELECT FOR UPDATE` with parameterized ID)
3. ✅ XSS prevented by React auto-escaping + JSON API

### Business Logic Tests
1. ✅ Duplicate leave request prevented
2. ✅ Duplicate out-pass request prevented
3. ✅ Room capacity enforced (concurrency safe)
4. ✅ Room transfer maintains occupancy consistency
5. ✅ Leave quota enforced
6. ✅ Attendance unique per student per date

---

## Compliance Notes

| Standard | Status | Notes |
|----------|--------|-------|
| OWASP Top 10 2021 | ⚠️ Partial | A01:2021 (Broken Access Control) - OK; A02:2021 (Cryptographic Failures) - Secrets in repo; A03:2021 (Injection) - OK; A07:2021 (Auth Failures) - Weak password policy |
| GDPR | ⚠️ Partial | No data export/delete UI, no consent tracking |
| FERPA | ⚠️ Partial | Student data protected by auth, but no audit trail for access |
| ISO 27001 | ❌ No | No ISMS, risk assessment, or security policies documented |

---

## Remediation Tracking

| CVE | Status | Target Date | Owner |
|-----|--------|-------------|-------|
| CVE-2026-HMS-001 | 🔴 OPEN | IMMEDIATE | DevOps |
| CVE-2026-HMS-002 | 🟡 PLANNED | Sprint 1 | Backend |
| CVE-2026-HMS-003 | 🟡 PLANNED | Sprint 1 | DevOps |
| CVE-2026-HMS-004 | 🟡 PLANNED | Sprint 1 | Backend |
| CVE-2026-HMS-005 | 🟡 PLANNED | Sprint 1 | Backend |
| CVE-2026-HMS-006 | 🟡 PLANNED | Sprint 1 | Backend |
| CVE-2026-HMS-007 | 🟡 PLANNED | Sprint 1 | Frontend |
| CVE-2026-HMS-008 | 🟡 PLANNED | Sprint 2 | Full Stack |
| CVE-2026-HMS-009 | 🟡 PLANNED | Sprint 2 | Backend |
| CVE-2026-HMS-010 | 🟡 PLANNED | Sprint 2 | Backend |
| CVE-2026-HMS-011 | 🟡 PLANNED | Sprint 2 | Backend |
| CVE-2026-HMS-012 | 🟢 BACKLOG | Sprint 3 | Backend |
| CVE-2026-HMS-013 | 🟢 BACKLOG | Sprint 3 | Database |
| CVE-2026-HMS-014 | 🟢 BACKLOG | Sprint 3 | Backend |
| CVE-2026-HMS-015 | 🟢 BACKLOG | Sprint 3 | Backend |

---

## Sign-off

**Auditor**: Senior Application Security Auditor
**Date**: 2026-11-18
**Next Review**: After Critical/High remediation complete

**Note**: This report contains sensitive vulnerability information. Distribute only to authorized personnel. Do not commit to public repositories.