# POS domain (`lib/pos`)

Retail checkout orchestration — **separate from stock documents**.

## Public API

- `checkout()` — atomic Sale + SaleItem + Payment + Receipt (REC). Does **not** create StockTransaction.

## Rules

1. Never import `lib/stock/posting.ts` or touch `StockDocument`.
2. Only `checkout.ts` orchestrates the checkout transaction.
3. Per-event stock ledger is retired — no `issueStock` at checkout. REC remains source evidence for future END USAGE.
4. `CONSUMABLE` lines still record `ledgerSkippedReason` on `SaleItem`.
5. One outer `prisma.$transaction` per checkout.
6. Optional non-inventory Finance (`postSaleVoucher`) may post tender / revenue / VAT; COGS/inventory wait for Cost Calculation.
7. `receiptNo` is business-facing only — not stock linkage.

See [docs/08_POS_CHECKOUT_ARCHITECTURE.md](../docs/08_POS_CHECKOUT_ARCHITECTURE.md) and [docs/architecture/02_PERIOD_STOCK_LEDGER_DECISION.md](../docs/architecture/02_PERIOD_STOCK_LEDGER_DECISION.md).
