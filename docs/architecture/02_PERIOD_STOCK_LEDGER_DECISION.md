# Decision: Period-based stock ledger (retire per-event StockTransaction)

Status: **Accepted**  
Date: 2026-07-23  
Scope: Inventory ledger mutation model for `asa-con-v0`

---

## Decision

**ASA-CON retired per-event StockTransaction creation. Operational REC, DEY, and CNT remain source documents. Future StockTransaction records will be generated only from Cost Calculation based on locked END Stock Documents.**

The current cleanup intentionally removes all historical StockTransaction rows because END and Cost Calculation will reconstruct the ledger from period **2026-01** onward.

---

## Old model (retired)

```
REC / CNT / DEY (or other operational events)
  → immediately update Stock / StockLayer
  → create StockTransaction per event
  → optional per-event inventory Finance voucher
```

## New intended model

```
REC / DEY / CNT
  → remain operational source documents
  → contribute quantities to END Stock Documents
  → END reviewed and locked
  → Cost Calculation processes locked END
  → Cost Calculation creates period-based StockTransaction
     (authorized source: END_COST_CALCULATION)
  → later Finance Posting
```

---

## Immediate consequences (this change)

| Area | Behavior now |
|------|----------------|
| POS checkout (REC) | Creates Sale / SaleItem / Payment / Receipt. Does **not** call `issueStock`. Does **not** create StockTransaction. Sale Finance (tender / revenue / VAT) may still post; **COGS / inventory lines omitted**. |
| Stock document POST (CNT / ORD / transfers / adjustments) | Status → `POSTED` only. Does **not** mutate Stock / StockLayer / StockTransaction. Does **not** post inventory-cost Finance vouchers. |
| `issueStock` / `receiveStock` | Throw `PER_EVENT_LEDGER_RETIRED`. |
| `createStockTransaction` | Central boundary; only future `END_COST_CALCULATION` may create rows (not implemented yet). |
| Existing StockTransaction rows | Deleted via idempotent cleanup script (see below). |
| `Stock` / `StockLayer` | No longer updated by operational flows. Existing rows may remain as **stale transitional** balances until END + Cost Calculation. |

---

## Cleanup command

```bash
npm run stock:cleanup-retired-tx:dry-run
npm run stock:cleanup-retired-tx
```

Script: `scripts/cleanup-retired-stock-transactions.ts`  
Library: `lib/stock/cleanup-retired-stock-transactions.ts`

---

## Out of scope (do not implement in the retirement change)

- Cost Calculation
- New period-based StockTransaction generation
- Inventory Finance posting from END

---

## END Stock Document

**END is a locked period quantity summary. Locking END does not create StockTransaction, modify live Stock balances, calculate cost, or post inventory Finance entries.**

Operational details (sources, formulas, 2026-01 init, carry-forward, rebuild, lock/reopen, DEY `shopReceivedAt`): [40_END_STOCK_DOCUMENT.md](../40_END_STOCK_DOCUMENT.md).

---

## Related docs

- [ARCHITECTURE_GUARDS.md](../ARCHITECTURE_GUARDS.md) — updated mutation guards
- [06_STOCK_LEDGER_FOUNDATION.md](../06_STOCK_LEDGER_FOUNDATION.md) — historical Phase 3 design (superseded for per-event writes)
- [07_STOCK_DOCUMENT_POSTING.md](../07_STOCK_DOCUMENT_POSTING.md) — POST no longer writes ledger
- [08_POS_CHECKOUT_ARCHITECTURE.md](../08_POS_CHECKOUT_ARCHITECTURE.md) — checkout no longer issues stock
- [40_END_STOCK_DOCUMENT.md](../40_END_STOCK_DOCUMENT.md) — END worksheet domain