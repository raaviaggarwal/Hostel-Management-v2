# API Documentation

## API Route Inventory
From `backend/src/routes/index.js`, the API registers around 100 resource routes for auth, notices, hostels, rooms, blocks, students, wardens, allocations, complaints, leave, entry-exit, inventory, housekeeping, mess, wifi, medical, attendance, committee, audit logs, parent, reports, settings, and notifications.

## Authentication Routes
| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/login` | Accept username/email and password, compare hash, return JWT and public user record. |
| GET | `/auth/me` | Read current token and return user from decoded JWT. |
| POST | `/auth/logout` | Increments `tokenVersion` to invalidate legacy JWTs. |

## Route Examples
| Method | Route | Purpose |
|---|---|---|
| GET | `/hostels` | List hostel inventory and occupancy summary. |
| POST | `/hostels` | Create a hostel. |
| GET | `/rooms` | List rooms and normalized occupancy. |
| POST | `/rooms` | Create a room. |
| GET | `/students` | Search and list students. |
| POST | `/allocations` | Student application workflow. |
| POST | `/allocations/:id/allocate` | Room allocation workflow. |
| POST | `/complaints` | Create a complaint. |
| POST | `/leaves` | Create a leave request. |
| POST | `/entry-exit` | Create gate movement record. |

## Auth Pattern
The route handlers rely on `getUser(req)` and role helpers imported from route-level utilities in the same file. The `Authorization: Bearer <token>` header supplies the current user identity.

## Response Shape
Responses are returned with `ok(res, payload, status)` and `fail(res, message, status)` wrappers in `backend/src/routes/index.js`, forming a consistent `JSON` envelope with `message` on errors.

## Interview Notes
The API contract is shaped by route-local validations and business checks. There is no separate OpenAPI file. Route naming mirrors database resources directly.
