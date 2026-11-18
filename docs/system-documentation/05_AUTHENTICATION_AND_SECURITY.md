# 05_AUTHENTICATION_AND_SECURITY.md

## Complete Authentication Lifecycle

This document explains the full authentication lifecycle step by step, tracing every component from login through to session persistence and token handling.

### 1. Login Request

**Frontend**: `frontend/src/pages/auth/Login.jsx` — `doLogin()` function

1. User enters username/email and password in the login form
2. Form validation: both fields are `required` (Ant Design `Form.Item` rules)
3. On submit: `authApi.login(values)` → `apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) })`
4. API client (`frontend/src/api/client.js:37-42`):
   - Reads token from `localStorage.getItem(TOKEN_KEY)` — none on first login
   - Adds `Authorization: Bearer <token>` header if token exists (not on login itself)
   - Sets `Content-Type: application/json`
   - Makes `POST /api/auth/login` to backend

**Backend**: `backend/src/routes/index.js:273` — `router.post('/auth/login', ...)`

1. Extracts `usernameOrEmail` and `password` from `req.body`
2. If missing fields → 400 `fail(res, 'Username/email and password are required', 400)`
3. Trims identifier: `const identifier = rawIdentifier.trim()`
4. Looks up user: `prisma.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } })`
5. If user not found OR bcrypt comparison fails → 401 `fail(res, 'Invalid username/email or password', 401)`
6. If valid: `ok(res, { token: signToken(user), user: publicUser(user) })`
   - `signToken(user)` from `backend/src/auth.js:16`:
     - Payload: `{ sub: user.id, role: user.role, ver: user.tokenVersion }`
     - Signed with `SECRET` (from `JWT_SECRET` env var, or `'dev-secret'` for dev)
     - Expires: `process.env.JWT_EXPIRES_IN || '24h'`
     - Issuer: `'hostel-management'`, Audience: `'hostel-management-web'`
     - JWT ID: `randomUUID()` (v4)
   - `publicUser(user)` from `backend/src/auth.js:33`:
     - Destructures out `password`, returns rest of user object

**Response**: Frontend receives `{ token, user: { id, name, username, email, role, ... } }` (password removed)

### 2. Credential Verification

1. Backend bcrypt comparison: `bcrypt.compareSync(password || '', user.password)`
   - Passwords are hashed with `BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10)` (default 10)
   - Stored in `User.password` field during user creation (e.g., `backend/src/routes/index.js:944`: `bcrypt.hashSync(Math.random().toString(36), BCRYPT_ROUNDS)` for wardens)
   - Admin/demo accounts have pre-set passwords: admin123, warden123, student123

2. No password reset flow visible in the codebase — passwords are set at creation time only

### 3. JWT Creation

1. `signToken(user)` (`backend/src/auth.js:16-27`) creates the JWT:
   ```javascript
   jwt.sign(
     { sub: user.id, role: user.role, ver: user.tokenVersion },
     SECRET,
     { expiresIn: '24h', issuer: 'hostel-management', audience: 'hostel-management-web', jwtid: randomUUID() }
   )
   ```
2. Claims in payload:
   - `sub`: user's database ID (Int)
   - `role`: user's role string (`'admin'`, `'warden'`, `'student'`, etc.)
   - `ver`: `user.tokenVersion` — used for token invalidation without DB query on every request

3. Token signed with HMAC-SHA256 using `SECRET`
4. Token expires in 24 hours (`JWT_EXPIRES_IN`)

### 4. Token Storage on Frontend

1. `AuthContext.jsx:37-44` — `login` function:
   ```javascript
   const login = useCallback((newToken, newUser) => {
     const expiry = String(Date.now() + SESSION_DURATION) // 24 * 60 * 60 * 1000 = 86400000ms = 24h
     localStorage.setItem(TOKEN_KEY, newToken)          // 'token'
     localStorage.setItem(EXPIRY_KEY, expiry)           // epoch ms + 24h
     localStorage.setItem(USER_KEY, JSON.stringify(newUser))
     setToken(newToken)
     setUser(newUser)
   }, [])
   ```
2. Keys:
   - `TOKEN_KEY = 'token'` (`frontend/src/context/auth.js:3`)
   - `EXPIRY_KEY = 'sessionExpiry'` 
   - `USER_KEY = 'user'`
   - `SESSION_DURATION = 24 * 60 * 60 * 1000` (24 hours)

3. Storage: `localStorage` (browser)
   - Survives page refresh (persistent across sessions until expiry or manual logout)
   - Cleared on browser close (no `sessionStorage` used)

### 5. How the API Client Attaches the Token

**`frontend/src/api/client.js:10-35` — `apiFetch` function**:

```javascript
export async function apiFetch(path, options = {}) {
  const token = readToken()                           // localStorage.getItem(TOKEN_KEY)
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}` // ADDS BEARER TOKEN
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
  // ... error handling, JSON parsing
}
```

1. `API_BASE = import.meta.env.VITE_API_URL || '/api'` (development) or production URL
2. If token exists in `localStorage`, adds `Authorization: Bearer <token>` header
3. If body is not `FormData`, sets `Content-Type: application/json`
4. Makes fetch request to `${API_BASE}${path}`
5. On non-2xx response: tries to parse JSON error body, throws `Error` with `error.status` property

**Token auto-attachment** means every API call (except explicit ones) includes the auth token.

### 6. Backend JWT Verification

**`backend/src/routes/index.js:45-61` — `getUser` function**:

```javascript
async function getUser(req) {
  if (req.user) return req.user  // if middleware set req.user
  const match = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)
  if (!match) return null  // no auth header
  let payload
  try {
    payload = verifyToken(match[1])  // verifies JWT
  } catch {
    return null  // invalid JWT
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || user.role !== payload.role || user.tokenVersion !== payload.ver) return null
  req.user = user
  return user
}
```

1. Checks `req.headers.authorization` for `Bearer <token>` pattern
2. `verifyToken(token)` from `backend/src/auth.js:29`:
   ```javascript
   jwt.verify(token, SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
   ```
   - Validates `issuer: 'hostel-management'`
   - Validates `audience: 'hostel-management-web'`
   - Verifies signature with `SECRET`
   - Decodes payload: `{ sub, role, ver }`
3. If verification throws (invalid/expired signature) → `getUser` returns `null`
4. If verified: queries `prisma.user.findUnique({ where: { id: payload.sub } })`
5. **Critical check**: `if (!user || user.role !== payload.role || user.tokenVersion !== payload.ver) return null`
   - `user.role !== payload.role` — role mismatch (e.g., token says 'admin' but DB says 'warden') → reject
   - `user.tokenVersion !== payload.ver` — token version mismatch → reject (this is how logout invalidation works!)
6. Sets `req.user = user` for use by middleware/handlers

### 7. Role Verification

Role verification happens at two levels:

**A. Backend route handlers** (`backend/src/routes/index.js`):

Each route checks authorization explicitly:

- `adminUser(req)`: `user.role === 'admin'` → proceed, else `fail(res, 'Forbidden', 403)`
- `wardenUser(req)`: `WARDEN_ROLES.includes(user.role)` → proceed (warden, chief_warden, deputy_warden, assistant_warden), else 401
- `roleUser(req, roles)`: `roles.includes(user.role)` → proceed
- `studentScope(req)`: extracts student by regNo, validates student exists
- `messUser(req)`: `roleUser(req, ['mess_manager', 'admin', ...WARDEN_ROLES])`
- `guardUser(req)`: `user.role === 'admin' || user.role === 'security' || WARDEN_ROLES.includes(user.role)`
- `parentUser(req)`: `roleUser(req, ['parent'])`

**B. Database-level role check**: Some queries additionally filter by `hostelId` (warden scoping) or `regNo` (student self-filtering)

### 8. Token Invalidation / Version Check

**How logout invalidation works**:

1. **POST /api/auth/logout** (`backend/src/routes/index.js:297`):
   ```javascript
   const user = await getUser(req)
   if (!user) return fail(res, 'Unauthorized', 401)
   await prisma.user.update({
     where: { id: user.id },
     data: { tokenVersion: { increment: 1 } },  // INCREMENT version
   })
   return ok(res, { message: 'Logged out' })
   ```

2. **Effect**: `user.tokenVersion` incremented by 1 in database

3. **On next API request**: `getUser()` decodes JWT, gets `ver` from token payload, queries DB for `user.tokenVersion`, compares:
   - `user.tokenVersion !== payload.ver` → returns `null` → user forced to re-login

4. **Why this works**: The old JWT still has valid signature and isn't immediately rejected, but its `ver` no longer matches the DB's `tokenVersion`, so it's silently rejected. New login creates new JWT with updated `ver`.

5. **Session expiry** (frontend):
   - `AuthContext.jsx:13-19` — `isSessionValid()`:
     ```javascript
     const isSessionValid = () => {
       const token = localStorage.getItem(TOKEN_KEY)
       if (!token) return false
       const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0)
       if (!expiry) return false
       return Date.now() < expiry  // checks 24h expiry
     }
     ```
   - `AuthProvider` checks this on mount and every 60 seconds via `setInterval`
   - If invalid → `clearSession()` → user redirected to `/login`

### 9. Logout Behavior

1. User clicks logout → `useAuth().logout()` (`AuthContext.jsx:46-49`):
   ```javascript
   const logout = useCallback(() => {
     authApi.logout().catch(() => {})  // POST /api/auth/logout (ignores errors)
     clearSession()                     // clears localStorage + state
   }, [clearSession])
   ```

2. `authApi.logout()` (`frontend/src/api/client.js:41`):
   ```javascript
   logout: () => apiFetch('/auth/logout', { method: 'POST' })
   ```

3. Backend `POST /api/auth/logout` (`backend/src/routes/index.js:297`):
   - Gets user via `getUser(req)`
   - Increments `user.tokenVersion` by 1
   - Returns `{ message: 'Logged out' }`

4. `clearSession()` (`AuthContext.jsx:29-35`):
   ```javascript
   const clearSession = useCallback(() => {
     localStorage.removeItem(TOKEN_KEY)
     localStorage.removeItem(EXPIRY_KEY)
     localStorage.removeItem(USER_KEY)
     setToken(null)
     setUser(null)
   }, [])
   ```

5. After logout, `isAuthenticated = !!token && !!user` is `false`, user redirected to `/login`

### 10. Session Persistence After Page Refresh

1. On page refresh, `AuthProvider` mounts:
   ```javascript
   const [token, setToken] = useState(() =>
     isSessionValid() ? localStorage.getItem(TOKEN_KEY) : null
   )
   const [user, setUser] = useState(() => (isSessionValid() ? readUser() : null))
   ```

2. `isSessionValid()` checks:
   - Token exists in `localStorage`
   - Expiry epoch > `Date.now()` (24h from login)
   - If both valid → user stays authenticated

3. `NotificationsContext` on mount:
   ```javascript
   useEffect(() => {
     if (!isAuthenticated || !token) {
       requestId.current += 1  // invalidate stale polls
       return undefined
     }
     // schedule refresh polling
   }, [refresh, isAuthenticated, token, setNotifications])
   ```

4. **Result**: User remains logged in after refresh; sidebar and navigation reflect correct role; API calls include valid token

### 11. Handling Expired or Invalid Tokens

1. **Expired JWT** (beyond 24h):
   - `apiFetch` receives 401 from backend
   - Frontend: `error.status === 401` → `NotificationsContext.refresh()` calls `logout()` then returns
   - Other components: error caught in `.catch()`, error message displayed, user redirected to `/login`

2. **Invalid JWT** (tampered/forged):
   - Backend `verifyToken()` throws → `getUser()` returns `null`
   - Route handler receives unauthenticated request → 401 `fail(res, 'Unauthorized', 401)`
   - Frontend error handler displays message, may redirect to login

3. **Token version mismatch** (after logout without front-end clear):
   - Old token still valid signature but `ver` doesn't match DB `tokenVersion`
   - `getUser()` returns `null` → user treated as unauthenticated
   - Frontend session expiry check also triggers (every 60s interval)

### 12. Handling 401 and 403 Errors

**401 (Unauthorized)** — No or invalid token:
- Frontend `.catch()` in `useResource()` or `useEffect`:
  - `StudentDashboard`: if `requestError.status === 404` set data to null; else set `error`
  - `StudentLeave`: error shown via `message.error(error.message)`
  - General: error propagated up, displayed to user
- `NotificationsContext`: on 401 → `logout()` + return (user redirected to login)
- Route may redirect to `/login` (via `useNavigate()`)

**403 (Forbidden)** — Authenticated but insufficient role:
- Backend explicitly returns 403: `fail(res, 'Forbidden', 403)`
- Frontend: `message.error('Forbidden')` or specific message from API
- Examples:
  - Non-admin trying `/api/admin/dashboard` → 403
  - Student trying `/api/students/:id` where `student.regNo !== user.regNo` → 403
  - Warden trying to view student outside their hostel → 403 `'Student is outside your authorized hostel'`
  - Non-warden trying `/api/allocations/:id/decision` → 403

### Authentication vs Authorization in This Project

| Aspect | Authentication | Authorization |
|--------|---------------|---------------|
| **Purpose** | Verify who the user is (login) | Verify what the user can do (permissions) |
| **Mechanism** | JWT with `sub`, `role`, `ver` claims; bcrypt password check | Per-route role checks: `adminUser`, `wardenUser`, `studentScope`, etc. |
| **Token** | Contains `role` claim; verified on every request | Role checked against allowed roles per endpoint |
| **Token Version** | `ver` in payload + `tokenVersion` in DB | Mismatch forces re-auth (logout invalidation) |
| **Session Storage** | `localStorage` (persistent) | Enforced by backend on every request |
| **Failure Result** | 401 → redirect to login | 403 → show error, deny action |
| **Examples** | Login form → bcrypt → JWT | Warden cannot see students outside hostel; student cannot view other students' data |

### Security Findings

#### ✅ Implemented Well
1. **bcrypt password hashing**: `BCRYPT_ROUNDS = 10` (industry standard), never stores plaintext
2. **JWT token versioning**: `tokenVersion` field + incremental increment on logout prevents token replay
3. **Issuer/audience validation**: JWT verified with `issuer` and `audience` claims
4. **Role-based route guards**: Every protected route explicitly checks `adminUser`, `wardenUser`, etc.
5. **Hostel scoping for wardens**: `user.hostelId` used to filter data (wards see only their hostel)
6. **IDOR prevention on student detail**: `student.regNo !== user.regNo` → 403 for student self-view
7. **CORS configuration**: Origin-based allowlist + credentials + method headers
8. **Rate limiting**: `express-rate-limit` (1000 requests/15min general, 10/15min login)
9. **Helmet security headers**: `x-content-type-options: nosniff`, `x-frame-options`, etc.
10. **Input validation**: Both frontend (Ant Design form validation) and backend (explicit field checks)

#### ⚠️ Potential Security Concerns

1. **No password rotation/expiry**: Passwords never expire; compromised password works until logout
2. **JWT secret in dev**: `SECRET = configuredSecret || 'dev-secret'` — hardcoded fallback for development
3. **Room status update without auth check**: `PUT /api/rooms/:id/status` only checks room exists, **not** whether user is admin (line 713-725) — any authenticated user can change room status
4. **No rate limiting on sensitive endpoints**: Only `/api/auth/login` has a login limiter; other endpoints lack rate limiting
5. **CORS allows credentials**: `credentials: true` with `origin(origin)` check — potential for CSRF if combined with other vulnerabilities
6. **Sensitive data in API responses**: 
   - `User` model includes `password` field; `publicUser()` strips it, but ensure all responses use it
   - `AuditLog` includes `ip`, `userAgent` — potentially sensitive but acceptable for audit trail
7. **No CSP (Content Security Policy)**: Not configured in Express (helmet configured but CSP not set)
8. **No input length limits** beyond Express `express.json({ limit: '2mb' })` — acceptable for now
9. **No CSRF token**: Reliance on JWT + same-site cookie behavior not configured
10. **Test database URL detection**: `prisma.js` forces `TEST_DATABASE_URL` to have `test` in database name — good practice, but if misconfigured could use production DB

#### ⛔ Critical Security Issues

1. **`PUT /api/rooms/:id/status` missing admin check** (line 713-725):
   - Only validates room exists, does NOT check `adminUser(req)`
   - Any authenticated user (warden, student) can change room status (medicalReserved, available/full)
   - **Fix**: Add `if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)` before room lookup

2. **Hardcoded demo credentials** (`frontend/src/pages/auth/Login.jsx:24-28`):
   - `DEMO_ACCOUNTS = [{ role: 'admin', username: 'admin', password: 'admin123' }, ...]`
   - These are **not** fetched from backend; they bypass credential verification
   - Should be removed or gated behind environment flag for production

3. **No password complexity requirements** on frontend login form
   - Form only has `required` rules; no pattern/minlength validation

4. **`studentScope` reveals regNo-based filtering**:
   - `student.regNo !== user.regNo` → 403, but the check comes after `!STUDENT_READ_ROLES.includes(user.role)` 
   - If a role is added to `STUDENT_READ_ROLES` without proper regNo check, IDOR possible

5. **Notification audience filtering has edge cases**:
   - `notificationWhereFor(user)` for students: `{ OR: [{ audience: 'all' }, { audience: 'students' }, { userId: user.id }] }`
   - A notice with `audience: 'students'` + `userId: someStudentId` would only show to that specific student, not all students — intent may be unclear

6. **No email verification flow**: Users can login immediately after creation; no verify-email link

7. **`leaveUsed` update race condition**:
   - `POST /api/leaves/:id/decision` updates `student.leaveUsed` based on count at that moment
   - If multiple decisions processed concurrently, could over/under-count

### Summary

Authentication in this project is **fully implemented** with:
- Secure password hashing (bcrypt)
- JWT-based stateless authentication
- Token version invalidation on logout
- Session expiry with rolling refresh
- Role-based token validation

Authorization is **largely implemented** with:
- Per-route role checks
- Hostel scoping for wardens
- Student self-filtering by regNo
- Audience-based notice filtering

**Outstanding security items** (must fix before production):
1. Add admin check to `PUT /api/rooms/:id/status`
2. Remove or gate demo credential accounts
3. Consider adding password expiry/rotation policy
4. Add CSRF protection
5. Review notification audience logic for clarity