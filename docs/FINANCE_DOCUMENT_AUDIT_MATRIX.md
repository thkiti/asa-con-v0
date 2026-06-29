# Finance Document Audit Matrix

Status: **Living audit control doc** — reflects Finance Document Inquiry as of the REC/REF POS-origin audit work.  
Scope: Read-only audit/navigation layer only. **Not** posting, numbering, accounting, or archive implementation.  
Hub: [Finance Document Inquiry](/finance/vouchers) (`HO_FINANCE` / `HO_ADMIN` via finance menu + voucher API scope).

Related:

- [20_FINANCE_TRACEABILITY.md](./20_FINANCE_TRACEABILITY.md) — voucher read / lineage foundation
- [FINANCE_TRANSACTION_UNIVERSE.md](./FINANCE_TRANSACTION_UNIVERSE.md) — document family taxonomy
- [FINANCE_PRESENTATION_CONTRACT.md](./FINANCE_PRESENTATION_CONTRACT.md) — screen / print / PDF presentation rules
- [architecture/DIGITAL_DOCUMENT_VAULVT_VISION.md](./architecture/DIGITAL_DOCUMENT_VAULVT_VISION.md) — future cross-domain archive registry
- Code note: `lib/finance/inquiry/POS_ORIGIN_AUDIT.md` — REC/REF reprint rules (implementation comments)

---

## Global audit rules (all types)

| Rule | Detail |
|------|--------|
| **Read-only** | Finance Document Inquiry must not create, edit, post, reverse, repair, renumber, or regenerate documents. List + navigation + print preview only. |
| **Legal entity** | All `GET /api/finance/vouchers` queries are scoped to the session `documentEntityCode` (AS / AD). Client cannot widen entity scope. |
| **API access** | Voucher list/detail APIs require `HO_FINANCE` or `HO_ADMIN` (`requirePeriodAdminActor`). Finance **pages** use finance area RBAC; shop receipt/refund pages use shop area (HO roles included). |
| **Posted vs unposted** | **Posted** rows come from `Voucher` (+ `JournalEntry`). **Unposted** rows come from operational tables (MJV/OPB/PAV/REV/PCV) when `postingState` filter includes unposted. REC/REF/COL/PAY appear only as posted vouchers (no pre-post operational workflow in inquiry). |
| **Journal drill-down** | Posted rows with a linked journal show `/finance/journal-entries/{journalEntryId}` from the inquiry table. Voucher detail also shows journal lines read-only. |
| **PDF column semantics** | `Yes` / `Missing` / `—`. Filter `pdfState=has|missing` applies only where archive fields exist (see per-type). Inquiry does not generate PDFs. |
| **HO branch (POS slips)** | Opening REC/REF shop slips from HO audit requires the **sale/refund source branch**, not the HO session branch. Links carry `?branchId=` from the voucher row; pages also resolve branch from `Sale` / `Refund` when the query is omitted. |

---

## Summary matrix

| Code | Source (posted) | Source (unposted) | In inquiry filter | Posted inquiry route | Print route | PDF / archive (inquiry) | Journal drill-down | Audit-safe |
|------|-----------------|-------------------|---------------------|----------------------|-------------|-------------------------|--------------------|------------|
| **OPB** | `Voucher` → `ManualJournalEntry` (OPENING_BALANCE) | `ManualJournalEntry` | Yes | Posted: `/finance/opening-balance/{id}` or voucher detail; Unposted: `/finance/opening-balance/{id}` | `/finance/opening-balance/{id}/print` (posted MJE) | `ManualJournalEntry.pdfPath` — Yes/Missing; PDF API | Yes | Yes |
| **MJV** | `Voucher` → `ManualJournalEntry` (non-OPB types) | `ManualJournalEntry` | Yes | Posted: `/finance/manual-journal-entries/{id}` or voucher detail; Unposted: `/finance/manual-journal-entries/{id}` | `/finance/manual-journal-entries/{id}/print` (posted MJE) | `ManualJournalEntry.pdfPath` — Yes/Missing; PDF API | Yes | Yes |
| **PAV** | `Voucher` → `PaymentVoucher` | `PaymentVoucher` | Yes | Posted: `/finance/payment-vouchers/{id}` or voucher detail; Unposted: `/finance/payment-vouchers/{id}` | — (no inquiry print link) | — (no archive field) | Yes | Yes (read); editor has workflow actions elsewhere |
| **REV** | `Voucher` → `RevenueVoucher` | `RevenueVoucher` | Yes | `/finance/revenue-vouchers/{id}` | — | — | Yes | Yes |
| **PCV** | `Voucher` → `PettyCashVoucher` | `PettyCashVoucher` | Yes | `/finance/petty-cash-vouchers/{id}` | — | — | Yes | Yes |
| **REC** | `Voucher` → `Sale` / `Receipt` | — (POS posts directly) | Yes | `/shop/receipt/{saleId}?branchId={branchId}` | Same + `&autoprint=1` | `Receipt.pdfPath` — **status only**; reprint does **not** regenerate PDF | Yes | Yes |
| **REF** | `Voucher` → `Refund` | — | Yes | `/shop/refund-receipt/{refundId}?branchId={branchId}` | Same + `&autoprint=1` | **—** (no `pdfPath` on `Refund`) | Yes | Yes |
| **COL** | `Voucher` → `CollectorReport` | — | Yes | `/finance/vouchers/{voucherId}` (voucher/journal detail) | — | — | Yes | Yes (voucher layer only) |
| **PAY** | `Voucher` → `PosPayInEvidence` / bank deposit ref | — | Yes | `/finance/vouchers/{voucherId}` | — | — | Yes | Yes (voucher layer only) |
| **INV** | `Voucher` → `InvoiceVoucher` (if posted) | `InvoiceVoucher` (not in unposted inquiry) | **No** (label only) | `/finance/vouchers/{voucherId}` or `/finance/invoice-vouchers/{id}` via editor | — | — | Yes | Partial — not in type filter |
| **STK** | `Voucher` (`STOCK_DOC_POST`) | — | **No** | `/finance/vouchers/{voucherId}` | — | — | Yes | Partial |
| **Stock ops** | `StockDocument` + lines | All workflow statuses | Yes — filter **CNT/ADJ/ORD/DEY/ORS/ORI** | `/finance/stock-documents/{id}` | — (reserved) | — (no archive field) | Yes when posted | Yes (read-only inquiry) |
| **CLS** | `Voucher` (`PERIOD_CLOSING_ENTRY`) | — | **No** | `/finance/vouchers/{voucherId}` | — | — | Yes | Partial |

**Legend:** “Audit-safe” = inquiry path is read-only navigation / print preview. Operational editor routes (PAV/REV/PCV/MJV) are read-only **from inquiry** but the destination pages may expose workflow actions if the user navigates outside inquiry intent.

---

## Per-type detail

### OPB — Opening Balance

| Field | Value |
|-------|--------|
| **Source table / workflow** | `ManualJournalEntry` (`entryType = OPENING_BALANCE`); posted → `Voucher` + `JournalEntry` |
| **Appears in Finance Document Inquiry** | Yes — filter **OPB**; posted vouchers with `OPENING_BALANCE_JOURNAL` refType |
| **Inquiry route (posted)** | `/finance/opening-balance/{manualJournalEntryId}` (via `refId`); fallback `/finance/vouchers/{voucherId}` |
| **Inquiry route (unposted)** | `/finance/opening-balance/{id}` |
| **Print route** | `/finance/opening-balance/{id}/print` |
| **PDF / archive** | `ManualJournalEntry.pdfPath` / `pdfBlobUrl` / `pdfGeneratedAt`. Inquiry PDF column + `GET /api/finance/manual-journal-entries/{id}/pdf`. Immutable snapshot on post — inquiry does not regenerate. |
| **Journal drill-down** | Yes — `JournalEntry` linked from posted voucher |
| **Branch / legal entity** | `legalEntityCode` on MJE/voucher; branch filter supported |
| **Known gaps** | No separate OPB archive registry row (MJV pattern only). Document Trace hub item still “Coming Soon”. |
| **Read-only audit safe** | Yes |

---

### MJV — Manual Journal (family)

| Field | Value |
|-------|--------|
| **Source table / workflow** | `ManualJournalEntry` (`MANUAL`, `ADJUSTMENT`, `RECLASS`, `ACCRUAL`, `AUDITOR_ADJUSTMENT`, reversals); posted → `Voucher` |
| **Appears in Finance Document Inquiry** | Yes — filter **MJV** (excludes OPB refType) |
| **Inquiry route (posted)** | `/finance/manual-journal-entries/{id}`; fallback `/finance/vouchers/{voucherId}` |
| **Inquiry route (unposted)** | `/finance/manual-journal-entries/{id}` |
| **Print route** | `/finance/manual-journal-entries/{id}/print` |
| **PDF / archive** | Same as OPB — `ManualJournalEntry.pdfPath`; inquiry PDF link when `pdfAvailable` |
| **Journal drill-down** | Yes |
| **Branch / legal entity** | Session entity scope; branch filter on list |
| **Known gaps** | Reversal journals share MJV label in inquiry. Rich canonical header on `VoucherDetailView` not mounted on live `/finance/vouchers/[id]` route. |
| **Read-only audit safe** | Yes (from inquiry); MJE editor elsewhere has submit/post actions |

---

### PAV — Payment Voucher

| Field | Value |
|-------|--------|
| **Source table / workflow** | `PaymentVoucher` + lines; posted → `Voucher` |
| **Appears in Finance Document Inquiry** | Yes |
| **Inquiry route** | `/finance/payment-vouchers/{id}` (unposted + posted via `refId`) |
| **Print route** | None from inquiry table |
| **PDF / archive** | No `pdfPath` on `PaymentVoucher` — inquiry PDF column `—` |
| **Journal drill-down** | Yes when posted |
| **Branch / legal entity** | Yes |
| **Known gaps** | No archived PDF; print presentation not wired to inquiry. Future: Document Vault / presentation contract. |
| **Read-only audit safe** | Yes from inquiry |

---

### REV — Revenue Voucher

| Field | Value |
|-------|--------|
| **Source table / workflow** | `RevenueVoucher`; posted → `Voucher` |
| **Appears in Finance Document Inquiry** | Yes |
| **Inquiry route** | `/finance/revenue-vouchers/{id}` |
| **Print route** | None from inquiry |
| **PDF / archive** | None — column `—` |
| **Journal drill-down** | Yes when posted |
| **Branch / legal entity** | Yes |
| **Known gaps** | Same as PAV for archive/print |
| **Read-only audit safe** | Yes from inquiry |

---

### PCV — Petty Cash Voucher

| Field | Value |
|-------|--------|
| **Source table / workflow** | `PettyCashVoucher`; posted → `Voucher` |
| **Appears in Finance Document Inquiry** | Yes |
| **Inquiry route** | `/finance/petty-cash-vouchers/{id}` |
| **Print route** | None from inquiry |
| **PDF / archive** | None — column `—` |
| **Journal drill-down** | Yes when posted |
| **Branch / legal entity** | Yes |
| **Known gaps** | Same as PAV for archive/print |
| **Read-only audit safe** | Yes from inquiry |

---

### REC — POS Receipt

| Field | Value |
|-------|--------|
| **Source table / workflow** | `Sale` + `Receipt` at checkout; finance `postSaleVoucher` → `Voucher` (`POS_SALE`, `refId = saleId`) |
| **Appears in Finance Document Inquiry** | Yes — posted vouchers only |
| **Inquiry route** | `/shop/receipt/{saleId}?branchId={branchId}` |
| **Print route** | `/shop/receipt/{saleId}?branchId={branchId}&autoprint=1` |
| **PDF / archive** | **`Receipt.pdfPath`** (and optional `DocumentArchive` on `Receipt`) used for inquiry PDF column **only**. Status reflects existing stored path. **Reprint via `/shop/receipt` does not write or regenerate PDF.** Archived PDF read: `GET /api/pos/receipts/{receiptId}/pdf` (separate from inquiry table link). |
| **Journal drill-down** | Yes — GL voucher/journal |
| **Branch / legal entity** | Receipt is branch-scoped; HO audit **must** use sale branch (`?branchId=` or server resolve from `Sale.branchId`). Document number enriched from `Receipt.receiptNo` when voucher `refNo` is null. |
| **Known gaps** | No finance-native REC editor; thermal reprint has no COPY watermark (COPY is Receipt Lookup preview only). Document Vault RECEIPT type exists but inquiry does not surface archive API link in table. |
| **Read-only audit safe** | Yes — shop page loads print context read-only; no checkout side effects |

---

### REF — POS Refund

| Field | Value |
|-------|--------|
| **Source table / workflow** | `Refund` at POS refund; `postRefundVoucher` → `Voucher` (`POS_REFUND`, `refId = refundId`, `refNo = refundNo`) |
| **Appears in Finance Document Inquiry** | Yes — posted vouchers only |
| **Inquiry route** | `/shop/refund-receipt/{refundId}?branchId={branchId}` |
| **Print route** | `/shop/refund-receipt/{refundId}?branchId={branchId}&autoprint=1` |
| **PDF / archive** | **`Refund` has no `pdfPath` / archive field today.** Inquiry PDF column intentionally shows **`—`**. Filter `pdfState` excludes REF rows. **Do not implement REF archive in inquiry until schema exists.** |
| **Journal drill-down** | Yes |
| **Branch / legal entity** | Same HO branch resolution as REC |
| **Known gaps** | No refund archive/PDF; no inquiry PDF download. Future: extend `DocumentArchive` or `Refund.pdfPath` per vault vision. |
| **Read-only audit safe** | Yes — thermal reprint only |

---

### COL — Collector Pickup Settlement

| Field | Value |
|-------|--------|
| **Source table / workflow** | `CollectorReport` (COL-{branch}-{YYYYMM}-{seq}); `postCollectorPickupSettlement` → `Voucher` (`POS_SETTLEMENT_COLLECTOR_PICKUP`) |
| **Appears in Finance Document Inquiry** | Yes — filter **COL** |
| **Inquiry route** | `/finance/vouchers/{voucherId}` (no dedicated COL slip route from inquiry) |
| **Print route** | None from inquiry |
| **PDF / archive** | None in inquiry — column `—` |
| **Journal drill-down** | Yes |
| **Branch / legal entity** | Yes |
| **Known gaps** | Operational settlement UI: `/finance/pos-settlement/collector-pickup` — not linked from inquiry row. No COL thermal/PDF archive in inquiry. |
| **Read-only audit safe** | Yes at voucher detail |

---

### PAY — Bank Deposit (POS settlement)

| Field | Value |
|-------|--------|
| **Source table / workflow** | `PosPayInEvidence` / bank deposit posting; `Voucher` (`POS_SETTLEMENT_BANK_DEPOSIT`). Business code **PAY** = bank deposit, not PAV. |
| **Appears in Finance Document Inquiry** | Yes — filter **PAY** |
| **Inquiry route** | `/finance/vouchers/{voucherId}` |
| **Print route** | None from inquiry |
| **PDF / archive** | Pay-in **image evidence** (`PosPayInEvidence.blobPathname`) exists but is **not** surfaced in Finance Document Inquiry |
| **Journal drill-down** | Yes |
| **Branch / legal entity** | Yes |
| **Known gaps** | No inquiry link to settlement UI (`/finance/pos-settlement/bank-deposit`) or pay-in evidence viewer |
| **Read-only audit safe** | Yes at voucher detail |

---

### INV — Invoice Voucher (inquiry visibility only)

| Field | Value |
|-------|--------|
| **Source table / workflow** | `InvoiceVoucher`; posted → `Voucher` (`INVOICE_VOUCHER`) |
| **Appears in Finance Document Inquiry** | **Posted rows only** if vouchers exist — **not** in document-type filter dropdown |
| **Inquiry route** | `/finance/vouchers/{voucherId}`; operational doc `/finance/invoice-vouchers/{id}` |
| **Print route** | None from inquiry |
| **PDF / archive** | None |
| **Journal drill-down** | Yes when posted |
| **Known gaps** | Not in unposted inquiry merge; filter dropdown omission; daily-work editor separate |
| **Read-only audit safe** | Partial |

---

### STK — Stock document post (GL voucher)

| Field | Value |
|-------|--------|
| **Source table / workflow** | Stock document posting → `Voucher` (`STOCK_DOC_POST`) |
| **Appears in Finance Document Inquiry** | Posted rows only; **no filter option** |
| **Inquiry route** | `/finance/vouchers/{voucherId}` |
| **Print route** | None |
| **PDF / archive** | None in finance inquiry |
| **Journal drill-down** | Yes |
| **Known gaps** | No link to stock document operational view from inquiry |
| **Read-only audit safe** | Yes at voucher layer |

---

### CLS — Period closing entry

| Field | Value |
|-------|--------|
| **Source table / workflow** | Period close → `Voucher` (`PERIOD_CLOSING_ENTRY`) |
| **Appears in Finance Document Inquiry** | Posted rows only; **no filter option** |
| **Inquiry route** | `/finance/vouchers/{voucherId}` |
| **Print route** | None |
| **PDF / archive** | None |
| **Journal drill-down** | Yes |
| **Known gaps** | No dedicated close-entry print from inquiry |
| **Read-only audit safe** | Yes at voucher layer |

---

## Explicit control statements

1. **REC PDF** — Finance Document Inquiry reads **`Receipt.pdfPath`** (via sale → receipt join) **only** to populate the PDF status column. It does not create, update, or re-render PDF files.
2. **REC reprint** — `/shop/receipt/{saleId}` with optional `autoprint=1` is a **read-only thermal reprint**. It does **not** regenerate or attach archive PDFs.
3. **REF archive** — There is **no** `Refund.pdfPath` or refund `DocumentArchive` row today. The inquiry PDF column shows **`—`** by design until archive support is added.
4. **HO POS slip branch** — Finance inquiry links include `branchId` from the posted voucher row. Shop pages call `resolveSaleReceiptPrintBranchId` / `resolveRefundReceiptPrintBranchId` so HO users are not pinned to the HO session branch.
5. **Finance Inquiry boundary** — The hub at `/finance/vouchers` and `GET /api/finance/vouchers` are **audit/navigation only**. They must not post, repair, renumber, or regenerate documents.

---

## Completion snapshot (for planning)

| Area | Status |
|------|--------|
| Unified inquiry list (posted + unposted ops) | **Done** |
| OPB / MJV PDF status + print + PDF API | **Done** (MJV family) |
| REC shop slip inquiry + print + PDF status | **Done** (status only; no inquiry PDF URL) |
| REF shop slip inquiry + print | **Done** (no PDF status) |
| PAV / REV / PCV unposted in list | **Done** |
| COL / PAY settlement deep links from inquiry | **Missing** |
| INV / STK / CLS filter + unposted visibility | **Partial** (STK ops inquiry live at `/finance/stock-documents`) |
| REF (and PAV/REV/PCV) archive PDF | **Not started** |
| Document Trace / Attachments audit hub items | **Coming Soon** |
| Digital Document Vault cross-registry | **Vision** — see vault architecture doc |

---

## Code map (implementation reference)

| Concern | Location |
|---------|----------|
| Inquiry list API | `app/api/finance/vouchers/route.ts` → `lib/finance/inquiry/finance-document-inquiry.ts` |
| Document type filters | `lib/finance/inquiry/voucher-document-types.ts` |
| Inquiry / print path builders | `lib/finance/inquiry/finance-document-inquiry-links.ts`, `pos-origin-shop-path.ts` |
| REC receipt enrichment | `lib/finance/inquiry/pos-origin-inquiry-context.ts`, `voucher-list.ts` |
| HO branch resolution | `lib/shop/resolve-pos-origin-print-branch.ts` |
| UI | `components/finance/VoucherInquiryListPage.tsx` |
| Stock inquiry list API | `app/api/finance/stock-documents/route.ts` → `lib/stock/inquiry/stock-document-inquiry.ts` |
| Stock inquiry detail API | `app/api/finance/stock-documents/[id]/route.ts` → `lib/stock/inquiry/stock-document-inquiry-detail.ts` |
| Stock inquiry UI | `components/stock/StockDocumentInquiryListPage.tsx`, `StockDocumentInquiryDetailView.tsx` |
| Menu entry | `lib/main-ui/finance-menu.ts` → Audit hub |
