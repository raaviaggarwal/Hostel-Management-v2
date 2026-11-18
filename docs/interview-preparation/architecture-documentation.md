# Architecture Documentation

## Project Summary
This repository is a full-stack hostel management system with a React SPA client and Express + Prisma API backed by PostgreSQL. The frontend has role-aware routes and protected layouts. The backend provides all operational APIs and uses repository-like route utilities directly in one router file.

## Runtime Flow
```text
React client
  -> apiFetch in frontend/src/api/client.js
  -> Authorization: Bearer <JWT>
  -> Express app in backend/src/app.js
  -> router in backend/src/routes/index.js
  -> Prisma client in backend/src/prisma.js
  -> PostgreSQL schema from backend/prisma/schema.prisma
```

## Major Components
- `backend/src/app.js`: middleware composition, routing mount, CORS, Helmet, rate limiting, dist static fallback.
- `backend/src/auth.js`: JWT signing, issuer/audience, secret management, role constants.
- `backend/src/routes/index.js`: all business operations and route logic.
- `backend/prisma/schema.prisma`: all relational tables.
- `frontend/src/context/AuthContext.jsx`: session/app auth state.
- `frontend/src/routes/ProtectedRoute.jsx`: role-gate route rendering.

## Strengths
- Simple monolithic route architecture.
- Fast implementation for an operations dashboard.
- Clear Prisma schema and role helper model.

## Weaknesses
- No service/controller architecture.
- Route file grows with business logic.
- Auth/session handling uses localStorage token storage.

## Interview Angle
A senior conversation should explain that the repository demonstrates a role-aware internal operations platform built quickly and clearly, but with opportunities to split out a services layer and stronger security handling for production.
