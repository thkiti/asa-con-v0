# Finance Presentation Contract

Status: **Active project rule**  
Scope: Posted finance voucher presentation — MJV, OPB, and future PAV / REV / PCV / RCV families.

This document is a **project rule**, not a discussion note. Any change to finance voucher screen, print, or archived PDF layout must comply with this contract.

Related:

- [FINANCE_MJV_PRINT_ARCHITECTURE.md](./FINANCE_MJV_PRINT_ARCHITECTURE.md) — F1A MJV print foundation (implemented)
- [FINANCE_DOCUMENT_IDENTITY_STANDARD.md](./FINANCE_DOCUMENT_IDENTITY_STANDARD.md) — canonical 3-row header identity
- [FINANCE_TRANSACTION_UNIVERSE.md](./FINANCE_TRANSACTION_UNIVERSE.md) — finance document direction
- [32_FINANCE_CORE_16B_MANUAL_JOURNAL.md](./32_FINANCE_CORE_16B_MANUAL_JOURNAL.md) — MJE workflow and posting

---

## 1. Canonical principle

For **posted** finance vouchers:

| Channel | Must share |
|---------|------------|
| Screen presentation | Same presentation model |
| Print Out / Save as PDF | Same presentation model |
| Archived PDF | Same presentation model |

All three channels **must use the same presentation model** and **should converge to the same visual layout**.

Screen and Print Out already share one DOM (`FinanceVoucherPrintSheet`). Archived PDF is allowed to lag visually only under the **temporary bridge policy** (§5) until Finance Presentation Unification (§7).

Pre-POSTED editor UI (draft / submitted / confirmed) is out of scope — it is a workflow surface, not the posted voucher presentation.

---

## 2. Current reality

### Authoritative stack (screen + print)

| Piece | Role |
|-------|------|
| `lib/finance-ui/finance-voucher-print.ts` | Builds `FinanceVoucherPrintModel` from saved entry read DTO |
| `components/finance/FinanceVoucherPrintSheet.tsx` | A4 voucher layout — **current visual authority** |
| `components/finance/FinancePrintActions.tsx` | Print Out / Save as PDF via `window.print()` |
| `app/globals.css` (`.finance-voucher-print-*`) | THSarabunNew, A4 print styles |
| `lib/finance-ui/finance-voucher-print-page-css.ts` | Injected `@page` rules during browser print |

Screen (POSTED) and Print Out / Save as PDF use **the same DOM and model**. No separate print-only React tree.

### Temporary bridge (archived PDF)

| Piece | Role |
|-------|------|
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot.ts` | Frozen POST-time snapshot builder |
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-render.ts` | **PDFKit** legacy archived layout |
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-repair.ts` | Explicit regenerate for stale snapshots |
| `scripts/repair-manual-journal-archived-pdfs.ts` | Dev/admin repair script |
| `app/api/finance/manual-journal-entries/[id]/pdf/route.ts` | GET stored PDF bytes (no re-render on view) |

Archived PDF uses a **separate PDFKit renderer** with a **different visual layout** (monospace table, minimal header). This is **known divergence**.

**PDFKit is allowed only as a temporary bridge**, not the long-term standard. Do not extend PDFKit as the primary design surface for new voucher types.

---

## 3. Non-negotiable rules

1. **Do not create a new finance PDF layout** without reading this contract and [FINANCE_MJV_PRINT_ARCHITECTURE.md](./FINANCE_MJV_PRINT_ARCHITECTURE.md).

2. **Do not duplicate** header, table, footer, or totals logic in a second renderer unless that renderer is explicitly marked as a **temporary bridge** with a documented removal plan.

3. **Same data ordering, grouping, labels, and totals** across screen, print, and archived PDF. Column order, section order, and field labels must match the canonical presentation model.

4. **Print must not compute its own accounting logic.** Totals and line amounts come from saved document data via the presentation model — not from GL, TB, posting engine, or voucher engine at print time.

5. **Archived PDF must not recompute accounting from GL at view time.** View Archived PDF serves stored bytes. Generation uses a **frozen posted presentation snapshot** captured at POST (or explicit repair).

6. **Archived PDF must be generated from a frozen posted presentation snapshot** — not from live recomputation of journal entries, vouchers, or account balances.

7. **Any divergence** between channels (layout, labels, columns, font, pagination) **must be documented** with reason and removal plan in the PR / phase note / this doc’s bridge section.

8. **Do not change accounting** when repairing or regenerating archived PDFs. PDF repair replaces snapshot bytes and `pdfGeneratedAt` only.

---

## 4. Authoritative presentation stack

### Current visual authority

For posted voucher presentation, **`FinanceVoucherPrintSheet`** is the current visual authority.

The view model builder **`buildFinanceVoucherPrintModelFromManualJournalEntry`** (`lib/finance-ui/finance-voucher-print.ts`) is the current data authority for screen and print.

### Long-term target

```
FinanceVoucherPresentationModel   (canonical — name TBD at unification phase)
  → Screen          (FinanceVoucherPrintSheet)
  → Browser Print   (same DOM + print CSS)
  → Archived PDF    (single-source renderer — HTML/print layout or equivalent)
```

Until unification, `ManualJournalEntryPdfSnapshot` may remain the frozen archive input but **must converge** toward the same fields and ordering as `FinanceVoucherPrintModel`.

---

## 5. Temporary bridge policy

PDFKit archived PDF may remain temporarily **only because**:

- It already exists in production paths (POST attach, GET download).
- A repair script is in place (`scripts/repair-manual-journal-archived-pdfs.ts`).
- Server-side archive generation is required at POST time.
- Headless HTML → PDF pipeline is **not implemented yet**.

### When changing voucher layout

Every layout change must do **one** of the following:

| Option | Requirement |
|--------|-------------|
| **A. Update the bridge** | Mirror the change in `manual-journal-entry-pdf-render.ts` (or mark bridge for removal in the same PR). |
| **B. Document divergence** | Explicitly state that archived PDF will remain visually different until **Finance Presentation Unification** (§7), with a ticket/phase reference. |

**Silent drift is not allowed.**

---

## 6. Required checklist — every finance voucher change

Before changing MJV / PAV / REV / PCV / RCV print or PDF code, answer:

| # | Question |
|---|----------|
| 1 | **Which presentation channel is affected?** Screen / Print / Archived PDF |
| 2 | **Does the change affect layout, labels, columns, grouping, totals, or font?** |
| 3 | **Is the change made in the canonical presentation model** (`FinanceVoucherPrintModel` or its future replacement)? |
| 4 | **Is archived PDF still consistent?** If PDFKit bridge exists for this voucher type, was it updated? |
| 5 | **If not consistent, is the divergence documented as temporary** (§5 option B)? |
| 6 | **Are tests updated?** Render test, print sheet test, PDF snapshot test as applicable. |

Copy this checklist into PR descriptions for finance voucher presentation work.

---

## 7. Future phase: Finance Presentation Unification

**Do not implement this phase now.** Recorded here as the planned exit from PDFKit layout duplication.

### Goal

Replace PDFKit archived layout with **HTML / print-layout-based archived PDF generation**, or another **single-source presentation renderer** fed by `FinanceVoucherPresentationModel`.

### Expected outcomes

- One presentation model at POST time.
- One visual layout definition (HTML-first).
- Archived PDF generated server-side from the same layout as screen/print (e.g. dedicated print route + headless capture, or equivalent).
- Retire `manual-journal-entry-pdf-render.ts` PDFKit layout (storage and GET contract may remain).
- Regenerate stale archives via repair script after cutover.

### Out of scope for unification phase

- Accounting engine, posting, voucher engine, GL reports.
- Pre-POSTED editor UI.
- POS / thermal print families.

---

## 8. Reference files

| Path | Purpose |
|------|---------|
| `components/finance/FinanceVoucherPrintSheet.tsx` | Canonical A4 voucher layout (screen + print) |
| `lib/finance-ui/finance-voucher-print.ts` | Print view model builder |
| `components/finance/FinancePrintActions.tsx` | Print Out / Save as PDF |
| `components/finance/FinanceVoucherPrintLinesTable.tsx` | Lines table shared by print sheet |
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-render.ts` | **Temporary bridge** — PDFKit archived layout |
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-repair.ts` | Explicit archived PDF regenerate |
| `lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot.ts` | Frozen POST-time snapshot |
| `scripts/repair-manual-journal-archived-pdfs.ts` | Dev/admin repair script |
| `docs/FINANCE_MJV_PRINT_ARCHITECTURE.md` | F1A print architecture detail |

---

## 9. Enforcement

- Agents and contributors: read this contract before finance voucher print/PDF work.
- Code review: reject PRs that introduce undocumented presentation drift.
- Architecture audits: finance boundary audits should treat dual renderers without bridge documentation as a violation.

---

*Last updated: 2026-06-20 — F1A foundation + PDFKit bridge acknowledged.*
