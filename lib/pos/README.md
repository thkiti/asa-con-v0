# POS domain (`lib/pos`)

Retail checkout orchestration — **separate from stock documents**.

## Public API

- `checkout()` — atomic Sale + SaleItem + Payment + Receipt + `issueStock()` for TRACKED lines

## Rules

1. Never import `lib/stock/posting.ts` or touch `StockDocument`.
2. Only `checkout.ts` orchestrates the checkout transaction.
3. `TRACKED` → `issueStock()`; `CONSUMABLE` → explicit `ledgerSkippedReason` on `SaleItem`.
4. One outer `prisma.$transaction` per checkout; ledger joins via `{ tx }`.
5. `receiptNo` is business-facing only — not stock linkage.

See [docs/08_POS_CHECKOUT_ARCHITECTURE.md](../docs/08_POS_CHECKOUT_ARCHITECTURE.md).