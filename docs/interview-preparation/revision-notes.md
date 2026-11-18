# 30-Minute Revision Notes

## What This Project Is
It is a university hostel management platform with operational dashboards for hostel, warden, student, parent, security, mess, caretaker, housekeeping, and admin roles.

## Core Request Flow
Start from UI -> `apiFetch()` -> route -> `authUser` role helpers -> `prisma` -> result.

## Auth Model
Token is JWT. It is stored in `localStorage` on the client and attached through the `Authorization` header. `getUser(req)` verifies the token, returns a user from `prisma.user.findUnique()`, checks `role` and `tokenVersion`, and passes the request context to route functions.

## Important Route Groups
- `/auth`
- `/hostels`, `/blocks`, `/rooms`
- `/students`, `/wardens`, `/allocations`
- `/complaints`, `/leaves`, `/entry-exit`
- `/mess-*` and `/medical`
- `/audit-logs`

## Data Model
Core relational model is in Prisma schema: `User`, `Hostel`, `Block`, `Room`, `Student`, `Allocation`, `Complaint`, `Leave`, `Notice`, etc.

## Great Interview Answer
A senior answer would state that the project is a full-stack internal operations system for hostel administration with one route file carrying the business behavior, one schema representing the domain, and a frontend that maps to user role screens through route guards and context providers.
