# ASA-CON v0

Clean-base modular monolith for ASA inventory and POS.

- **Reference repo:** `asa-con` (read-only — do not copy legacy code)
- **Status:** Phase 22B period audit export complete — see [docs/00_README.md](./docs/00_README.md)

Phase 22B adds a composed period audit export bundle with browser CSV pack and print on the timeline page. Phase 22A adds the read-only audit timeline. Phase 21B adds request → approve → execute for HARD reopen (`RRO-{periodKey}-{seq}` audit ids, explicit approval/rejection fields). Summaries: [docs/28_FINANCE_PERIOD_AUDIT_EXPORT.md](./docs/28_FINANCE_PERIOD_AUDIT_EXPORT.md), [docs/27_FINANCE_PERIOD_AUDIT_TIMELINE.md](./docs/27_FINANCE_PERIOD_AUDIT_TIMELINE.md).

## Docs

Start with [docs/00_README.md](./docs/00_README.md).

- Finance periods: [docs/15_FINANCE_PERIODS.md](./docs/15_FINANCE_PERIODS.md)
- Reconciliation dashboard: [docs/16_FINANCE_RECONCILIATION.md](./docs/16_FINANCE_RECONCILIATION.md) — UI at `/finance/reconciliation`
- Reconciliation drill-down: [docs/17_RECONCILIATION_DRILLDOWN.md](./docs/17_RECONCILIATION_DRILLDOWN.md)
- Reconciliation snapshots: [docs/18_RECONCILIATION_SNAPSHOTS.md](./docs/18_RECONCILIATION_SNAPSHOTS.md) — UI at `/finance/reconciliation/snapshots`
- Phase 19 stabilization: [docs/19_FINANCE_RECONCILIATION_STABILIZATION.md](./docs/19_FINANCE_RECONCILIATION_STABILIZATION.md) — snapshot UX, posting-lock audit, evidence export
- Finance traceability: [docs/20_FINANCE_TRACEABILITY.md](./docs/20_FINANCE_TRACEABILITY.md) — Phase 20A lineage panel, voucher detail, frozen snapshot trace
- Close readiness: [docs/21_FINANCE_CLOSE_WORKFLOW.md](./docs/21_FINANCE_CLOSE_WORKFLOW.md) — Phase 20B period close checklist, blocker rules, evidence links
- Close gate: [docs/22_FINANCE_CLOSE_GATE.md](./docs/22_FINANCE_CLOSE_GATE.md) — Phase 20C enforced HARD close, policy, rollback, no side effects
- Close evidence: [docs/23_FINANCE_CLOSE_EVIDENCE.md](./docs/23_FINANCE_CLOSE_EVIDENCE.md) — Phase 20D immutable HARD-close audit record and review UI
- Close evidence export/print: [docs/24_FINANCE_CLOSE_EVIDENCE_EXPORT.md](./docs/24_FINANCE_CLOSE_EVIDENCE_EXPORT.md) — Phase 20E browser CSV pack and audit print from stored evidence

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
| 20B | Close readiness — period checklist, blocker rules, evidence deep links (read-only review before close) |
| 20C | Close gate — enforced HARD close in `closeAccountingPeriod`, centralized policy, structured 409 errors, no bypass |
| 20D | Close evidence — immutable HARD-close snapshot (`AccountingPeriodCloseEvidence`), GET API, `/finance/periods/[id]/close-evidence` |
| 20E | Close evidence export/print — browser CSV pack + audit print from stored `CloseEvidenceDetail` (no export API route) |
| 21A | Reopen control — audited HARD/soft reopen, append-only close evidence history, reopen evidence API/UI |
| 21B | Reopen approval — HARD reopen request workflow, HO_ADMIN approve, separation of duties |
| 22A | Period audit timeline — read-only merge of lifecycle, close/reopen evidence, reopen requests (`GET .../timeline`) |
| 22B | Period audit export — composed bundle, CSV pack, print (`GET .../audit-export`) |
