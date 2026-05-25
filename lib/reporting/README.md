# Reporting (Phase 6)

Read-only reporting kernel: stock valuation (average cost and FIFO), movement ledger extracts, POS sales aggregates, and daily branch composites.

- **lib/reporting/** — shared DTOs, date normalization, composite merge helpers
- **lib/stock/** — inventory reads (`getStockSummary`, `getFifoValuation`, `getMovementReport`)
- **lib/pos/sales-summary.ts** — completed sale revenue only (never inventory qty)

All reporting functions accept a Prisma read client and perform `findMany` only.
