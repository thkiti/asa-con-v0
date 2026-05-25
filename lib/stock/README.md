# Stock domain (`lib/stock`)

Centralized inventory ledger — the **only** code path that may mutate `Stock`, `StockLayer`, and `StockTransaction`.

## Public API

| Function | Direction | `qty` |
|----------|-----------|-------|
| `receiveStock()` | Inbound only | `> 0` |
| `issueStock()` | Outbound only | `> 0` magnitude |

Both accept optional `tx` to join an outer Prisma transaction. When omitted, `ledger.ts` opens exactly one `prisma.$transaction`.

## Modules

- `ledger.ts` — public entry; transaction wrapper
- `receive-stock.ts` — inbound lines (layers + moving avg)
- `issue-stock.ts` — outbound lines (FIFO consume)
- `layers.ts` — FIFO layer create/consume (tx-only)
- `transaction-types.ts` — input/output types
- `stock-errors.ts` — domain errors

## Rules

1. Never route inbound through `issueStock()`.
2. No signed qty convention.
3. Inner modules must not call `prisma.$transaction`.
4. No imports from `app/` or `components/`.