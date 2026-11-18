# Interview Questions and Answers

## Questions
1. What problem does this project solve?
2. Why is the backend implemented in one route file?
3. How is login authentication performed?
4. How does role-based access work?
5. What does `getUser(req)` do?
6. Why are `Notification` and `AuditLog` hooks important?
7. How are route-level authorization checks modeled?
8. What is the database schema style?
9. Why is there no separate controller or service folder?
10. What security hardening already exists?
11. What is the frontend architecture?
12. What would you do to scale the app?

## Ideal Answers
The ideal answer is one that explains the route-local auth helper model, Prisma schema data access, JWT verification, and role-aware UI and route protections.

## Suggested Follow-up
Ask the candidate how they would split the route file into controllers/services and add Redis or a validation layer.
