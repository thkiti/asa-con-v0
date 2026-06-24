# Finance Revenue / Receipt Voucher (REV) Document Design

Status: **Implemented** — aligned with full debit/credit voucher model (same revision as PAV)  
Scope: **REV** (`RevenueVoucher`) — inbound cash / bank receipts with full journal lines  
Related:

- [FINANCE_PAY_DOCUMENT_DESIGN.md](./FINANCE_PAY_DOCUMENT_DESIGN.md) — outbound PAV (mirror pattern)
- [FINANCE_TRANSACTION_UNIVERSE.md](./FINANCE_TRANSACTION_UNIVERSE.md) — document universe (note: implemented REV = receipt voucher, not receivable recognition)
- [32_FINANCE_CORE_16B_MANUAL_JOURNAL.md](./32_FINANCE_CORE_16B_MANUAL_JOURNAL.md) — MJV line-side rules (shared)

**Naming:** Product code **REV**; business term **Receipt Voucher (RV)**. There is no separate `ReceiptVoucher` model — use `RevenueVoucher`.

---

## 1. Purpose

**REV** records **money received** into a bank/cash control account, with full double-entry lines for fees, discounts, and AR clearance — without a separate Manual Journal.

| Attribute | Value |
|-----------|-------|
| Business meaning | Inbound receipt to `receiveToAccountId` with balanced debit/credit lines |
| Document layer | Operational document (`RevenueVoucher`) |
| Ledger layer | `JournalEntry` + lines **only at POST** |
| Level 1 identity | `REV-YYnnnn` (`entryNo`) |

---

## 2. Why full debit/credit lines

Receipts often net against bank:

- Marketplace / central collection fees
- Sales discounts given at payment
- Split debits (bank + fee expense) against AR credit

A credit-only allocation model with auto-generated bank debit cannot express these without MJV follow-up.

### Examples

**Central / marketplace with deducted fee**

```
Dr  Bank (receive-to)           9,700
Dr  Collection Fee Expense        300
Cr  Accounts Receivable         10,000
```

**Customer pays with discount**

```
Dr  Bank (receive-to)           9,500
Dr  Sales Discount / Discount Given   500
Cr  Accounts Receivable         10,000
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
| ≥ 2 valid lines | Skip zero-zero rows on save |
| Line sides | Debit **or** credit, not both; not both zero |
| Balance | Total debit = total credit |
| Receive-to control | When `receiveToAccountId` is set, at least one **debit** line must use that account |
| Period | POST blocked unless `AccountingPeriod.status === OPEN` |
| Immutability | POSTED documents are read-only |

---

## 5. POST behavior

Journal lines are materialized **1:1** from stored voucher lines. No derived balancing debit to `receiveToAccountId`.

Workflow: **SAVE → SUBMIT → CONFIRM → POST** (same as PAV / MJV).

---

## 6. UI

Line table: **Account | Description (memo) | Debit | Credit**  
Footer: total debit, total credit, **Not Balanced** when different.  
Submit / confirm / post disabled when unbalanced.

Header: `receiveToAccountId`, `receivedFromName`, `receiptNo`, `description` — same compact layout as PAV.

---

## 7. Distinction from MJV

| | MJV | REV |
|---|-----|-----|
| Purpose | General journal | Inbound receipt with receive-to header |
| Lines | Full debit/credit | Full debit/credit |
| Header | Generic | `receiveToAccountId`, `receivedFromName` |
| Control rule | None | Debit line required on receive-to account |

This avoids unnecessary Manual Journal entries for collection fees and payment discounts.
