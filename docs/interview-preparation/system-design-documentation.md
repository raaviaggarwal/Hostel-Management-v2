# System Design Documentation

## Current Architecture
```text
React client
 -> API helper wrapper
 -> JWT bearer token
 -> Express app and route file
 -> Prisma access
 -> PostgreSQL database
```

## Current State
The project currently uses a single Express route file and a single Prisma schema. It is monolithic from a service point of view and route-heavy from a controller point of view.

## Strengths
- Good for small internal deployments.
- Route file is easy to inspect and run locally.
- Prisma schema and route code communicate directly.

## Weaknesses
- Route file as service/repository source can become inconsistent.
- No explicit queue or background worker layer.
- No cache layer or pagination strategy beyond model-specific wrappers.

## Scaling Suggestions
For 10k or 100k users, move to:
- a service layer for business logic,
- Redis cache for read-heavy dashboards,
- role-based policy engine,
- central request validation,
- observability and structured logs,
- proper CI/CD and infrastructure tests.

## Interview Angle
The codebase is a compact operations system built around JSON APIs and a relational DB. The main improvement path is layering and scaling, not a full rewrite.
