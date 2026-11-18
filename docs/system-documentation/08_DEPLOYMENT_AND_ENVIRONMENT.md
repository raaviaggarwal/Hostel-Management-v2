# 08_DEPLOYMENT_AND_ENVIRONMENT.md

## Deployment and Environment Investigation

This document explains the deployment configuration, environment variables, and how the frontend communicates with the deployed backend and database.

---

### Frontend Deployment

**Platform**: Vercel (configured for the frontend repository)

**Build command**: `npm run build` → `vite build`
- Output: `frontend/dist/` directory containing static assets (HTML, CSS, JS)
- Entry point: `frontend/dist/index.html`

**Development command**: `npm run dev` → Vite dev server at `http://localhost:5173`

**Environment variable** (from `frontend/package.json`):
- `VITE_API_URL` — base URL for API calls; defaults to `/api` if not set
- `API_BASE = import.meta.env.VITE_API_URL || '/api'` (`frontend/src/api/client.js:3`)
- In development: `/api` (proxies to backend via Vite dev server configuration)
- In production: production backend URL (set via Vercel environment variables)

**Vercel deployment settings** (from `.github/workflows/` or vercel.json):
- Framework preset: Vite
- Build output: `frontend/dist`
- Output directory: `dist`
- Root directory: `frontend/`
- Environment vars passed to Vercel dashboard

**Frontend production build verification**:
- `npm run build` creates `frontend/dist/`
- `index.html` exists in dist
- All API calls use `import.meta.env.VITE_API_URL` or `/api`
- No hardcoded backend URLs in source (all via env var)

---

### Backend Deployment

**Platform**: Render (configured for the Node.js backend)

**Build command** (`backend/package.json`):
```
npm run build → npx prisma generate && npx prisma migrate deploy && node --check src/index.js
```
- `prisma generate` — generates Prisma Client JS types
- `prisma migrate deploy` — applies pending PostgreSQL migrations
- `node --check src/index.js` — syntax check (--check flag type-checks without running)

**Start command** (`backend/package.json`):
- `npm run dev` → `node --watch src/index.js` (nodemon-like auto-reload for development)
- `npm start` → `node src/index.js` (production start, no auto-reload)

**Process manager**: Render uses `node src/index.js` directly; `node --watch` only in dev mode

**Port**: `process.env.PORT || 5000` (`backend/src/index.js:4`)

**Docker deployment** (from `docker-compose.yaml`):
```yaml
services:
  db:
    image: postgres:17
    restart: always
    volumes:
      - ./database/data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-1234}
      POSTGRES_DB: hostel_management

  adminer:
    image: adminer
    ports:
      - "8080:8080"
    restart: always
```
- `db`: PostgreSQL 17 container, `hostel_management` database, superuser `root`, password from env
- `adminer`: web-based PostgreSQL admin at `:8080`
- Data volume: `./database/data:/var/lib/postgresql/data` persists across container restarts

**Render-specific configuration**:
- Environment variables set in Render dashboard:
  - `DATABASE_URL` → `postgresql://root:${POSTGRES_PASSWORD:-1234}@db.internal(hostel_management)` or similar
  - `POSTGRES_PASSWORD` → set securely in Render env
  - `JWT_SECRET` → random string for production (must be set, throws if missing in prod per `auth.js:5-7`)
  - `BCRYPT_ROUNDS` → typically `10` (default from `auth.js:10`)
  - `PORT` → typically `10000` (Render assigns) or `5000`
  - `CORS_ORIGIN` → frontend URL(s)
  - `NODE_ENV` → `production` or `development`
  - `VITE_API_URL` → forwarded to frontend via Vercel/Vite integration

---

### Database Deployment

**Database**: PostgreSQL 17

**Connection**: 
- `DATABASE_URL` env var format: `postgresql://postgres:PASSWORD@host:port/database`
- Used by Prisma Client (`backend/src/prisma.js:35-37`)
- In production: points to production PostgreSQL instance (Render-managed or external)
- In tests: `TEST_DATABASE_URL` must have `test` in database name (enforced by `prisma.js:4-29`)

**Connection pooling**:
- Prisma Client manages its own connection pool
- Default connection limit: configured in `schema.prisma` or Prisma defaults
- No explicit `poolSize` in schema; Prisma uses default

**Database persistence**:
- Docker: `./database/data:/var/lib/postgresql/data` volume persists data
- Render: managed PostgreSQL; data persists across deployments
- No direct `pg_dump` or migration rollback in the investigation workflow

**Test database enforcement** (`backend/src/prisma.js`):
```javascript
function getTestDatabaseUrl() {
  const isTestRuntime = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'
  if (!isTestRuntime) return undefined
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL must be set for test runtime')
  // Validates URL protocol and database name contains 'test'
  try {
    const parsedUrl = new URL(url)
    const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1))
    if (
      !['postgres:', 'postgresql:'].includes(parsedUrl.protocol) ||
      !/(^|[_-])test([_-]|$)/i.test(databaseName)
    ) {
      throw new Error('TEST_DATABASE_URL must be a PostgreSQL URL whose database name clearly identifies it as a test database.')
    }
  } catch { throw new Error(...) }
  return url
}
```
- Ensures test runtime uses a separate test database, not production
- VITEST or NODE_ENV=test triggers test DB usage
- `TEST_DATABASE_URL` must be configured for tests to run

---

### Environment Variables

| Variable | Source | Required? | Description |
|----------|--------|-----------|-------------|
| `DATABASE_URL` | Render/environment | Yes (prod) | PostgreSQL connection string for Prisma |
| `POSTGRES_PASSWORD` | Docker/Render | Yes | Password for PostgreSQL superuser (default: `1234`) |
| `JWT_SECRET` | Render/environment | Yes (prod) | Secret for signing JWT; throws if missing in production (`auth.js:5-7`) |
| `BCRYPT_ROUNDS` | Render/environment | No | bcrypt rounds (default: `10`); `BCRYPT_ROUNDS || 10` |
| `JWT_EXPIRES_IN` | Render/environment | No | JWT expiry (default: `'24h'`) |
| `JWT_ISSUER` | Code (auth.js) | No | Hardcoded: `'hostel-management'` |
| `JWT_AUDIENCE` | Code (auth.js) | No | Hardcoded: `'hostel-management-web'` |
| `CORS_ORIGIN` | Render/environment | No | Comma-separated list of allowed CORS origins; appended to default allowlist |
| `PORT` | Render/environment | No | Port to listen on (default: `5000`); Render assigns `10000` typically |
| `NODE_ENV` | Render/environment | No | `development` or `production`; affects rate limiters and error handling |
| `VITE_API_URL` | Vercel/environment | No | Frontend API base URL; defaults to `/api` |
| `TEST_DATABASE_URL` | Test env only | Yes (if testing) | PostgreSQL test URL with `test` in database name |

**Never committed to git**: `.env` files, secrets, database passwords (per `.gitignore` and security practices)
**Referenced by name only**: values not printed, only variable names and whether they're correctly referenced.

---

### Frontend-Backend Communication in Production

**1. Development mode** (`NODE_ENV === 'development'`):
- Frontend: `vite` dev server at `localhost:5173`
- Backend: `node --watch src/index.js` at `localhost:5000`
- CORS: `allowedOrigins` includes `http://localhost:5173`
- API base: `/api` (relative; Vite dev server proxy forwards to backend)
- Database: `DATABASE_URL` from local `.env` file points to local/docker PostgreSQL
- Token: stored in `localStorage`, valid for 24 hours
- Refresh: every 60 seconds in `AuthContext`, every 30 seconds in `NotificationsContext`

**2. Production mode** (`NODE_ENV === 'production'`):
- Frontend: `npm run build` → `frontend/dist/` deployed to Vercel
- Backend: `npm run start` → `node src/index.js` on Render (port from `PORT` env var)
- CORS: `allowedOrigins` includes:
  - `http://localhost:5173` (for development workflows on Render)
  - `https://hostel-management-v2.vercel.app` (Vercel deployment)
  - Plus any from `CORS_ORIGIN` env var
- API base: `import.meta.env.VITE_API_URL` → set by Vercel environment variable
  - In Vercel: typically `https://hostel-management-v2-api.onrender.com` or similar
  - Or configured via `VITE_API_URL` env var on Vercel
- Database: `DATABASE_URL` from Render production PostgreSQL
- Token: same 24h expiry; session expiry check every 60 seconds
- Rate limiters: enabled (`generalLimiter` at `/api`, `loginLimiter` at `/api/auth/login`)
- Helmet: enabled (security headers)
- Error handling: CORS errors returned as 403 with message

**3. API request flow in production**:
```
Frontend (Vercel)
  │
  ▼
HTTPS request to VITE_API_URL (e.g., https://api.onrender.com)
  │
  ▼
Express CORS middleware (checks origin, credentials)
  │
  ▼
Rate limiter (1000 req/15min general, 10 req/15min login)
  │
  ▼
JWT verification (issuer/audience + tokenVersion check)
  │
  ▼
Prisma query (PostgreSQL)
  │
  ▼
JSON response
  │
  ▼
Frontend state update → UI render
```

**4. Vercel ↔ Render communication**:
- Vercel front-end sends requests to Render backend API
- Render forwards to PostgreSQL
- Responses return through same path
- CORS must allow Vercel domain (already configured: `https://hostel-management-v2.vercel.app`)
- If using separate API domain on Render, `VITE_API_URL` must point to it

**5. Deployment workflow**:
```
Code push → GitHub → Vercel (frontend) + Render (backend) (via CI/CD)
  │
  ├── Vercel: 
  │   ├── npm run build (vite build)
  │   ├── Serve frontend/dist/
  │   ├── Set VITE_API_URL env var (auto-detected or manual)
  │   └── Deploy CDN
  │
  └── Render:
      ├── npm run build (prisma generate + migrate deploy + type-check)
      ├── Apply pending PostgreSQL migrations
      ├── Start node src/index.js
      ├── Set DATABASE_URL, JWT_SECRET, CORS_ORIGIN, PORT env vars
      └── Live (auto-deploy on main branch push)
```

**6. Health checks** (no dedicated endpoint, but verifiable):
- `GET /api/auth/me` with valid token → 200 (returns user profile)
- `GET /api/` → 404 (no root API route, but Express serves)
- In Render: health check via service heartbeat or ping endpoint (not explicitly configured in this app)

**7. Rollback procedure** (manual, not automated):
- Render: redeploy previous commit; PostgreSQL data persists
- Prisma migrations: `prisma migrate rollback` to specific version
- Frontend: redeploy previous Vercel deployment
- Database seed: `prisma db seed` can re-seed if needed (but warned against)

**8. Environment variable verification** (from code inspection):
- `JWT_SECRET` must be set in production — `auth.js:5-7` throws if missing
- `DATABASE_URL` must be valid PostgreSQL — `prisma.js` uses it directly
- `CORS_ORIGIN` optional — defaults to localhost + Vercel domain
- `BCRYPT_ROUNDS` defaults to 10 if not set — `auth.js:10`
- No hardcoded secrets in source code (all via `process.env`)

---

### Summary of Deployment Counts

| Item | Count/Value |
|------|-----------|
| Frontend build command | `vite build` |
| Frontend dev command | `vite` |
| Backend build command | `prisma generate + migrate deploy + node --check` |
| Backend start command | `node --watch src/index.js` (dev), `node src/index.js` (start) |
| Docker services | 2 (db, adminer) |
| Environment variables (named) | 10+ (DATABASE_URL, JWT_SECRET, BCRYPT_ROUNDS, JWT_EXPIRES_IN, JWT_ISSUER, JWT_AUDIENCE, CORS_ORIGIN, PORT, NODE_ENV, VITE_API_URL) |
| Production CORS origins (default) | 2 (localhost:5173, Vercel domain) |
| Rate limiters (production) | 2 (general: 1000/15min, login: 10/15min) |
| Helmet middleware | enabled |
| Production database | PostgreSQL 17 |

---

### Critical Deployment Findings

1. **Vercel + Render integration is the primary deployment pattern** — frontend on Vercel, backend on Render, PostgreSQL on Render (or external)

2. **CORS must include both Vercel and Render domains** — `allowedOrigins` hardcodes `https://hostel-management-v2.vercel.app` plus `http://localhost:5173`; custom domains via `CORS_ORIGIN`

3. **`JWT_SECRET` is required in production** — `auth.js:5-7` throws `Error('JWT_SECRET must be set in production')` if not configured; no fallback to `'dev-secret'` in production mode

4. **Test database enforcement** — `prisma.js:4-29` forces `TEST_DATABASE_URL` with `test` in database name; prevents accidental production DB use during testing

5. **Prisma migrations deployed on every build** — `npm run build` runs `prisma migrate deploy`; ensures DB schema matches `schema.prisma`; pending migrations must be resolved before deploy

6. **No database auto-migration on frontend deploy** — frontend build (`vite build`) does not touch database; only backend `npm run build` applies migrations

7. **Environment variable isolation** — `.env` files not committed; each deployment platform (Vercel, Render) has its own env var configuration UI

8. **Development-Versus-Production behavior differences**:
   - Rate limiters: only active in production
   - Helmet: always active
   - CORS: different origins allowed
   - Error detailed messages: may differ (production may sanitize more)

9. **Frontend production build independence** — `frontend/dist/` can be deployed to any static host (Netlify, GitHub Pages); but API base URL must point to running backend

10. **Docker for local development only** — `docker-compose.yaml` is for local development (db + adminer); not the production deployment pattern (Vercel + Render).