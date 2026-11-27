# API

## Purpose

`@wx/api` is the Node.js and Hono backend for reading weather measurements. The dashboard still uses Supabase.

## Architecture

Keep the request flow explicit:

```text
HTTP request -> router -> service -> repository -> PostgreSQL
```

- `src/index.ts` starts and stops the HTTP server. `src/app.ts` assembles the routes without opening an HTTP listener, so tests can call the app directly.
- `src/schema/` defines Zod request schemas and related public API types. Put validation rules here, not inline in route handlers.
- `src/router/` reads and validates HTTP input against those schemas before calling a service. It owns successful response bodies and status codes.
- `src/service/` handles business logic and coordinates repository calls. Keep Hono contexts and SQL out of services.
- Put expected failures in `src/application-errors/`. Throw them instead of building error responses in routes. `src/error-manager.ts` maps them to HTTP responses and
  hides unexpected error details.
- `src/repository/` handles SQL and maps database rows to application data. Import the PostgreSQL client directly from `@wx/shared/db.ts`; do not create a separate pool.

Group related operations by domain in each layer. Use `<domain>.schema.ts`, `<domain>.router.ts`, `<domain>.service.ts`, and `<domain>.repository.ts` with the workspace's
`#` import aliases.

## Database configuration

The local start script reads `POSTGRES_*` from `packages/shared/.env`. Pass those variables at runtime in containers. The shared database client validates them at
startup. Do not commit credentials or use a `VITE_` prefix for database settings. The HTTP `PORT` is separate from `POSTGRES_PORT`. Database migrations live in
`packages/shared/migrations/` and run from `@wx/shared`.

## Tests

Use Vitest and `app.request()` to exercise routes without starting an HTTP server. The measurement tests use local Supabase PostgreSQL and require the shared database
migrations. Use transaction isolation for tests that write data, and close the pool with a Vitest teardown hook when testing against PostgreSQL.

```sh
npm run test:unit -w @wx/api
```

Run `npm run check` from the repository root for code changes.
