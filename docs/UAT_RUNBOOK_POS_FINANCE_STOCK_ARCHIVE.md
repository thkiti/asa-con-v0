# ASA-CON UAT Runbook — POS / Finance / Stock / Document Archive

Status: **User Acceptance Testing (UAT)**  
Scope: End-to-end validation of POS, Finance, Stock, and Document Archive Vault (Phases 0–6)  
Type: **Test execution guide only** — no schema or production code changes in this document

Related:

- [DOCUMENT_ARCHIVE_IMPLEMENTATION_PLAN.md](./DOCUMENT_ARCHIVE_IMPLEMENTATION_PLAN.md) — vault rollout Phases 0–6
- [FINANCE_DOCUMENT_ARCHIVE_VAULT_DESIGN.md](./FINANCE_DOCUMENT_ARCHIVE_VAULT_DESIGN.md) — archive semantics
- [FINANCE_DOCUMENT_AUDIT_MATRIX.md](./FINANCE_DOCUMENT_AUDIT_MATRIX.md) — inquiry routes by document type
- [40_POS_TWO_STAGE_PAYMENT_SETTLEMENT.md](./40_POS_TWO_STAGE_PAYMENT_SETTLEMENT.md) — COL / pay-in workflow
- [uat/FINANCE_UAT_RESET.md](./uat/FINANCE_UAT_RESET.md) — environment reset (if a clean finance baseline is needed)

---

## 1. Purpose

Validate that implemented business flows work correctly for real users before go-live or parallel run. This runbook covers:

- POS sale and refund
- READ X / READ Z
- Stock documents and finance stock inquiry
- Finance vouchers (PAV / REV / PCV) with manual PDF archive
- MJV / OPB legacy archive bridge
- COL pay-in evidence and POST PAY-IN gating
- Financial reports and period lock behavior

**Out of scope for this UAT:** new feature development, schema changes, and unrelated automated test fixture failures (see §8).

---

## 2. Test environment

| Item | Requirement |
|------|-------------|
| **Build** | Latest UAT/staging build with Document Archive Vault Phases 0–6 deployed |
| **Legal entity** | **AS** (or ASAS session) for POS settlement and COL pay-in flows |
| **Branch** | At least one active **shop (`SH`) branch** with POS enabled |
| **Master data** | Staff accounts for each role (§3); products with barcodes; CoA and open accounting period |
| **Thermal printer** | Connected for POS receipt / READ Z print (or use browser print preview if printer unavailable — note in defect) |
| **Sample files** | One valid PDF, one JPEG/PNG for archive upload tests; one invalid file (e.g. `.txt`) for negative test |

Optional: run [FINANCE_UAT_RESET.md](./uat/FINANCE_UAT_RESET.md) backup/reset only if stakeholders agree on a clean finance baseline. **Do not reset during active UAT without backup.**

---

## 3. Roles to test

| Role | Primary areas | Use in this runbook |
|------|---------------|---------------------|
| **SH_STAFF** | `/shop` (POS terminal), shop stock documents, receipt lookup | Scenarios 1–3, shop-side stock create (Scenario 4) |
| **HO_FINANCE** | `/finance/*`, finance inquiry, collector pickup settlement, reports | Scenarios 4–8 |
| **HO_ADMIN** | Same as HO_FINANCE + master/system/admin | Spot-check access parity on finance routes; period reopen if needed for Scenario 8 |

**Login notes:**

- SH_STAFF must log in to an active **shop branch** (not HO branch).
- Collector pickup settlement and POST PAY-IN require **AS / ASAS** document entity session.
- Finance Document Inquiry requires **HO_FINANCE** or **HO_ADMIN**.

---

## 4. Browsers and devices

| Context | Device / browser | Notes |
|---------|------------------|-------|
| **Desktop POS** | Shop PC — Chrome or Edge, full screen | Primary path for Scenarios 1–3 |
| **HO browser** | Finance laptop — Chrome or Edge | Scenarios 4–8 |
| **Tablet (optional)** | iPad / Android tablet | Smoke-test login and read-only inquiry only; not required for sign-off |

Record actual browser + version in each scenario’s Notes field.

---

## 5. Archive / PDF indicator legend

Use this when verifying dots in inquiry hubs and detail screens.

| Indicator | `pdfAvailable` / `archiveAvailable` | Meaning |
|-----------|--------------------------------------|---------|
| **Green / downloadable** | `true` | Active archived file exists and is readable |
| **Red dot** | `false` | Archive **required** for this document state but missing |
| **Hidden / neutral (`—`)** | `null` | Archive not applicable yet (e.g. unposted MJV) or not required |

**COL-specific:** Finance Document Inquiry uses **`archiveAvailable`** (not `pdfAvailable`) for bank pay-in slip evidence on COL rows.

**Manual archive types (Phase 5):** PAV, REV, PCV, Stock — user prints/saves PDF from browser, then **Upload PDF** on document detail. Inquiry dot should move **red → green** after successful upload.

**COL pay-in (Phase 6):** `BANK_PAY_IN_SLIP` — PDF, JPEG, or PNG; one slip may link to **multiple COL tickets**.

---

## 6. Defect severity levels

| Level | Definition | Example |
|-------|------------|---------|
| **S1 — Blocker** | Cannot complete core UAT scenario; data integrity or posting risk | POST PAY-IN succeeds without evidence; wrong GL amount posted |
| **S2 — Major** | Workaround exists but business rule violated or wrong audit state | Inquiry shows green dot but download fails; POST button enabled without evidence |
| **S3 — Minor** | Cosmetic, unclear label, non-blocking UX | Tooltip wording; layout misalignment on dark theme |
| **S4 — Trivial** | Typos, nice-to-have | Hint text only |

**Defect log fields:** ID, scenario #, severity, steps to reproduce, expected vs actual, screenshot/path, tester, date.

---

## 7. Rollback / stop criteria

**Stop UAT and escalate immediately if:**

- Any **S1** defect is found in posting, GL, stock ledger, or pay-in evidence gating
- Archive upload writes to wrong document or wrong legal entity
- Period close / reopen controls behave incorrectly (Scenario 8)
- Data corruption suspected (duplicate vouchers, wrong branch attribution)

**Rollback actions (coordination with engineering / DBA):**

1. Stop further posting and document creation on affected branch/entity.
2. Restore from latest UAT backup ([FINANCE_UAT_RESET.md](./uat/FINANCE_UAT_RESET.md) backup folder or environment snapshot).
3. Re-run smoke scenarios 1, 6, and 8 after restore before resuming full UAT.

**Do not** run destructive reset scripts during UAT without explicit stakeholder approval and backup.

---

## 8. Known exclusions

| Item | Status |
|------|--------|
| **manual-journal-posting standalone test fixture** (`GL account not found for code 1100`) | **Separate engineering issue** — not part of UAT unless fixed before test week. Manual MJV UAT in Scenario 5/6 should use real CoA accounts in the app, not the broken fixture. |
| **Document Trace / Attachments** finance menu items | Coming Soon — not in this runbook |
| **Automated server PDF generation** for PAV/REV/PCV/Stock | Phase B — UAT uses **manual print → upload** only |
| **INV / CLS** deep workflow | Out of scope unless explicitly added to test plan |

---

## 9. How to record results

For each scenario subsection:

1. Execute steps in order.
2. Mark **Pass** or **Fail**.
3. If Fail, log defect ID and severity in **Notes / defects**.
4. Attach screenshot or document number (REC no, COL no, voucher no) for traceability.

**Tester:** _______________  
**Date:** _______________  
**Environment / build:** _______________  
**Branch tested:** _______________

---

## Scenario 1 — POS sale flow

**Route:** `/shop` (POS terminal)  
**Roles:** SH_STAFF (primary); HO_FINANCE for inquiry check

### 1.1 Cash sale — checkout and receipt

| Field | Detail |
|-------|--------|
| **Preconditions** | SH_STAFF logged into shop branch; open READ day; products available; cash drawer open |
| **Steps** | 1. Log in as SH_STAFF → `/shop`. 2. Scan or add at least one item. 3. Checkout with **CASH** tender for full amount. 4. Complete sale. 5. **Print receipt** (thermal or browser print). 6. Note receipt number (**REC-…**). |
| **Expected result** | Sale completes without error. Receipt prints with correct items, amounts, payment method, receipt number. No error banners. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | REC no: _______________ |

### 1.2 Card sale

| Field | Detail |
|-------|--------|
| **Preconditions** | Same as 1.1 |
| **Steps** | Repeat 1.1 using **CARD** (or configured card tender) instead of CASH. |
| **Expected result** | Sale posts; receipt shows card payment bucket; totals correct. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | REC no: _______________ |

### 1.3 QR sale

| Field | Detail |
|-------|--------|
| **Preconditions** | QR / transfer tender enabled for branch |
| **Steps** | Repeat 1.1 using **QR** (or bank transfer) tender. |
| **Expected result** | Sale completes; receipt shows QR/transfer payment; totals correct. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | REC no: _______________ |

### 1.4 REC lookup and archive status

| Field | Detail |
|-------|--------|
| **Preconditions** | At least one posted REC from 1.1–1.3 |
| **Steps** | 1. As SH_STAFF or HO_FINANCE, open **Receipt Lookup** `/shop/receipt-lookup`. 2. Search by receipt number and date. 3. Open receipt preview. 4. As HO_FINANCE, open **Finance Document Inquiry** `/finance/vouchers`, filter **REC**, find same receipt. 5. Observe PDF/archive indicator. |
| **Expected result** | Receipt found in lookup. Preview shows **COPY watermark** on lookup preview (audit copy — expected). Direct receipt page `/shop/receipt/{saleId}` and printed receipt **do not** show COPY watermark. Finance inquiry shows REC row; `pdfAvailable` is `true` if archived PDF exists, `false` if required but missing, or neutral if not applicable — per current REC archive state. Download works when green/available. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

---

## Scenario 2 — POS refund flow

**Route:** `/shop` (refund), `/shop/receipt-lookup`, `/finance/vouchers`  
**Roles:** SH_STAFF, HO_FINANCE

### 2.1 Create refund from receipt

| Field | Detail |
|-------|--------|
| **Preconditions** | Posted REC from Scenario 1 available; refund policy allows refund |
| **Steps** | 1. From POS, open refund flow (find original receipt). 2. Select line(s) or amount per workflow. 3. Create **REF**. 4. **Print refund slip**. 5. Note refund number (**REF-…**). |
| **Expected result** | REF created and posted (or completes per workflow). Refund slip prints with correct reference to original REC, amounts, and payment reversal buckets. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | REF no: _______________ |

### 2.2 REF lookup and archive status

| Field | Detail |
|-------|--------|
| **Preconditions** | REF from 2.1 exists |
| **Steps** | 1. Search REF in `/shop/receipt-lookup`. 2. Open preview (note COPY watermark on lookup preview). 3. In Finance Document Inquiry, filter **REF**, locate row. 4. Open `/shop/refund-receipt/{refundId}?branchId=…` if linked. 5. Check PDF indicator. |
| **Expected result** | REF discoverable in lookup and finance inquiry. Reprint from shop page works. `pdfAvailable` follows REF archive rules (`null` or `false`/`true` per implementation — red dot only when `false`). No COPY watermark on direct refund receipt print page. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

---

## Scenario 3 — READ X / READ Z

**Route:** `/shop` — POS READ panels  
**Roles:** SH_STAFF

### 3.1 READ X (intraday)

| Field | Detail |
|-------|--------|
| **Preconditions** | Same shop day as Scenario 1 sales; SH_STAFF on POS |
| **Steps** | 1. Open **READ X** for today. 2. Review sales totals and payment buckets (CASH / CARD / QR / etc.). 3. Print or preview report. |
| **Expected result** | READ X loads without error. Totals match sum of today’s sales (within expected rounding). Payment buckets align with tenders used in Scenario 1. **No COPY watermark** on READ X print/preview. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

### 3.2 READ Z (end of day)

| Field | Detail |
|-------|--------|
| **Preconditions** | End of business day; no blocking POS errors |
| **Steps** | 1. Run **READ Z** for today. 2. Review cumulative totals and payment buckets. 3. Click **PRINT REPORT AND EXIT** (or equivalent thermal print + exit). 4. Confirm report closes/exits per workflow. |
| **Expected result** | READ Z totals match expected day sales + refunds. Payment buckets correct. Printed READ Z has **no COPY watermark**. Report exits cleanly after print. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

### 3.3 READ Z lookup (optional)

| Field | Detail |
|-------|--------|
| **Preconditions** | Prior READ Z day exists |
| **Steps** | 1. Open READ Z lookup/history. 2. Select a prior date. 3. Preview and print. |
| **Expected result** | Historical READ Z loads; print works; no COPY watermark. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

---

## Scenario 4 — Stock documents

**Routes:** `/shop/stock-documents`, `/finance/stock-documents`  
**Roles:** SH_STAFF (create/edit); HO_FINANCE (inquiry + archive)

### 4.1 Create and post stock document (shop)

| Field | Detail |
|-------|--------|
| **Preconditions** | SH_STAFF logged in; document types enabled: **CNT**, **ORD**, **DEY**, **ORI** (and **ORS** if used) per branch workflow |
| **Steps** | For each available type (at minimum one of CNT / ORD / DEY / ORI): 1. Create document at `/shop/stock-documents` or `/shop/stock-documents/new`. 2. Add lines. 3. Submit → Confirm → **Post** per type workflow. 4. Note document number. |
| **Expected result** | Document reaches **POSTED** without error. Stock inquiry shows posted row with correct type, branch, status. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | Doc nos: _______________ |

### 4.2 Finance stock inquiry — print and archive

| Field | Detail |
|-------|--------|
| **Preconditions** | At least one **POSTED** stock document from 4.1 |
| **Steps** | 1. HO_FINANCE → **Stock Document Inquiry** `/finance/stock-documents`. 2. Find posted document. 3. Open detail `/finance/stock-documents/{id}`. 4. Confirm **red dot** (PDF missing) on inquiry row if no archive yet. 5. Use browser print (`?autoprint=1` or Print action) → Save as PDF. 6. Click **Upload PDF** on detail. 7. Refresh inquiry — confirm **green** indicator. 8. **Download** archived PDF. |
| **Expected result** | Before upload: `pdfAvailable = false` (red dot). Upload succeeds (PDF only). After upload: `pdfAvailable = true`; download returns same file; dot turns green. Unposted/draft documents show neutral (`null`), not red. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

### 4.3 Negative — invalid upload MIME (optional)

| Field | Detail |
|-------|--------|
| **Preconditions** | Posted stock doc without archive |
| **Steps** | Attempt upload of non-PDF file (e.g. `.txt`). |
| **Expected result** | Upload rejected with clear error; no archive row created; dot stays red. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

---

## Scenario 5 — Finance vouchers (PAV / REV / PCV)

**Routes:** `/finance/payment-vouchers`, `/finance/revenue-vouchers`, `/finance/petty-cash-vouchers`, `/finance/vouchers`  
**Roles:** HO_FINANCE

### 5.1 PAV — workflow and archive

| Field | Detail |
|-------|--------|
| **Preconditions** | Open accounting period; valid GL accounts; HO_FINANCE session |
| **Steps** | 1. Create new PAV. 2. Enter lines, **Submit → Confirm → Post** per workflow. 3. Open posted PAV `/finance/payment-vouchers/{id}`. 4. Print (`?autoprint=1`), save PDF. 5. **Upload PDF** via vault actions. 6. In Finance Document Inquiry, filter **PAV**, find row. 7. Download PDF from inquiry indicator. |
| **Expected result** | PAV posts to GL. Before upload: inquiry `pdfAvailable = false` (red). After upload: `pdfAvailable = true` (green); download works. Document numbers unchanged by archive upload. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | PAV no: _______________ |

### 5.2 REV — workflow and archive

| Field | Detail |
|-------|--------|
| **Preconditions** | Same as 5.1 |
| **Steps** | Repeat 5.1 for **REV** at `/finance/revenue-vouchers`. |
| **Expected result** | Same archive behavior as PAV for posted REV. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | REV no: _______________ |

### 5.3 PCV — workflow and archive

| Field | Detail |
|-------|--------|
| **Preconditions** | Same as 5.1 |
| **Steps** | Repeat 5.1 for **PCV** at `/finance/petty-cash-vouchers`. |
| **Expected result** | Same archive behavior as PAV for posted PCV. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | PCV no: _______________ |

### 5.4 Unposted voucher — neutral indicator

| Field | Detail |
|-------|--------|
| **Preconditions** | DRAFT or SUBMITTED (not posted) PAV/REV/PCV |
| **Steps** | Find unposted row in Finance Document Inquiry (`postingState` includes unposted). |
| **Expected result** | `pdfAvailable = null` (neutral `—`, no red dot). |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

---

## Scenario 6 — MJV / OPB legacy archive bridge

**Routes:** `/finance/manual-journal-entries`, `/finance/opening-balance`, `/finance/vouchers`  
**Roles:** HO_FINANCE

### 6.1 Posted MJV with legacy `pdfPath`

| Field | Detail |
|-------|--------|
| **Preconditions** | Existing **POSTED** MJV that already has legacy PDF (`pdfPath`) from prior posting, **or** post a new MJV and attach PDF via existing MJV PDF flow |
| **Steps** | 1. Open posted MJV detail. 2. Download PDF via MJV PDF endpoint or inquiry. 3. In Finance Document Inquiry, locate MJV row. 4. Verify indicator and download via central vault/download path if shown. |
| **Expected result** | Central archive status resolves **readable** (`pdfAvailable = true`). Download returns PDF bytes. Legacy path still works (no regression). Accounting lines unchanged. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | MJV no: _______________ |

### 6.2 Unposted MJV — null not false

| Field | Detail |
|-------|--------|
| **Preconditions** | DRAFT / SUBMITTED / CONFIRMED MJV (not posted) |
| **Steps** | 1. Find unposted MJV in inquiry. 2. Observe PDF column. |
| **Expected result** | `pdfAvailable = null` (neutral). **Not** red / false. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

### 6.3 OPB (optional spot-check)

| Field | Detail |
|-------|--------|
| **Preconditions** | OPB entry exists in UAT environment |
| **Steps** | Repeat 6.1–6.2 for OPB opening balance entry if in scope. |
| **Expected result** | Same legacy bridge behavior as MJV. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

---

## Scenario 7 — COL pay-in evidence

**Routes:** `/shop` (collector pickup), `/finance/pos-settlement/collector-pickup`, `/finance/vouchers`  
**Roles:** SH_STAFF (collector pickup), HO_FINANCE (settlement + pay-in)

### 7.1 Collector pickup creates COL (not closed)

| Field | Detail |
|-------|--------|
| **Preconditions** | AS entity session; collector staff configured; READ Z day with cash sales; SH_STAFF or collector workflow available |
| **Steps** | 1. Perform **collector pickup** from POS (COLLECT report / ticket). 2. Note **COL** number. 3. As HO_FINANCE, open **Collector Pickup Settlement** `/finance/pos-settlement/collector-pickup`. 4. Find COL row. 5. Post **pickup** settlement (Stage 2 collector pickup) if not auto-posted. |
| **Expected result** | COL ticket exists. Status shows collected/pickup posted. **COL is NOT closed** at pickup — deposit/pay-in still pending. `archiveAvailable` is `null` or `false` per phase (not yet posted pay-in). |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | COL no: _______________ |

### 7.2 POST PAY-IN disabled before evidence

| Field | Detail |
|-------|--------|
| **Preconditions** | COL from 7.1: pickup **POSTED**, deposit **NOT_POSTED**, no pay-in slip uploaded |
| **Steps** | 1. On settlement row, locate **POST** (pay-in / deposit) button. 2. Attempt to click POST. 3. Hover for tooltip. |
| **Expected result** | POST button is **disabled** (not clickable). Tooltip explains missing pay-in evidence (e.g. *Upload bank pay-in evidence before posting deposit.*). No click-then-error for normal UI path. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

### 7.3 Upload one BANK_PAY_IN_SLIP for multiple COL tickets

| Field | Detail |
|-------|--------|
| **Preconditions** | At least **two** COL rows in awaiting pay-in state (same bank deposit batch) |
| **Steps** | 1. Select both COL rows using **batch checkboxes** on settlement table. 2. Click **Upload PAY-IN Slip** on one selected row. 3. Complete staff credential gate. 4. Upload **one** file (PDF, JPEG, or PNG) covering both COLs. 5. Confirm modal lists both collect numbers. |
| **Expected result** | Single upload creates one archive linked to **both** COL tickets. Both rows show slip uploaded / `archiveAvailable = true`. Preview/download works from settlement row. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | COL nos: _______________ |

### 7.4 POST PAY-IN enabled and successful close

| Field | Detail |
|-------|--------|
| **Preconditions** | COL(s) from 7.3 with evidence uploaded |
| **Steps** | 1. Confirm **POST** button is **enabled**. 2. Click POST; complete pay-in confirm (bank deposit date, etc.). 3. Refresh settlement list. 4. Check Finance Document Inquiry for COL row(s). |
| **Expected result** | POST succeeds. Deposit status **POSTED**. COL closed/posted only **after** successful POST PAY-IN. Bank deposit voucher created. Inquiry shows `archiveAvailable = true` with download. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

### 7.5 Server safety net — POST without evidence (negative)

| Field | Detail |
|-------|--------|
| **Preconditions** | COL awaiting pay-in **without** evidence (use test COL or API tool if UI prevents click) |
| **Steps** | Attempt POST PAY-IN via API `/api/finance/pos-settlement/pay-in/confirm` or bank-deposit post route without uploaded slip. |
| **Expected result** | Request **rejected** with clear error (`PAY_IN_SLIP_REQUIRED` or equivalent). No deposit posted. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

### 7.6 MIME validation (optional)

| Field | Detail |
|-------|--------|
| **Preconditions** | COL awaiting evidence |
| **Steps** | Attempt upload of invalid MIME (e.g. `.txt`). Then upload valid PDF, JPEG, PNG each. |
| **Expected result** | Invalid rejected. PDF/JPEG/PNG accepted. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

---

## Scenario 8 — Reports after posting

**Routes:** `/finance/reports/general-ledger`, `trial-balance`, `profit-loss`, `balance-sheet`, `/finance/periods`  
**Roles:** HO_FINANCE, HO_ADMIN (for period admin actions)

### 8.1 Reports reflect posted activity

| Field | Detail |
|-------|--------|
| **Preconditions** | Posted documents from Scenarios 1, 2, 4, 5, 7 in current open period |
| **Steps** | 1. Run **General Ledger** for a key account used in sales (e.g. cash/clearing). 2. Run **Trial Balance** for period. 3. Run **P&L**. 4. Run **Balance Sheet**. 5. Compare to expected totals from UAT transactions (rough reconciliation). |
| **Expected result** | Reports load without error. Amounts include UAT postings. No duplicate journals from archive uploads (archive must not post to GL). |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | Period: _______________ |

### 8.2 Period lock behavior

| Field | Detail |
|-------|--------|
| **Preconditions** | HO_FINANCE session; test period identifiable |
| **Steps** | 1. Note current period status (OPEN). 2. Attempt post dated in **closed** period (SOFT_CLOSED / HARD_CLOSED) — MJV or PAV post. 3. If UAT plan allows, HO_ADMIN performs controlled soft-close on a **non-production** test period and retries. |
| **Expected result** | Posting to closed period **blocked** with clear message. OPEN period still allows posting. Period close controls unchanged by archive work. |
| **Pass / Fail** | [ ] Pass  [ ] Fail |
| **Notes / defects** | |

---

## 10. UAT sign-off summary

| Scenario | Description | Pass / Fail | Blocker defects |
|----------|-------------|-------------|-----------------|
| 1 | POS sale flow | [ ] | |
| 2 | POS refund flow | [ ] | |
| 3 | READ X / READ Z | [ ] | |
| 4 | Stock documents + archive | [ ] | |
| 5 | PAV / REV / PCV + archive | [ ] | |
| 6 | MJV / OPB legacy bridge | [ ] | |
| 7 | COL pay-in evidence | [ ] | |
| 8 | Reports + period lock | [ ] | |

**Overall UAT recommendation:**

- [ ] **Accept** — proceed to next phase / parallel run  
- [ ] **Accept with conditions** — list conditions: _______________  
- [ ] **Reject** — blocking issues must be resolved  

**HO Finance approver:** _______________  **Date:** _______________  
**HO Admin approver:** _______________  **Date:** _______________  
**Engineering witness:** _______________  **Date:** _______________

---

## Appendix A — Quick route reference

| Area | Path |
|------|------|
| POS terminal | `/shop` |
| Receipt lookup | `/shop/receipt-lookup` |
| Shop stock documents | `/shop/stock-documents` |
| Finance daily work | `/finance/daily-work` |
| Collector pickup settlement | `/finance/pos-settlement/collector-pickup` |
| Finance document inquiry | `/finance/vouchers` |
| Stock document inquiry | `/finance/stock-documents` |
| PAV / REV / PCV | `/finance/payment-vouchers`, `/finance/revenue-vouchers`, `/finance/petty-cash-vouchers` |
| MJV | `/finance/manual-journal-entries` |
| Reports | `/finance/reports/general-ledger`, `trial-balance`, `profit-loss`, `balance-sheet` |
| Accounting periods | `/finance/periods` |
| Document archive download | `/api/document-archive/by-document/{documentKind}/{documentId}/file` |

---

## Appendix B — Document archive checkpoint (Phases 0–6)

| Phase | Capability |
|-------|------------|
| 0–3 | Schema, resolver, upload/download/status APIs |
| 4 | MJV / REC legacy bridge |
| 5 | PAV / REV / PCV / Stock manual PDF archive |
| 6 | COL `BANK_PAY_IN_SLIP` evidence + POST PAY-IN gating |

This UAT runbook validates end-user behavior across all of the above.
