# ASA-CON v0 Documentation

Clean-base modular monolith. Reference repo: `asa-con` (read-only).

## Reading order

1. [01_MODULAR_MONOLITH_BOUNDARIES.md](./01_MODULAR_MONOLITH_BOUNDARIES.md) — invariants and layer rules
2. [02_FOLDER_CONVENTIONS.md](./02_FOLDER_CONVENTIONS.md) — where code lives
3. [03_DOMAIN_MAP.md](./03_DOMAIN_MAP.md) — domains, routes, module ownership
4. [04_PRISMA_KERNEL.md](./04_PRISMA_KERNEL.md) — Phase 1 schema
5. [05_AUTH_PERMISSIONS.md](./05_AUTH_PERMISSIONS.md) — Phase 2 auth & RBAC
6. [06_STOCK_LEDGER_FOUNDATION.md](./06_STOCK_LEDGER_FOUNDATION.md) — Phase 3 ledger architecture
7. [07_STOCK_DOCUMENT_POSTING.md](./07_STOCK_DOCUMENT_POSTING.md) — Phase 4 posting orchestration
8. [ARCHITECTURE_GUARDS.md](./ARCHITECTURE_GUARDS.md) — grep/audit rules for boundary enforcement
9. [08_POS_CHECKOUT_ARCHITECTURE.md](./08_POS_CHECKOUT_ARCHITECTURE.md) — Phase 5 POS checkout architecture
10. [09_REFERENCE_DATA_AND_PRODUCT_TYPES.md](./09_REFERENCE_DATA_AND_PRODUCT_TYPES.md) — ProductType and reference data semantics
11. [10_REPORTING_AND_SUMMARY_KERNEL.md](./10_REPORTING_AND_SUMMARY_KERNEL.md) — Phase 6 reporting kernel architecture
12. [11_FINANCE_POSTING_ARCHITECTURE.md](./11_FINANCE_POSTING_ARCHITECTURE.md) — Phase 7 finance posting architecture
13. [12_FINANCE_RECONCILIATION_AND_CLOSE_POLICY.md](./12_FINANCE_RECONCILIATION_AND_CLOSE_POLICY.md) — reconciliation and period-close policy
14. [13_FINANCE_OPERATIONAL_WIRING.md](./13_FINANCE_OPERATIONAL_WIRING.md) — operational finance hook wiring
15. [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md) — Phase 15 period lifecycle, posting lock, admin API/UI
16. [16_FINANCE_RECONCILIATION.md](./16_FINANCE_RECONCILIATION.md) — Phase 16 read-only reconciliation dashboard
17. [17_RECONCILIATION_DRILLDOWN.md](./17_RECONCILIATION_DRILLDOWN.md) — Phase 17 transaction-level issues API + drill-down
18. [reference/ASA_CON_LESSONS.md](./reference/ASA_CON_LESSONS.md) — what to learn from the old repo

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Docs + folder scaffold | Done |
| 1 | Prisma kernel + shared types | Done |
| 2 | Permissions + auth foundation | Done |
| 3 | Stock ledger (`issueStock` / `receiveStock`) | Done |
| 4 | Stock document posting (`postDocument`) | Done |
| 5 | POS checkout (`checkout`) | Done |
| 6 | Reporting kernel (read-only summaries) | Done |
| 7 | Finance posting (GL / vouchers) | Done |
| 7b | Finance reconciliation & close policy | Done |
| 7c | Finance operational wiring | Done |
| 15 | Finance periods (lifecycle, admin, posting lock) | Done |
| 16 | Finance reconciliation dashboard (read-only variance workflow) | Done |
| 17 | Transaction-level reconciliation drill-down | Done |
