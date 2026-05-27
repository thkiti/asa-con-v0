# ASA-CON v0

Clean-base modular monolith for ASA inventory and POS.

- **Reference repo:** `asa-con` (read-only — do not copy legacy code)
- **Status:** Phase 15 — Finance periods stabilized; see [docs/00_README.md](./docs/00_README.md)

## Docs

Start with [docs/00_README.md](./docs/00_README.md). Finance periods: [docs/15_FINANCE_PERIODS.md](./docs/15_FINANCE_PERIODS.md).

## Setup

```bash
npm install
npm run db:generate   # prisma generate — no database required
cp .env.example .env  # set DATABASE_URL; add FINANCE_POSTING_ENABLED=true for GL posting
npm run build
```

### Local env (`.env.local`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://...` | Prisma connection |
| `FINANCE_POSTING_ENABLED` | `true` | Enable finance hooks on checkout/stock post |

Restart `npm run dev` after changing env vars.

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Smoke tests (finance)

With dev server running and `FINANCE_POSTING_ENABLED=true`:

```bash
npx tsx scripts/smoke-finance-period.ts
npx tsx scripts/smoke-finance-integration.ts
```

## Structure

```
app/        Routes (thin controllers)
lib/        Domain modules + lib/shared (prisma client, types)
prisma/     schema.prisma (kernel only)
docs/       Architecture
generated/  Prisma client output (gitignored)
```

## Phases

| Phase | Scope |
|-------|-------|
| 0 | Docs + scaffold |
| 1–7 | Prisma, auth, stock, POS, reporting, finance posting |
| 15 | Finance periods (lifecycle, admin API/UI, posting lock) |
