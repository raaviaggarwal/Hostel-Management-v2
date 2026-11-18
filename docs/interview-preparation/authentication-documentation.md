# Authentication Documentation

## Login Flow
The route `POST /auth/login` accepts `usernameOrEmail` and `password` fields, reads the `User` record by matching `username` or `email`, and verifies the supplied password with `bcrypt.compareSync`. If successful, the login route returns a JWT through `signToken(user)` and a stripped public user object through `publicUser(user)`.

## JWT Design
The token payload contains:
- `sub`: user id
- `role`: role string
- `ver`: tokenVersion

JWT signing is configured in `backend/src/auth.js`:
- issuer: `hostel-management`
- audience: `hostel-management-web`
- default expiry: 24h

## JWT Verification
The route helper `getUser(req)` reads the `Authorization` header, strips the `Bearer ` prefix, verifies the token with `verifyToken()`, queries the user by `payload.sub`, and checks if the stored `role` and `tokenVersion` still match the payload. This mechanism prevents stale token reuse after logout.

## Logout Flow
`POST /auth/logout` reads the user via `getUser(req)` and then increments `tokenVersion`. Old JWTs become unusable because the `ver` check fails.

## Role Helpers
The route file provides role-specific access helpers:
- `adminUser(req)`
- `wardenUser(req)`
- `roleUser(req, roles)`
- `messUser(req)`
- `staffHostelUser(req)`
- `guardUser(req)`
- `parentUser(req)`
- `studentScope(req)`

These functions are route-local and act as the enforcement layer for role restrictions.

## Client Session Handling
Client auth context stores token and user in localStorage. Session expiry is stored using `EXPIRY_KEY`, and a check is performed on mount and interval using `AuthContext`. The client uses an `AuthProvider` and `useAuth()`.

## Security Considerations
- Passwords compared via `bcrypt.compareSync`.
- JWT secret must be configured in production in `backend/src/auth.js`.
- Token storage in localStorage is convenience-first, not refresh-token-safe.
- There is no separate cookie session or refresh-token rotation model.
