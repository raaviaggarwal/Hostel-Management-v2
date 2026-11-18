# Middleware Documentation

## Express Middleware Chain
`backend/src/app.js` constructs the Express app and applies middleware in this order:

```text
Request
 -> Helmet
 -> CORS
 -> JSON parser with 2MB body limit
 -> Production rate limiters
 -> /api router
 -> Route-level auth helper
 -> Database operations via Prisma
 -> Response
```

## Middleware Components
- `helmet()`: baseline security headers.
- `cors({ origin: allowedOrigins })`: restrict cross-origin resource request origins.
- `express.json({ limit: '2mb' })`: parse JSON body.
- `generalLimiter` and `loginLimiter`: production rate limiters.

## Middleware Execution Pattern
The route file wraps validator-friendly callback access in `wrap()` to ensure async errors flow to Express error handlers, allowing unhandled route errors to become a unified handler rather than a crash.

## Security Implications
This middleware layer is a good first line of defense but there is no global validation middleware, no schema validation library, and no standardized filtering of route payloads beyond route-specific picks. In an interview, it is worth calling out that security is route-checked and route-local rather than centrally enforced.
