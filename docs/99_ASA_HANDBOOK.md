# ASA Handbook

เอกสารนี้ไม่ใช่คู่มือเทคนิค

เอกสารนี้บันทึกการตัดสินใจเชิงสถาปัตยกรรม ความเป็นจริงทางธุรกิจ สมมติฐานการปฏิบัติงาน และข้อยกเว้นที่อธิบายว่า **ทำไม** asa-con-v0 จึงถูกออกแบบในลักษณะนี้

สำหรับรายละเอียดการ implement ให้อ่านเอกสารที่มีหมายเลขในโฟลเดอร์นี้ (เช่น finance posting, reconciliation, POS checkout) สำหรับหลักฐานการทดสอบ P1 ดู [P1_POSTING_STOCK_VALIDATION.md](./P1_POSTING_STOCK_VALIDATION.md) และ [P1C_REFUND_E2E_VALIDATION.md](./P1C_REFUND_E2E_VALIDATION.md)

---

# Architecture Decision 001

**ชื่อ:** Refund = คืนเงินอย่างเดียว

## สรุป

ใน asa-con-v0 การ **Refund** หมายถึงการคืนเงินให้ลูกค้าเท่านั้น ไม่ได้หมายความว่าสินค้าจะกลับเข้าสต๊อกโดยอัตโนมัติ

ระบบมอง Refund เป็นเหตุการณ์ทางการเงิน ไม่ใช่การรับสินค้ากลับเข้าคลัง

## เหตุผลทางธุรกิจ

ในงานจริง ลูกค้านำสินค้ามาคืนเพราะสินค้ามีปัญหา ชำรุด หรือไม่เหมาะสำหรับนำไปขายต่อ

การคืนเงินให้ลูกค้าจึงเป็นการชดเชยทางการเงิน ไม่ใช่การยืนยันว่าสินค้านั้นพร้อมกลับเข้าสต๊อกเพื่อขายได้

ดังนั้นระบบไม่ถือว่าการ Refund เป็นการรับสินค้ากลับเข้าคลัง

หากสินค้าที่รับกลับมามีมูลค่าหรือสภาพที่ต้องบันทึกในสต๊อก ให้จัดการผ่าน **Stock Adjustment** แยกต่างหาก

## สิ่งที่ระบบทำ

- สร้าง **Refund Record**
- สร้าง **POS_REFUND Voucher**
- เข้าร่วม **Reconciliation**
- เข้าร่วม **Traceability**
- ตรวจสอบ **Accounting Period** (งวดบัญชีต้องเปิดอยู่จึงจะ post ได้)

## สิ่งที่ระบบตั้งใจไม่ทำ

- ไม่สร้าง **StockTransaction**
- ไม่เรียก `receiveStock()`
- ไม่เพิ่ม **Inventory**
- ไม่ย้อน **Inventory**
- ไม่ย้อน **COGS**

## หลักคิดสำคัญ

**Refund** = ความจริงทางการเงิน

**Adjustment** = ความจริงของสต๊อก

ระบบตั้งใจแยกความจริงทางการเงินออกจากความจริงของสต๊อก

เหตุการณ์ทั้งสองอาจเกิดพร้อมกันได้ในชีวิตจริง แต่ไม่จำเป็นต้องเชื่อมกันในระบบ

## บันทึกทางประวัติศาสตร์

การตัดสินใจนี้ได้รับการยืนยันและทดสอบใน Phase P1

ครอบคลุม:

- Sale checkout → stock → finance → reconciliation
- Refund Finance (money-only)
- Refund Reconciliation
- Refund Traceability
- End-to-End Validation

## Tag References

- `p1a-refund-finance`
- `p1b-refund-reconcile-trace`
- `p1c-refund-e2e-validated`
- `p1-complete`

---

# Finance Vocabulary

Authoritative source for finance operational document codes and numbering conventions in asa-con-v0.

Phase implementation docs (e.g. Finance Core 17A) **reference this section** — they do not redefine codes or numbering rules.

Related: [11_FINANCE_POSTING_ARCHITECTURE.md](./11_FINANCE_POSTING_ARCHITECTURE.md), [32_FINANCE_CORE_16B_MANUAL_JOURNAL.md](./32_FINANCE_CORE_16B_MANUAL_JOURNAL.md)

---

## Document numbering format

All finance operational document numbers use:

```
<CODE>-<YY><NNNN>
```

| Part | Meaning |
|------|---------|
| `CODE` | Three uppercase letters — registered finance document code (see below) |
| `YY` | Two-digit calendar year derived from the document **entry date** |
| `NNNN` | Four-digit sequence, zero-padded, scoped per `CODE` + `YY` |

**Examples:**

| Document number | Meaning |
|-----------------|---------|
| `MAJ-260001` | Manual Journal — first in calendar year 2026 |
| `OPB-260001` | Opening Balance — first in 2026 |
| `ADJ-260001` | Adjustment Journal — first in 2026 |
| `REJ-260001` | Reclass Journal — first in 2026 |
| `ACJ-260001` | Accrual Journal — first in 2026 |
| `AUJ-260001` | Auditor Adjustment Journal — first in 2026 |

Sequence resets per `CODE` + `YY` (not per accounting period month).

---

## Legal entity and document numbers

Legal entity codes (**ASAS**, **ASAD**, etc.) are **not** part of document numbers.

| Correct | Incorrect |
|---------|-----------|
| `MAJ-260001` | `ASAS-MAJ-260001` |
| `OPB-260001` | `ASAD-OPB-260001` |

Legal entity is a **separate field** on the document header and in system context (branch, session, `legalEntityCode`). Document numbers are entity-neutral at the string level; entity scope is enforced by data model and posting rules, not by prefixing the number.

---

## Three-letter finance document codes

### Active codes (Manual Journal Entry family — Phase 17A+)

| Code | Name | `ManualJournalEntryType` |
|------|------|--------------------------|
| **MAJ** | Manual Journal | `MANUAL` |
| **OPB** | Opening Balance | `OPENING_BALANCE` |
| **ADJ** | Adjustment Journal | `ADJUSTMENT` |
| **REJ** | Reclass Journal | `RECLASS` |
| **ACJ** | Accrual Journal | `ACCRUAL` |
| **AUJ** | Auditor Adjustment Journal | `AUDITOR_ADJUSTMENT` |

Each type maps to exactly one document code. The allocator chooses `CODE` from `entryType` when assigning `entryNo`.

### Reserved codes (not yet implemented)

| Code | Reserved for |
|------|----------------|
| **ARJ** | Accounts Receivable Journal |
| **APJ** | Accounts Payable Journal |

Reserved codes must not be used until registered here and given an implementation phase.

---

## Opening Balance rule

Opening balance is **not** a separate document model.

- Use `ManualJournalEntry` with `entryType = OPENING_BALANCE`
- Use `ManualJournalEntryLine` for lines
- Assign document numbers with code **OPB** (e.g. `OPB-260001`)

**Do not create:**

- `OpeningBalance`
- `OpeningBalanceLine`

Bulk opening journal import (e.g. M1 migration) posts through the same operational document path; see [migration/M1_OPENING_JOURNAL_SPEC.md](./migration/M1_OPENING_JOURNAL_SPEC.md).

---

## Reporting boundary

Operational documents (e.g. `ManualJournalEntry`) are workflow and trace layers. Financial reports read **posted GL only**:

```
ManualJournalEntry  →  Voucher  →  JournalEntry  →  Reports (JournalEntryLine)
```

Reports must not query `ManualJournalEntry` directly.

---

## Future codes

Primary finance direction (business document families, Finance Core status): [FINANCE_TRANSACTION_UNIVERSE.md](./FINANCE_TRANSACTION_UNIVERSE.md). Pending code decisions (PAY/PV, REV/RV, ACC/ACJ, etc.): [Appendix D — Vocabulary Decisions Pending](./FINANCE_TRANSACTION_UNIVERSE.md#appendix-d--vocabulary-decisions-pending).

All new finance operational document codes must:

1. Use **exactly three uppercase letters**
2. Be **registered in this section** before any schema, API, or UI implementation
3. Include a short name and intended scope

Ad-hoc or inline codes in application code are not permitted.

---

## Code immutability

Once a document code is **released** (registered in this handbook and used in production or migration):

- It **must not be renamed**
- It **must not be reused** for a different document type or meaning

If a document family is retired, the code remains listed as historical; a new meaning requires a **new** three-letter code.
