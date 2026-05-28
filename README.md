# ASA-CON v0

Clean-base modular monolith for ASA inventory and POS.

- **Reference repo:** `asa-con` (read-only — do not copy legacy code)
- **Status:** `phase19c-stable` — Phase 19 reconciliation stabilization complete; see [docs/00_README.md](./docs/00_README.md)

Phase 19 completed reconciliation stabilization: snapshot UX polish (19A), posting-lock enforcement audit (19B), and evidence export / audit print (19C). Summary: [docs/19_FINANCE_RECONCILIATION_STABILIZATION.md](./docs/19_FINANCE_RECONCILIATION_STABILIZATION.md).

## Docs

Start with [docs/00_README.md](./docs/00_README.md).

- Finance periods: [docs/15_FINANCE_PERIODS.md](./docs/15_FINANCE_PERIODS.md)
- Reconciliation dashboard: [docs/16_FINANCE_RECONCILIATION.md](./docs/16_FINANCE_RECONCILIATION.md) — UI at `/finance/reconciliation`
- Reconciliation drill-down: [docs/17_RECONCILIATION_DRILLDOWN.md](./docs/17_RECONCILIATION_DRILLDOWN.md)
- Reconciliation snapshots: [docs/18_RECONCILIATION_SNAPSHOTS.md](./docs/18_RECONCILIATION_SNAPSHOTS.md) — UI at `/finance/reconciliation/snapshots`
- Phase 19 stabilization: [docs/19_FINANCE_RECONCILIATION_STABILIZATION.md](./docs/19_FINANCE_RECONCILIATION_STABILIZATION.md) — snapshot UX, posting-lock audit, evidence export
- Finance traceability: [docs/20_FINANCE_TRACEABILITY.md](./docs/20_FINANCE_TRACEABILITY.md) — Phase 20A lineage panel, voucher detail, frozen snapshot trace

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
| 16 | Finance reconciliation dashboard (`/finance/reconciliation`) |
| 17 | Transaction-level reconciliation drill-down (`GET .../reconciliation/issues`) |
| 18 | Reconciliation snapshots (`/finance/reconciliation/snapshots`, `POST .../snapshots`) |
| 19 | Reconciliation stabilization — snapshot UX (19A), posting-lock audit (19B), evidence export/print (19C); tag `phase19c-stable` |
| 20A | Finance traceability — issue lineage panel, read-only voucher detail, frozen snapshot trace |
