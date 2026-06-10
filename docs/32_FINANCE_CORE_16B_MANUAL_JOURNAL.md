# Finance Core 16B — Manual Journal & Reversal

Status: Implemented  
Scope: GL-only manual journal posting and journal reversal

## Architecture

All GL writes flow through `lib/finance/posting.ts`:

- `postManualJournalVoucher()` — balanced manual journals
- `postJournalReversal()` — reversal of a posted journal

API routes call posting functions only. No direct `JournalEntry.create` from routes or UI.

Manual journals use the standard voucher path:

**Manual Journal → MANUAL Voucher → JournalEntry → JournalEntryLine**

Reversal lineage is stored on `JournalEntry.reversalOfJournalEntryId` (unique — one reversal per original).

Ref types:

| refType | Purpose |
|---------|---------|
| `MANUAL_JOURNAL` | Original manual posting |
| `MANUAL_JOURNAL_REVERSAL` | Reversal posting |

## Posting flow (manual journal)

1. `assertPostingPeriodOpen` for branch + date
2. Resolve account codes → validate exists, active, not deleted
3. `assertNonZeroLines` + balanced debit/credit
4. Allocate voucher number, create voucher + voucher lines
5. Create journal entry + journal lines
6. Idempotency via `(refType, refId)` where `refId` = client `idempotencyKey`

## Reversal flow

1. Load original journal with lines
2. Reject if not found, already reversed, or journal is itself a reversal
3. Require non-empty reversal reason
4. `assertPostingPeriodOpen` for reversal date
5. Create reversal voucher with swapped debit/credit lines
6. Create reversal journal with `reversalOfJournalEntryId` pointing to original
7. Original journal remains immutable

## Lineage model

```
Original Journal (MANUAL_JOURNAL)
        ↓
Reversal Journal (MANUAL_JOURNAL_REVERSAL)
  reversalOfJournalEntryId → original.id
```

Inquiry displays:

- Original voucher no
- Reversal voucher no (if exists)
- `reverses` / `reversedBy` navigation links

## Validation rules

| Code | When |
|------|------|
| `PERIOD_CLOSED` | Accounting period not OPEN |
| `UNBALANCED_JOURNAL` | Debits ≠ credits |
| `ACCOUNT_NOT_FOUND` | Unknown or deleted GL code |
| `ACCOUNT_INACTIVE` | Inactive GL account |
| `JOURNAL_NOT_FOUND` | Reversal target missing |
| `JOURNAL_ALREADY_REVERSED` | Original already has reversal |
| `REVERSAL_NOT_ALLOWED` | Attempt to reverse a reversal |

Posting requires `HO_FINANCE` or `HO_ADMIN` (period admin actor).

## Routes

| Route | Purpose |
|-------|---------|
| `/finance/journal-entries` | List manual journals |
| `/finance/journal-entries/new` | Post new manual journal |
| `/finance/journal-entries/[id]` | Journal inquiry + reversal |
| `GET /api/finance/journal-entries` | List API |
| `POST /api/finance/journal-entries` | Post manual journal |
| `GET /api/finance/journal-entries/[id]` | Inquiry API |
| `POST /api/finance/journal-entries/[id]/reverse` | Post reversal |

## Limitations (out of scope)

- No draft / save-as-draft workflow
- No edit or delete after post
- No recurring journals or templates
- No multi-currency
- No approval workflow
- No bulk import

## Reconciliation boundary

**Manual Journal is GL-only.**  
Manual journals do **not** participate in operational reconciliation (POS, stock, refund). Reconciliation modules remain read-only with no write-path changes.

## Operational posting

POS, stock, refund, and finance close posting paths are unchanged. All continue to use `postOperationalVoucher` and existing ref types.
