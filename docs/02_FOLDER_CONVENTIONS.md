# Folder Conventions

## Top-level layout

```
app/           Routes and pages (thin controllers)
components/    React UI by area
lib/           All business logic by domain
prisma/        Schema and migrations (Phase 1+)
docs/          Architecture and domain docs
__tests__/     Domain tests mirroring lib/
```

## Domain modules (`lib/`)

| Folder | Owns |
|--------|------|
| `lib/stock/` | Ledger, documents, posting, summary |
| `lib/finance/` | GL, vouchers, finance batch |
| `lib/pos/` | Checkout, receipts, reports |
| `lib/auth/` | Session and login |
| `lib/permissions/` | Route RBAC, menu access |
| `lib/pricing/` | Selling prices, policies |
| `lib/shared/` | Prisma client, shared errors, dates |

## Import rules

- Domain code imports from `lib/<domain>/index.ts` public exports.
- Do not create `app/lib/` for business logic — use `lib/` only.
- `app/api/**` imports domain services; domain code never imports from `app/`.
- Cross-domain calls use public exports only, not internal files.

## API routes

Each route file should: parse input → resolve session/role → call one domain function → return JSON.

Target size: roughly 40 lines or less per handler.

## Components

- `components/ui/` — shared primitives (shadcn, Phase 2+)
- `components/<domain>/` — domain-specific UI (Phase 4+)

## Tests

Mirror `lib/` under `__tests__/lib/`. Test domain logic without Next.js request/response mocks where possible.
