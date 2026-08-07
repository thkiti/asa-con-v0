# Auth & Permissions (Phase 2)

Centralized role access, session stub, route/menu guards.

## Principles

1. Permissions live in `lib/permissions/` — not in components.
2. Session lives in `lib/auth/` — minimal `SessionUser` abstraction.
3. `middleware.ts` is thin — delegates to auth cookies + `canAccessRoute()`.
4. Pure guard functions: `canAccessRoute()`, `canAccessMenu()`.

## Role / area matrix

| Role | finance | admin | operations | shop | master | system | Landing |
|------|---------|-------|------------|------|--------|--------|---------|
| `HO_FINANCE` | yes | yes | yes | yes | no | no | `/main` |
| `HO_ADMIN` | yes | yes | yes | yes | yes | yes | `/main` |
| `HO_OPERATIONS` | yes | no | yes | yes | no | no | `/main` |
| `SH_STAFF` | no | no | no | yes | no | no | `/main` |

### SH_STAFF Replacer (`allowAnyBranchLogin`)

Some shop staff are configured in **Master → Staff** as **Replacer / พนักงานแทน** (`Staff.allowAnyBranchLogin`). This is **not** HO access, finance access, or cross-branch stock access inside the app.

| Concept | Meaning |
|---------|---------|
| Home branch | `Staff.branchId` — permanent assignment in master data |
| Session branch | Branch code entered at login — stored in session cookies |
| Replacer login | `SH_STAFF` with `allowAnyBranchLogin` may log in to any **active shop (`SH`) branch** as replacement staff |
| After login | Behaves like normal `SH_STAFF` of the **selected session branch** only (POS, stock documents, print — all scoped to session `branchId`) |
| Not allowed | HO branches, inactive/deleted branches, arbitrary branch switching after login, finance/admin/master routes |

Collector (`posCanCollect`) is independent — unchanged by replacer.

**Master Database** (`/master/*`): HO_ADMIN-only maintenance for **Branch**, **Staff**, and **Product / ReferenceStock** (CRUD complete). Bulk product and reference **creation** remains **System Import** (`/system/import`). See [30_MASTER_DATABASE.md](./30_MASTER_DATABASE.md).

| Page | Path | Notes |
|------|------|-------|
| Hub | `/master` | Links to maintenance areas |
| Branch | `/master/branch` | Create / edit / soft-delete; `HO999` and `SH999` protected |
| Staff | `/master/staff` | Create / edit / reset password / soft-delete; guards for `001`, `DEV`, last HO_ADMIN |
| Product & reference | `/master/product-reference` | Product name/type; reference links; Save Product vs Save All; row trash cascades refs |

**Product–reference rules (summary):** Product = durable sellable identity; ReferenceStock = current counting/hook link (mutable, hard-deleted on trash). Row trash soft-deletes product and hard-deletes its references (hooks freed). Restore product only (hook-less). Modal trash hard-deletes a single reference while product stays active. No Restore Reference Link. No stock-posting or finance-posting changes.

## Route matrix (examples)

| Path | HO_FINANCE | HO_ADMIN | HO_OPERATIONS | SH_STAFF |
|------|------------|----------|---------------|----------|
| `/finance` | allow | allow | allow | deny |
| `/admin` | allow | allow | deny | deny |
| `/operations` | allow | allow | allow | deny |
| `/shop` | allow | allow | allow | allow |
| `/master` | deny | allow | deny | deny |
| `/master/product-reference` | deny | allow | deny | deny |
| `GET/POST/PATCH /api/master/*` | deny | allow | deny | deny |
| `/master/branch` | deny | allow | deny | deny |
| `/master/staff` | deny | allow | deny | deny |
| `/login` | public | public | public | public |
| `/unauthorized` | public | public | public | public |
| `/api/health` | bypass RBAC | bypass | bypass | bypass |
| `/api/auth/session` | bypass RBAC | bypass | bypass | bypass |
| `/api/finance/*` | bypass RBAC (route auth on POST/PATCH) | bypass | bypass | bypass |
| `/api/pos/*` | bypass RBAC (route handler auth/errors) | bypass | bypass | bypass |
| `/finance/periods` | allow | allow | deny | deny |

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
  → skip _next / favicon / api bypass paths (/api/health, /api/auth/session, /api/finance, /api/pos)
  → public path? → next
  → read session cookies
  → missing session? → redirect /login
  → pathname / ? → redirect roleLandingPath(role)
  → canAccessRoute(pathname, role)? → next : redirect /unauthorized
```

API bypass skips middleware redirects only. Mutating finance routes enforce auth in route handlers (`requirePeriodAdminActor`). See [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md).

## API

| Route | Purpose |
|-------|---------|
| `GET /api/auth/session` | Returns `{ user: SessionUser }` or 401 |
| `GET /api/finance/periods` | List accounting periods (public JSON) |
| `POST/PATCH /api/finance/periods` | Period admin — requires `HO_FINANCE` or `HO_ADMIN` |
| `POST /api/pos/checkout` | POS checkout — route-level errors as JSON |

## Not in Phase 2

- Real login / password check
- OAuth, JWT, refresh tokens
- Session DB table (uses cookies only; `Staff` model unchanged)
- Menu UI rendering
- Stock or business API routes
