# Lessons from asa-con (reference only)

Old repo path: `D:\_projects\asa-con`  
Do not copy code — use for behavior specs and anti-patterns.

## Keep (domain knowledge)

| Topic | Reference |
|-------|-----------|
| Domain glossary | `docs/ASA_CON_System_Architecture_and_Domain_Blueprint.md` |
| Inventory / ledger model | `docs/05_INVENTORY_ACCOUNTING_ARCHITECTURE_v1.md` |
| Transaction nesting rule | `docs/04_ARCHITECTURE_LOCK_v2.md` |
| Batch flow (lines = truth) | `docs/30_BATCH_FLOW_EXECUTION_PLAN.md` |
| Product group / summary rules | `docs/STOCK_RULES.md` |
| POS negative stock policy | `docs/09_inventory-governance.md` |
| `issueStock` implementation | `lib/stock.ts` |
| Document workflow | `lib/stock-document/workflow.ts` |
| SAVE draft pattern | `app/api/stock-document/route.ts` |
| POST ledger pattern | `lib/stock-document/executeLedgerPost.ts` |

## Avoid (anti-patterns)

| Problem | Where in asa-con |
|---------|------------------|
| Split `lib/` vs `app/lib/` | `app/lib/stockCodes`, `canAccess`, `menuConfig` |
| Fat API routes | `app/api/stock-document/route.ts` |
| Fat page component | `components/stock-document/StockDocumentPage.tsx` |
| Duplicate summary logic | Page + `shop-summary` API + print/PDF |
| Scattered permissions | `middleware.ts`, `app/config/roleAccess.ts`, `menuConfig` |
| POS bypasses ledger | `app/api/pos/checkout/route.ts` |
| Legacy / trash in app tree | `trash/`, deb routes beside production |

## v0 approach

Implement one vertical slice at a time in `asa-con-v0` with boundaries locked in `docs/01_MODULAR_MONOLITH_BOUNDARIES.md`.
