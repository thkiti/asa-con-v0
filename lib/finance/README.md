# lib/finance

Finance posting kernel (Phase 7): double-entry vouchers and journal entries derived from operational events.

## Contract

- **Same-transaction strict:** callers own the outer Prisma transaction; pass `{ tx }` into posting entry points.
- **One voucher → one journal:** each posted `Voucher` maps to exactly one `JournalEntry`.
- **No nested transactions:** this module does not call `$transaction`.
- **Derived domain only:** no stock or sale mutations; account mapping lives in `account-map.ts`.
- **Idempotency:** `(refType, refId)` on `Voucher`.
- **Deferred:** period reconciliation, soft/hard close workflows, and voucher-number allocation hardening are out of scope here.

## Public API

See `index.ts` — `postOperationalVoucher`, `postSaleVoucher`, `postStockDocumentVoucher`, `bootstrapPeriodIfMissing`, `ensureOpenPeriod`.
