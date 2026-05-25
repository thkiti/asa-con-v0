# Auth & Permissions (Phase 2)

Centralized role access, session stub, route/menu guards.

## Principles

1. Permissions live in `lib/permissions/` — not in components.
2. Session lives in `lib/auth/` — minimal `SessionUser` abstraction.
3. `middleware.ts` is thin — delegates to auth cookies + `canAccessRoute()`.
4. Pure guard functions: `canAccessRoute()`, `canAccessMenu()`.

## Role / area matrix

| Role | finance | admin | operations | shop | Landing |
|------|---------|-------|------------|------|---------|
| `HO_FINANCE` | yes | yes | yes | yes | `/finance` |
| `HO_ADMIN` | yes | yes | yes | yes | `/finance` |
| `HO_OPERATIONS` | yes | no | yes | yes | `/operations` |
| `SH_STAFF` | no | no | no | yes | `/shop` |

## Route matrix (examples)

| Path | HO_FINANCE | HO_ADMIN | HO_OPERATIONS | SH_STAFF |
|------|------------|----------|---------------|----------|
| `/finance` | allow | allow | allow | deny |
| `/admin` | allow | allow | deny | deny |
| `/operations` | allow | allow | allow | deny |
| `/shop` | allow | allow | allow | allow |
| `/login` | public | public | public | public |
| `/unauthorized` | public | public | public | public |
| `/api/health` | bypass RBAC | bypass | bypass | bypass |
| `/api/auth/session` | bypass RBAC | bypass | bypass | bypass |

Unknown paths under `(main)` are **denied** (fail closed).

## Session cookies (stub)

| Cookie | Purpose |
|--------|---------|
| `sessionId` | Opaque session id (required) |
| `role` | One of `Role` enum values (required) |
| `staffId` | Staff code (optional in stub) |
| `staffName` | Display name (optional) |
| `branchId` | Branch id (optional) |

Phase 2 does **not** validate cookies against the database.

### Dev testing (manual)

Set cookies in the browser, then visit `/` or an area route. Example role: `HO_FINANCE` + any `sessionId`.

## Middleware flow

```
Request
  → skip _next / favicon / api bypass paths
  → public path? → next
  → read session cookies
  → missing session? → redirect /login
  → pathname / ? → redirect roleLandingPath(role)
  → canAccessRoute(pathname, role)? → next : redirect /unauthorized
```

## API

| Route | Purpose |
|-------|---------|
| `GET /api/auth/session` | Returns `{ user: SessionUser }` or 401 |

## Not in Phase 2

- Real login / password check
- OAuth, JWT, refresh tokens
- Session DB table (uses cookies only; `Staff` model unchanged)
- Menu UI rendering
- Stock or business API routes
