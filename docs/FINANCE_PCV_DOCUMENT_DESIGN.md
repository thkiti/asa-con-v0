# Finance Petty Cash Voucher (PCV) Document Design

Status: **Implemented** — full debit/credit voucher model (aligned with PAV and REV)  
Scope: **PCV** (`PettyCashVoucher`) — petty cash fund movements with manual-style journal lines  
Related:

- [FINANCE_PAY_DOCUMENT_DESIGN.md](./FINANCE_PAY_DOCUMENT_DESIGN.md) — PAV (bank/cash payment)
- [FINANCE_REV_DOCUMENT_DESIGN.md](./FINANCE_REV_DOCUMENT_DESIGN.md) — REV (receipt voucher)
- [32_FINANCE_CORE_16B_MANUAL_JOURNAL.md](./32_FINANCE_CORE_16B_MANUAL_JOURNAL.md) — shared line-side rules via `journal-line-sides.ts`

---

## 1. Purpose

**PCV** records journal entries against the **petty cash control account** (`pettyCashAccountId`, typically GL `1011`). Staff enter full debit/credit lines — the same accounting-entry model as PAV and REV — rather than debit-only allocations with a system-generated petty-cash credit.

| Attribute | Value |
|-----------|-------|
| Business meaning | Petty cash disbursements, reimbursements, top-ups, and related WHT/fees |
| Document layer | Operational document (`PettyCashVoucher`) |
| Ledger layer | `JournalEntry` + lines **only at POST** |
| Level 1 identity | `PCV-YYnnnn` (`entryNo`) |

---

## 2. Why full debit/credit lines

Accounting staff already work in manual debit/credit style. A separate allocation + derived-credit model for PCV only would hide balancing logic and block common patterns (WHT, top-ups) without Manual Journal follow-up.

### Examples

**Petty cash pays office supplies**

```
Dr  Office Supplies Expense    1,000
Cr  Petty Cash                 1,000
```

**Petty cash pays expense with WHT**

```
Dr  Service Expense           10,000
Cr  WHT Payable                  300
Cr  Petty Cash                 9,700
```

**Petty cash reimbursement / top-up from bank**

```
Dr  Petty Cash                 5,000
Cr  Bank                       5,000
```

---

## 3. Line fields

| Field | Schema | Notes |
|-------|--------|-------|
| `accountId` | `glAccountId` | Required per active line |
| `description` | `memo` | Optional |
| `debitAmount` | `debit` | One non-zero side per line |
| `creditAmount` | `credit` | One non-zero side per line |
| `sortOrder` | `lineNo` | Posting order |

---

## 4. Validation (SUBMIT / POST)

| Rule | Detail |
|------|--------|
| ≥ 2 valid lines | Zero-zero rows skipped on save |
| Line sides | Debit **or** credit, not both; not both zero |
| Balance | Total debit = total credit |
| Petty cash control | When `pettyCashAccountId` is set, at least one line must use that account (debit for top-up, credit for payment) |
| Period | POST blocked unless `AccountingPeriod.status === OPEN` |
| Immutability | POSTED documents are read-only |

Top-up entries (debit petty cash, credit bank) use a **debit** on the petty cash line; disbursements use a **credit**. Both satisfy the control-account line rule.

---

## 5. POST behavior

Journal lines are materialized **1:1** from stored voucher lines. No derived petty-cash credit row.

Workflow: **SAVE → SUBMIT → CONFIRM → POST** (same as PAV / REV / MJV).

---

## 6. UI

- Line table: **Account | Memo | Debit | Credit** (matches PAV/REV).
- Footer totals + **Not Balanced** when debit ≠ credit.
- Submit / confirm / post disabled until balanced with ≥ 2 lines.
- Create mode starts with **2 empty lines**.
- Header: locked petty cash account (`1011`), payee, description.
- Petty cash balance panel shows debit/credit on petty-cash account lines for this voucher.

---

## 7. Consistency across voucher families

| | PAV | REV | PCV |
|---|-----|-----|-----|
| Lines | Full D/C | Full D/C | Full D/C |
| Control header | `payFromAccountId` | `receiveToAccountId` | `pettyCashAccountId` |
| Control line rule | ≥1 credit on pay-from | ≥1 debit on receive-to | ≥1 line on petty cash (Dr or Cr) |
| POST | 1:1 from lines | 1:1 from lines | 1:1 from lines |

This keeps one accounting-entry mental model for staff across payment, receipt, and petty cash vouchers.
