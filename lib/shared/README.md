# lib/shared

Cross-domain infrastructure (Phase 1+).

| File | Purpose |
|------|---------|
| `prisma.ts` | Singleton Prisma client (`DATABASE_URL` required at runtime) |
| `types.ts` | Re-exported kernel enums + small foundational aliases |
| `index.ts` | Public exports |

Domain modules import from `@/lib/shared` — not from `@/generated/prisma` directly.
