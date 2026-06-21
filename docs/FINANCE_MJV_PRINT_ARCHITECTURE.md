# Finance MJV Print Architecture (Phase F1A)

Status: **Implemented (F1A foundation)**  
Scope: Manual Journal Voucher (MJV) print layout, browser print / Save PDF standard, font rule, and inheritance rules for future PAV / REV / Petty Cash vouchers.

**Out of scope for F1A:** schema changes, posting engine, voucher engine, GL/TB/P&L/BS calculations, finance report APIs, PAV / REV / Petty Cash implementation.

Related:

- [FINANCE_DOCUMENT_IDENTITY_STANDARD.md](./FINANCE_DOCUMENT_IDENTITY_STANDARD.md) — canonical 3-row header
- [32_FINANCE_CORE_16B_MANUAL_JOURNAL.md](./32_FINANCE_CORE_16B_MANUAL_JOURNAL.md) — MJE workflow and posting
- [FINANCE_TRANSACTION_UNIVERSE.md](./FINANCE_TRANSACTION_UNIVERSE.md) — finance document direction

---

## 1. Phase objective

Finalize **MJV print** as the standard **finance voucher print foundation** before PAV, REV, and Petty Cash vouchers.

Deliverables:

1. Inventory of existing print code (keep / replace / remove later)
2. Standard finance print rules (font, same-layout, reprint)
3. Shared browser-print voucher layout for posted MJV
4. Architecture doc (this file)

---

## 2. Current print inventory

### 2.1 Finance voucher print (MJV / MJE family)

| Path | Purpose | F1A disposition |
|------|---------|-----------------|
| `components/finance/FinanceVoucherPrintSheet.tsx` | **Standard A4 voucher layout** (header, lines, control, evidence) | **Keep — foundation** |
| `components/finance/FinancePrintActions.tsx` | Print Out + Save as PDF (`window.print`) | **Keep — foundation** |
| `lib/finance-ui/finance-voucher-print.ts` | Map saved `ManualJournalEntryRead` → print view model | **Keep — foundation** |
| `lib/finance/finance-print-font.ts` | THSarabunNew resolution (bundled + dev fallback) | **Keep — foundation** |
| `components/finance/FinanceDocumentCanonicalHeader.tsx` | Canonical 3-row finance document header | **Keep — reuse in print** |
| `lib/finance-ui/finance-document-display.ts` | Header row builders, date formatting | **Keep — reuse** |
| `lib/finance-ui/finance-visual-classes.ts` | Finance table / amount visual tokens | **Keep — reuse** |
| `app/globals.css` (`.finance-voucher-print-*`) | THSarabunNew `@font-face`, A4 print styles | **Keep — extend for PAV/REV** |
| `public/fonts/THSarabunNew.ttf` | Bundled standard finance print font | **Keep — required** |
| `components/finance/ManualJournalEntryEditorPage.tsx` | POSTED view hosts print sheet + actions | **Keep — wire point** |

### 2.2 Server-side MJV PDF snapshot (legacy interim)

| Path | Purpose | F1A disposition |
|------|---------|-----------------|
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-render.ts` | PDFKit A4 render from frozen snapshot | **Keep — replace layout later** |
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf.ts` | Attach / retry stored PDF on POST | **Keep — no logic change** |
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot.ts` | POST-time frozen snapshot builder | **Keep — reprint data source** |
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-header.ts` | PDF header lines | **Keep — align to canonical header later** |
| `lib/finance/manual-journal-entry/pdf-font.ts` | Thin wrapper → `finance-print-font.ts` | **Keep — delegates to THSarabunNew** |
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage*.ts` | Local / blob PDF storage | **Keep** |
| `app/api/finance/manual-journal-entries/[id]/pdf/route.ts` | GET stored PDF bytes | **Keep — archival download** |
| `app/api/finance/manual-journal-entries/[id]/pdf/retry/route.ts` | Retry PDF attach | **Keep** |

**Later remove / replace:** PDFKit monospace table layout when browser-print PDF export is accepted as sole standard, or when PDFKit render is regenerated from the same `FinanceVoucherPrintSheet` HTML snapshot.

### 2.3 Finance audit / report browser print (separate family)

| Path | Purpose | F1A disposition |
|------|---------|-----------------|
| `components/finance/reconciliation-snapshot-ui.tsx` | `PrintAuditButton`, snapshot audit print headers | **Keep — audit reports, not vouchers** |
| `components/finance/period-audit-export-ui.tsx` | Period audit CSV + print body | **Keep** |
| `components/finance/close-evidence-ui.tsx` | Close evidence export + print | **Keep** |
| `components/finance/TrialBalancePage.tsx` | TB report (screen; `print:hidden` nav) | **Keep — report family** |
| `components/finance/ProfitLossPage.tsx` | P&L report | **Keep** |
| `components/finance/BalanceSheetPage.tsx` | BS report | **Keep** |
| `components/finance/GeneralLedgerPage.tsx` | GL drill-down | **Keep** |
| `components/finance/CashFlowPage.tsx` | Cash flow statement | **Keep** |
| `components/finance/ChangesInEquityPage.tsx` | Changes in equity | **Keep** |
| `components/finance/RetainedEarningsPage.tsx` | RE bridge | **Keep** |
| `app/globals.css` (`.print-only`, `.no-print`) | Shared print utilities | **Keep — shared** |

Finance **reports** use screen layout + browser print. They do **not** use THSarabunNew in F1A (voucher print only).

### 2.4 POS / stock / thermal print (unrelated)

| Path | Purpose | F1A disposition |
|------|---------|-----------------|
| `lib/thermal/*`, `lib/pos-ui/*-print*` | 80mm thermal receipts, READ Z, repair ticket | **Keep — do not merge with finance voucher** |
| `components/stock/stock-document-print-ui.tsx` | Stock document browser print | **Keep — stock domain** |
| `lib/catalog-image/crop-pdf.ts` | Catalog image PDF crop | **Keep — operations** |

### 2.5 Legacy font asset

| Path | Purpose | F1A disposition |
|------|---------|-----------------|
| `public/fonts/NotoSansThai-Regular.ttf` | Previous MJV PDFKit font | **Keep temporarily — remove after PDFKit path retired** |

---

## 3. Standard finance print rules

### 3.1 THSarabunNew font rule

| Rule | Detail |
|------|--------|
| Standard font | **THSarabunNew** for finance voucher print and finance voucher PDF only |
| Bundled path | `public/fonts/THSarabunNew.ttf` (committed) |
| Local dev fallback | `C:\ASA-CON\fonts\THSarabunNew.ttf` |
| App UI | **Unchanged** — normal screens keep existing UI fonts |
| Reports | Report browser print may adopt THSarabunNew in a later phase; not required in F1A |
| POS / thermal | Courier / thermal fonts — never THSarabunNew |

Resolution: `lib/finance/finance-print-font.ts`  
Browser: `@font-face` in `app/globals.css` under `.finance-voucher-print-root`

### 3.2 Print Out and Save as PDF — same layout

| Control | Mechanism | Layout source |
|---------|-----------|---------------|
| **Print Out** | `window.print()` | `FinanceVoucherPrintSheet` on screen |
| **Save as PDF** | `window.print()` → browser “Save as PDF” | **Identical** on-screen layout |

Rules:

- No separate print-only React tree with different business logic
- No print-time recalculation of debit/credit — totals come from saved line data via `buildFinanceVoucherPrintModelFromManualJournalEntry`
- `@page` A4 portrait / 12mm margin injected only during finance voucher print (see `FinancePrintActions`)

### 3.3 Reprint rule

| Rule | Detail |
|------|--------|
| Data source | Saved `ManualJournalEntry` (+ lines) from read API |
| POSTED only | Print sheet shown only when `status === POSTED` |
| No re-post | Reprint never triggers posting or PDF regeneration |
| Server PDF | Stored PDFKit file is an **archival snapshot** from POST time; browser reprint uses live read model (same saved accounting lines) |

### 3.4 No parallel print calculation path

Print view model is built from the same read DTO as the POSTED editor. It does not call GL, TB, posting, or voucher engines.

---

## 4. Standard MJV voucher layout

Document type code: **MJV** (Manual Journal Voucher). User-facing title: **MANUAL JOURNAL VOUCHER** per identity standard.

### 4.1 Header

1. **Canonical 3-row finance header** (`FinanceDocumentCanonicalHeader`)
   - Row 1: `{Entity} • {Document Type Title}`
   - Row 2: `{DocumentNo} • Entry Date • Period • Status`
   - Row 3: `Description: …` (omitted when empty)
2. **Meta grid** (print-friendly labels):
   - Document Type (code, e.g. `MJV`, `OPB`)
   - Document No.
   - Document Date
   - Legal Entity
   - Branch
   - Status

### 4.2 Reference / description

| Field | Source |
|-------|--------|
| Reference | `refNo` |
| Being / Description | `description` |
| Remarks | `cancelReason` when present |

### 4.3 Accounting table

| Column | Source | Notes |
|--------|--------|-------|
| Account | `line.accountCode` + `line.accountName` | `Code • Name` in one column |
| Debit | `line.debit` | Right-aligned, adjacent to Account |
| Credit | `line.credit` | Right-aligned |
| Line Description | `line.memo` | Last column; `—` when empty |
| Total Debit | Sum of saved lines | Label in Account column |
| Total Credit | Sum of saved lines | Label in Account column |

### 4.4 Control

| Field | Source (workflow) |
|-------|-------------------|
| Prepared By | `createdByStaffId` |
| Checked By | `confirmedByStaffId` |
| Approved By | `submittedByStaffId` |
| Posted By | `postedByStaffId` |
| Posted At | `postedAt` (formatted) |

Signature lines are blank ruled lines with staff id caption (physical signature on paper).

### 4.5 Evidence / reference

| Field | Source |
|-------|--------|
| Evidence Ref. | `refNo` |
| Attachment Ref. | Not on MJE model yet — shows `—` until attachment field exists |
| Accounting Voucher | `postedVoucherId` (technical); `postedVoucherNo` to be added to read model in later phase |

### 4.6 Print actions (POSTED editor)

- **Print Out** — browser print
- **Save as PDF** — browser print to PDF
- **View / Download PDF** (legacy) — stored PDFKit snapshot; retained until layout parity

---

## 5. Pagination rules

| Section | Rule |
|---------|------|
| Page size | A4 portrait; uniform `12mm` margins (injected `@page`) |
| Pagination engine | **Browser-native** — single `FinanceVoucherPrintSheet` for screen and print; no JS measurement or page plans |
| Header + meta | Canonical 3-row header includes compact `Description:` when present |
| Document No. | Meta grid on page 1 |
| Page numbers | Native `@page @bottom-center`: `Page X of Y` via `buildFinanceVoucherPrintPageCss()` — margin-box counters only |
| Reference / Being block | **Not printed** as a separate section — optional compact context lines when needed |
| Completeness | `END OF VOUCHER` at document end (print-only footer in body) |
| Lines table | `thead` repeats; `tfoot` uses `table-footer-group` (totals after last line chunk) |
| Control + evidence | May flow across pages; signature **fields** use `break-inside: avoid` |
| Print isolation | `body.finance-voucher-print-active` hides `.no-print`, page title, back link; zeros `main` padding — does **not** `display:none` ancestors of the sheet |
| Bottom margin | No extra print margin-bottom on closing blocks (avoids trailing blank page) |
| Font | THSarabunNew via `next/font/local` on print root + `@font-face`; `ensureFinanceVoucherFontsLoaded()` before `window.print()` |

### Browser print flow

| Step | Detail |
|------|--------|
| Screen + print source | One `FinanceVoucherPrintSheet` — same DOM for preview and print |
| Print Out / Save as PDF | `FinancePrintActions` → `body.finance-voucher-print-active` → inject `@page` CSS → load fonts → `window.print()` |
| Not used | JS page plans, content-flow page counters, page identity bands, compact replan |

### Finance Print Page Identity (final)

Page numbers use **native CSS margin-box counters** only — injected at print time via `buildFinanceVoucherPrintPageCss()`:

```css
@page {
  size: A4 portrait;
  margin: 12mm;
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
  }
}
```

Rules:
- Browser pagination is authoritative; counters are informational only.
- No JS pagination, no content-flow `counter(page)` / `counter(pages)`, no page identity bands.
- Reference/Being block is not printed as a separate section (avoids page-1 height waste).
- `END OF VOUCHER` remains a print-only marker at document end.
- Reusable for MJV, PAV, REV, Petty Cash.

### Font verification (F1A.2)

- Bundled: `public/fonts/THSarabunNew.ttf` via `@font-face`.
- Stack: `.finance-voucher-print-font` on root + sheet; audit lines inherit (not mono).
- Dev probe: `FinanceVoucherPrintFontProbe` (development only, `no-print`) + `data-finance-print-font="THSarabunNew"` on sheet for DevTools.

---

## 6. Signature rules

- Three signature blocks: Prepared, Checked, Approved
- Each block: label → ruled line → staff id text
- Posted By / Posted At are typed fields below signature grid (not signature lines)
- Future PAV / REV / Petty Cash may add payer/receiver signature blocks using the same grid pattern

---

## 7. Future inheritance (PAV / REV / Petty Cash)

| Shared asset | Reuse |
|--------------|-------|
| `FinanceVoucherPrintSheet` | Section structure; swap title + extra fields via props |
| `FinancePrintActions` | Unchanged |
| `finance-print-font.ts` / THSarabunNew CSS | Unchanged |
| `finance-voucher-print.ts` | Add mappers per document read type |
| Canonical header | Same 3-row standard per [FINANCE_DOCUMENT_IDENTITY_STANDARD.md](./FINANCE_DOCUMENT_IDENTITY_STANDARD.md) |

Per-voucher differences (future):

| Code | Document Type Title | Extra sections |
|------|-------------------|----------------|
| PAV | PAYMENT VOUCHER | Payee, payment method, bank |
| REV | RECEIPT VOUCHER | Payer, receipt method |
| PCV | PETTY CASH VOUCHER | Petty cash fund, expense category |

Do **not** fork print CSS per voucher; extend `FinanceVoucherPrintSheet` props and print model only.

---

## 8. Implementation map (F1A)

```
ManualJournalEntryEditorPage (POSTED)
  └─ FinancePrintActions
  └─ FinanceVoucherPrintSheet
        └─ FinanceDocumentCanonicalHeader
        └─ buildFinanceVoucherPrintModelFromManualJournalEntry(entry)
```

Server PDF (unchanged flow, font updated):

```
post → buildManualJournalEntryPdfSnapshot → renderManualJournalEntryPdf (PDFKit + THSarabunNew)
```

---

## 9. Files touched in F1A

| File | Change |
|------|--------|
| `docs/FINANCE_MJV_PRINT_ARCHITECTURE.md` | New — this document |
| `public/fonts/THSarabunNew.ttf` | Added bundled font |
| `public/fonts/README.md` | Font documentation |
| `lib/finance/finance-print-font.ts` | New — shared font resolver |
| `lib/finance/manual-journal-entry/pdf-font.ts` | Delegate to THSarabunNew |
| `lib/finance-ui/finance-voucher-print.ts` | New — print view model |
| `components/finance/FinanceVoucherPrintSheet.tsx` | New — shared layout |
| `components/finance/FinancePrintActions.tsx` | New — print controls |
| `components/finance/ManualJournalEntryEditorPage.tsx` | POSTED print integration |
| `app/globals.css` | Finance voucher print styles |

**Not modified:** `schema.prisma`, posting engine, voucher engine, GL/TB/P&L/BS, finance report APIs.

---

## 10. Validation

Targeted tests:

- `__tests__/lib/finance-ui/finance-voucher-print.test.ts`
- `__tests__/components/finance/finance-voucher-print-sheet.test.tsx`
- `__tests__/lib/finance/manual-journal-entry/pdf-font.test.ts` (THSarabunNew)
- `__tests__/components/finance/manual-journal-entry-pages.test.tsx` (print actions on POSTED)

Run: `npm test -- --testPathPattern="finance-voucher-print|pdf-font|manual-journal-entry-pages"`  
Build: `npm run build`
