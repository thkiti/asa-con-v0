# Prisma

Inventory kernel schema for ASA-CON v0.

## Commands

```bash
# Generate client (no database required)
npm run db:generate

# Apply migrations — manual, reviewed separately (NOT run in Phase 1)
# npx prisma migrate dev --name init_kernel
```

Copy `.env.example` to `.env` and set `DATABASE_URL` before running migrations.

## Phase 1

- `schema.prisma` — 10 kernel models (see [docs/04_PRISMA_KERNEL.md](../docs/04_PRISMA_KERNEL.md))
- No migration files committed yet
- No seed data
