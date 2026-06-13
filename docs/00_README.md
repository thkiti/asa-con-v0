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
18. [18_RECONCILIATION_SNAPSHOTS.md](./18_RECONCILIATION_SNAPSHOTS.md) — Phase 18 frozen reconciliation snapshots
19. [19_FINANCE_RECONCILIATION_STABILIZATION.md](./19_FINANCE_RECONCILIATION_STABILIZATION.md) — Phase 19 stabilization summary (19A UI, 19B posting-lock audit, 19C evidence export)
20. [20_FINANCE_TRACEABILITY.md](./20_FINANCE_TRACEABILITY.md) — Phase 20A read-only finance lineage navigation
21. [21_FINANCE_CLOSE_WORKFLOW.md](./21_FINANCE_CLOSE_WORKFLOW.md) — Phase 20B read-only period close readiness checklist
22. [22_FINANCE_CLOSE_GATE.md](./22_FINANCE_CLOSE_GATE.md) — Phase 20C enforced HARD close gating, policy, structured errors
23. [23_FINANCE_CLOSE_EVIDENCE.md](./23_FINANCE_CLOSE_EVIDENCE.md) — Phase 20D immutable HARD-close evidence snapshot
24. [24_FINANCE_CLOSE_EVIDENCE_EXPORT.md](./24_FINANCE_CLOSE_EVIDENCE_EXPORT.md) — Phase 20E close evidence browser export and audit print
25. [25_FINANCE_REOPEN_CONTROL.md](./25_FINANCE_REOPEN_CONTROL.md) — Phase 21A controlled reopen and append-only close/reopen evidence history
26. [26_FINANCE_REOPEN_APPROVAL.md](./26_FINANCE_REOPEN_APPROVAL.md) — Phase 21B HARD reopen approval workflow
27. [27_FINANCE_PERIOD_AUDIT_TIMELINE.md](./27_FINANCE_PERIOD_AUDIT_TIMELINE.md) — Phase 22A read-only period audit timeline
28. [28_FINANCE_PERIOD_AUDIT_EXPORT.md](./28_FINANCE_PERIOD_AUDIT_EXPORT.md) — Phase 22B period audit export bundle, CSV pack, print
29. [29_STOCK_DOCUMENT_WORKFLOW.md](./29_STOCK_DOCUMENT_WORKFLOW.md) — Phase 23B-0 stock document status writer and transition policy
30. [30_MASTER_DATABASE.md](./30_MASTER_DATABASE.md) — Master Database HO_ADMIN CRUD (branch, staff, product / reference)
31. [31_FINANCE_CORE_16A_COA_IMPORT.md](./31_FINANCE_CORE_16A_COA_IMPORT.md) — Finance Core 16A chart of accounts import
32. [32_FINANCE_CORE_16B_MANUAL_JOURNAL.md](./32_FINANCE_CORE_16B_MANUAL_JOURNAL.md) — Finance Core 16B manual journal & reversal
33. [33_FINANCE_CORE_16F_BALANCE_SHEET.md](./33_FINANCE_CORE_16F_BALANCE_SHEET.md) — Finance Core 16F balance sheet (read-only)
34. [34_FINANCE_CORE_16G_RETAINED_EARNINGS.md](./34_FINANCE_CORE_16G_RETAINED_EARNINGS.md) — Finance Core 16G retained earnings bridge (account 301)
35. [35_FINANCE_CORE_16H_CLOSING_ENTRY.md](./35_FINANCE_CORE_16H_CLOSING_ENTRY.md) — Finance Core 16H period closing entry (P&amp;L → RE account 301)
36. [36_FINANCE_CORE_16I_CHANGES_IN_EQUITY.md](./36_FINANCE_CORE_16I_CHANGES_IN_EQUITY.md) — Finance Core 16I statement of changes in equity (read-only)
31. [reference/ASA_CON_LESSONS.md](./reference/ASA_CON_LESSONS.md) — what to learn from the old repo
32. [POS_COMPLETION_ROADMAP.md](./POS_COMPLETION_ROADMAP.md) — **POS Complete gate (P1–P4)** + thermal 80mm scope (memory doc)
33. [RECEIPT_SETUP.md](./RECEIPT_SETUP.md) — current receipt layout / tax ID rules (pre-unify)
34. [2026_MIGRATION_AND_PARALLEL_RUN_PLAN.md](./2026_MIGRATION_AND_PARALLEL_RUN_PLAN.md) — legacy Excel migration, gradual import, parallel run, cutover gates

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
| 18 | Reconciliation snapshots (manual capture, frozen history) | Done |
| 19 | Finance reconciliation stabilization (19A UI, 19B posting-lock audit, 19C evidence export) | Done |
| 20A | Finance traceability (lineage panel, voucher read API, frozen snapshot trace) | Done |
| 20B | Finance close readiness (checklist, blocker rules, evidence links — read-only review) | Done |
| 20C | Finance close gate (enforced HARD close, centralized policy, structured 409 errors) | Done |
| 20D | Finance close evidence (immutable HARD-close audit record, GET API, review UI) | Done |
| 20E | Close evidence export/print (browser CSV pack, audit print from stored evidence) | Done |
| 21A | Reopen control (audited reopen, append-only close evidence history, reopen evidence) | Done |
| 21B | Reopen approval workflow (HARD reopen request → approve → execute) | Done |
| 22A | Period audit timeline (read-only lifecycle + evidence + reopen workflow) | Done |
| 22B | Period audit export (composed bundle, CSV pack, print on timeline page) | Done |
| 23B-0 | Stock document workflow foundation (CANCELLED, status writer, policy, guards) | Done |
| MD | Master Database — Branch / Staff / Product–Reference CRUD (`/master/*`, HO_ADMIN only) | Done |
| 16F | Finance Core — Balance Sheet read-only statement (`/finance/reports/balance-sheet`) | Done |
| 16G | Finance Core — Retained Earnings bridge (`/finance/reports/retained-earnings`, account 301) | Done |
| 16H | Finance Core — Period closing entry (`/finance/periods/[id]/closing-entry`, P&amp;L → account 301) | Done |
| 16I | Finance Core — Statement of changes in equity (`/finance/reports/changes-in-equity`) | Done |
| POS | **POS Complete roadmap (P1–P4)** — posting validation, thermal print, READ_Z, repair review | **In progress** — see [POS_COMPLETION_ROADMAP.md](./POS_COMPLETION_ROADMAP.md) |
| MIG | 2026 legacy Excel migration and parallel run (Phases A–G) | **Planning** — see [2026_MIGRATION_AND_PARALLEL_RUN_PLAN.md](./2026_MIGRATION_AND_PARALLEL_RUN_PLAN.md) |
