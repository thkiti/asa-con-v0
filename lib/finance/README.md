# lib/finance

Finance posting kernel (Phase 7+) and accounting period lifecycle (Phase 15).

## Contract

- **Same-transaction strict:** callers own the outer Prisma transaction; pass `{ tx }` into posting entry points.
- **One voucher → one journal:** each posted `Voucher` maps to exactly one `JournalEntry`.
- **No nested transactions:** this module does not call `$transaction`.
- **Derived domain only:** no stock or sale mutations; account mapping lives in `account-map.ts`.
- **Idempotency:** `(refType, refId)` on `Voucher`; period bootstrap is idempotent on `(branchId, periodKey)`.
- **Posting gate:** `assertPostingPeriodOpen` — only `OPEN` periods accept vouchers; no auto-bootstrap in posting.

## Period modules (Phase 15)

| Module | Purpose |
|--------|---------|
| `period-setup.ts` | `bootstrapPeriodIfMissing` — admin create only |
| `period-close.ts` | `closeAccountingPeriod`, `reopenAccountingPeriod` |
| `posting-period.ts` | `assertPostingPeriodOpen` — posting enforcement |
| `period-list.ts` | Read-only list for API/UI |

Auth for period admin lives in `lib/auth/period-admin.ts`, not here.

## Public API

See `index.ts` — `postOperationalVoucher`, `postSaleVoucher`, `postStockDocumentVoucher`, `bootstrapPeriodIfMissing`, `closeAccountingPeriod`, `reopenAccountingPeriod`, `assertPostingPeriodOpen`.

Architecture: [docs/15_FINANCE_PERIODS.md](../../docs/15_FINANCE_PERIODS.md).
