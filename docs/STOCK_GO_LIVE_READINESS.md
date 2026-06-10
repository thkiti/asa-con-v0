# Stock Go-Live Readiness

Status: **Operational readiness** — not a new feature phase  
Scope: Prepare first operational stock day using existing StockDocument capabilities  
Related: [29_STOCK_DOCUMENT_WORKFLOW.md](./29_STOCK_DOCUMENT_WORKFLOW.md), [07_STOCK_DOCUMENT_POSTING.md](./07_STOCK_DOCUMENT_POSTING.md), [06_STOCK_LEDGER_FOUNDATION.md](./06_STOCK_LEDGER_FOUNDATION.md), [23F-3_COMPACT_COUNTING_SHEET_SMOKE.md](./23F-3_COMPACT_COUNTING_SHEET_SMOKE.md), [POS_COMPLETION_ROADMAP.md](./POS_COMPLETION_ROADMAP.md)

---

## 1. Purpose

This document defines how **asa-con-v0** will prepare stock before real operation.

| Principle | Meaning |
|-----------|---------|
| First operational stock day | Establish trustworthy opening balances and a safe path to daily stock operations |
| Reuse StockDocument | Use the existing document workflow, counting sheet, and POST path — do not build parallel stock-entry mechanisms |
| No new features by default | Treat readiness as audit and procedure, not development. Add code or schema only when the readiness audit proves it is required |

This is **operational go-live readiness**, not a numbered phase deliverable.

---

## 2. Current assumption

| Area | Assumption |
|------|------------|
| POS | Ready enough to **pause** further POS feature work and shift focus to stock go-live |
| Physical printer | Thermal receipt validation is **pending hardware** — does not block stock opening load |
| StockDocument | Exists and can **input** and **post** stock movements (ADJUSTMENT and other supported doc types) |
| Immediate goal | Create **Beginning Stock** (opening balances) and start **Parallel Run** against the legacy system |

---

## 3. Definition of Ready for Stock Go-Live

Stock is considered ready for go-live when all of the following are true:

| # | Criterion |
|---|-----------|
| 1 | **Beginning Stock method** is chosen and documented (ADJUSTMENT vs dedicated OPENING type) |
| 2 | **Physical stock** can be counted on the shop floor and entered into StockDocument |
| 3 | **Opening Balance** exists in the system for each required branch/location |
| 4 | **System stock balance** can be verified against the physical count (per location, per SKU sample or full load) |
| 5 | **Parallel Run** can begin — asa-con-v0 operates side-by-side with the old system without claiming cutover |

Until these criteria are met, asa-con-v0 must not be treated as the authoritative stock system.

---

## 4. Beginning Stock strategy to evaluate

Two options must be compared before full opening load. Record the decision in this section once the audit is complete.

### Option A — Use ADJUSTMENT as Opening Stock

Post one ADJUSTMENT StockDocument per branch/location with counted quantities. The counting sheet UI already targets ADJUSTMENT drafts.

| Dimension | Assessment |
|-----------|------------|
| **Pros** | No schema change; no new doc type; existing workflow (DRAFT → SUBMIT → CONFIRM → POST); counting sheet and input-list merge already built; staff can start after procedure training only |
| **Cons** | ADJUSTMENT also used for mid-operation corrections — opening loads are not semantically distinct in `docType`; audit reports must filter by date/ref/note to separate opening from later adjustments; staff may pick wrong doc type if not instructed |
| **Audit clarity** | Moderate — relies on document metadata (ref, notes, posting date, location) and external count sheets as evidence; ledger rows look like any other adjustment |
| **Code impact** | **None** if procedure and naming convention are sufficient; optional small UI hint (instruction text) only if audit requires it |
| **Recommendation** | **Preferred method** after Step 1 audit — but **blocked on counting-sheet → `reviewPostingDelta` wiring** before dry run (see §4A) |

### Option B — Add dedicated OPENING document type

Introduce `OPENING` (or equivalent) in `DocType`, with posting rules and UI parallel to ADJUSTMENT where appropriate.

| Dimension | Assessment |
|-----------|------------|
| **Pros** | Clear semantic separation in database and reports; opening balances easy to query and exclude from operational adjustment metrics; reduces staff confusion if UI labels OPENING explicitly |
| **Cons** | Schema migration + enum extension; transition policy, posting mapper, permissions, list filters, and tests must be updated; delays go-live unless strictly necessary |
| **Audit clarity** | High — `docType = OPENING` is self-describing in StockDocument and downstream traceability |
| **Code impact** | **Non-trivial** — Prisma `DocType`, `document-transition-policy`, validation, posting mapper, API allowlists, UI doc-type picker, architecture guards |
| **Recommendation** | _TBD after dry run — adopt only if Option A audit clarity is judged insufficient_ |

### Comparison summary

| | Option A: ADJUSTMENT | Option B: OPENING |
|--|---------------------|-------------------|
| Time to first load | Fastest | Slower (implementation first) |
| Audit without new code | Possible with discipline | Stronger by design |
| Risk of type confusion | Higher | Lower |
| Schema / code change | None | Required |

---

## 4A. Step 1 Audit — ADJUSTMENT as Beginning Stock

**Audit date:** 2026-06-10  
**Auditor scope:** Read-only code + docs review (no schema/code/test changes)  
**Verdict:** **GAP** — code change required before dry run via counting sheet UI

### Files reviewed

| Category | Paths |
|----------|-------|
| Readiness / workflow docs | `docs/STOCK_GO_LIVE_READINESS.md`, `docs/29_STOCK_DOCUMENT_WORKFLOW.md`, `docs/07_STOCK_DOCUMENT_POSTING.md`, `docs/06_STOCK_LEDGER_FOUNDATION.md`, `docs/23F-3_COMPACT_COUNTING_SHEET_SMOKE.md`, `docs/POS_COMPLETION_ROADMAP.md` |
| Schema | `prisma/schema.prisma` (`DocType`, `DocStatus`, `StockDocument`, `StockDocumentLine`, `Stock`, `StockTransaction`) |
| Workflow / save | `lib/stock/document/document-transition-policy.ts`, `document-workflow.ts`, `document-validation.ts`, `document-save.ts`, `document-status.ts` |
| Posting / ledger | `lib/stock/validation.ts`, `document-mapper.ts`, `posting.ts`, `lib/stock/ledger.ts` |
| Counting sheet UI | `lib/stock-ui/editor-draft-state.ts`, `merge-input-list-with-saved-lines.ts`, `counting-editor-load.ts`, `components/stock/StockDocumentEditorController.tsx`, `StockDocumentCountingBlock.tsx` |
| Permissions / API | `lib/stock-ui/document-permissions.ts`, `lib/stock/document-read/document-access.ts`, `app/api/stock-document/**`, `app/api/reports/stock-summary/route.ts` |

### Summary table

| Area | Result | Notes |
|------|--------|-------|
| 1. DocType / schema | **Pass** | `ADJUSTMENT` exists; header + audit fields present; **no `note` field** on `StockDocument` |
| 2. Workflow | **Pass** | `DRAFT → SUBMIT → CONFIRM → POST` allowed; POST also allowed from `SUBMITTED` |
| 3. Validation rules | **Pass with procedure** | Zero/empty handling correct; negative qty blocked in counting save path; ADJ allows negative via API |
| 4. Counting sheet / input | **Partial** | ADJUSTMENT draft counting sheet works for entry/save; **does not set `reviewPostingDelta`** |
| 5. Posting / ledger | **Pass (if delta present)** | Positive `reviewPostingDelta` → `receiveStock`; POSTED immutable; balance via stock summary |
| 6. Audit clarity | **Pass with procedure** | `refNo` + timestamps + external count sheet sufficient if naming discipline applied; **refNo not staff-editable** |
| 7. Gaps | **1 blocker** | Counting sheet → POST path broken without `reviewPostingDelta` wiring |
| 8. Recommendation | **GAP** | Small code fix required before dry run — not OPENING type, not schema |

### Findings by area

#### 1. DocType / schema

| Check | Finding |
|-------|---------|
| `ADJUSTMENT` in `DocType` | **Yes** — `prisma/schema.prisma` enum includes `ADJUSTMENT` (no `OPENING`) |
| `status` | `DocStatus`: `DRAFT` … `POSTED`, `CANCELLED`; POSTED terminal per `docs/29` |
| `docType` | On `StockDocument.docType` |
| `branchId` | Required on create (`document-save.ts`) |
| `fromLocId` / `toLocId` | Optional; ADJUSTMENT ledger branch = `fromLocId ?? toLocId ?? branchId` (`document-mapper.ts`) |
| `confirmedByStaffId` / `confirmedAt` | Set on explicit CONFIRM or implicit confirm on POST from `SUBMITTED` (`document-status.ts`) |
| `postedByStaffId` / `postedAt` | Set on POST (`applyPostedTransition`) |
| `refNo` | Required, unique; auto-generated on first save (`ADJUSTMENT-{timestamp}-{random}`); **not updated on later saves** |
| `note` / free-text audit | **No `note` column** on `StockDocument`; only `cancelReason` for cancelled docs |
| Line audit | `StockDocumentLine`: `qty`, `endingQty`, `reviewPostingDelta` |
| Other header audit | `createdByStaffId`, `submittedAt`, `periodMonth`, `createdAt` |

#### 2. Workflow

| Step | Allowed for ADJUSTMENT? | Evidence |
|------|-------------------------|----------|
| `DRAFT → SUBMIT` | Yes | `WORKFLOW_TRANSITIONS` + `submitDocument()` |
| `SUBMITTED → CONFIRM` | Yes | Global CONFIRM rule (no doc-type exclusion) |
| `CONFIRMED → POST` | Yes | `POSTABLE_BY_DOC_TYPE.ADJUSTMENT` includes `CONFIRMED` |
| `SUBMITTED → POST` (skip CONFIRM) | Yes | Same postable set; implicit `confirmedAt` on POST |
| `DRAFT → POST` | **No** | Not in postable set |
| SHIP / TRANSFER | Optional | Not required for ADJUSTMENT opening path |

**Roles (UI matrix — server enforces less on workflow routes):**

| Action | SH_STAFF | HO_OPERATIONS / HO_FINANCE / HO_ADMIN |
|--------|----------|---------------------------------------|
| Save / Submit / Confirm | Yes (ADJUSTMENT shop type) | Yes |
| Post ADJUSTMENT | Yes | Yes |
| Post TRANSFER_OUT | No | Yes |

Source: `lib/stock-ui/document-permissions.ts` (`canShopPost`). Workflow API routes (`submit`, `confirm`, `post`) accept `staffId` in body and are on `API_BYPASS_PATHS` — session not enforced server-side on those endpoints (operational risk, not opening-stock blocker).

#### 3. Validation rules

| Case | Behavior |
|------|----------|
| Empty document (no lines with qty ≠ 0) | **Rejected** on Save and Submit — `EMPTY_DOCUMENT` (`document-validation.ts`) |
| Zero qty rows | **Skipped on Save** (`buildSaveLines`: `if (qty === 0) continue`); counting UI keeps zero rows visible via input-list merge |
| Positive qty rows | **Persisted**; counting mode saves `{ productId, qty }` only |
| Negative qty rows | **Allowed at server** for ADJUSTMENT if sent in API body; **not persisted from counting sheet** — save filter requires `qty > 0`, and text input has no `min` constraint but negative values are dropped |
| ADJUSTMENT POST | **Every saved line must have `reviewPostingDelta != null`** (`validation.ts` → `MISSING_ADJ_DELTA`) |
| ADJ all-zero deltas | POST allowed with **no ledger calls** when every line has `reviewPostingDelta: 0` |
| Opening negative count | **Procedure-only block** — system does not forbid negative `reviewPostingDelta` on ADJUSTMENT; opening procedure must forbid it |

**Opening-stock delta semantics:** Ledger uses **`reviewPostingDelta`**, not counting `qty` (`document-mapper.ts` → `mapAdjustmentLines`). On a **zero system stock** baseline, opening count *C* should produce `reviewPostingDelta = +C` (and typically `qty = C` for display). Counting sheet currently stores `qty` only — see §4A Gaps.

#### 4. Counting sheet / input flow

| Check | Finding |
|-------|---------|
| ADJUSTMENT draft uses counting sheet | **Yes** — `isCountingEditorMode`: `docType === "ADJUSTMENT" && !readOnly` (`editor-draft-state.ts`) |
| Create / edit ADJUSTMENT draft | **Yes** — `loadCountingEditorStateForCreate/Edit` + `StockDocumentCountingSheet` |
| Product order / grouping | Input list from `GET /api/stock-document/input-list`; hook tabs K/C/M/O/S; rows sorted by `hookNo` for display (`sort-counting-rows-by-hook.ts` — display only) |
| Zero rows visible, not persisted | **Yes** — merge shows full list; `editorStateToSavePayload` omits `qty ≤ 0` lines |
| Empty product rows ignored | **Yes** — counting save requires `productId` and `qty > 0` |
| Save payload for counting | **Only `{ productId, qty }`** — explicitly omits `endingQty` and `reviewPostingDelta` (regression test in `stock-document-counting-regression.test.tsx`) |

#### 5. Posting / ledger

| Check | Finding |
|-------|---------|
| ADJUSTMENT mapping | `reviewPostingDelta > 0` → `receiveStock`; `< 0` → `issueStock`; `0` → skip |
| Positive opening lines | **Increase** `Stock.qty` via `receiveStock` when `reviewPostingDelta > 0` |
| Ledger branch | `fromLocId` for ADJUSTMENT — counting draft defaults `fromLocId = shopBranchId` |
| Immutability | POSTED documents cannot edit/cancel/delete (`docs/29`); `StockTransaction` rows append-only |
| Balance verification | `GET /api/reports/stock-summary?branchId=…` (`lib/stock/stock-summary.ts`); document detail + `StockTransaction` via `refType = STOCK_DOC_ADJUSTMENT` |
| Finance side effect | Optional voucher when finance posting enabled (`posting.ts`) — does not block stock balance |

#### 6. Audit clarity

| Question | Finding |
|----------|---------|
| Is ADJUSTMENT enough with naming convention? | **Yes, procedurally** — filter `docType = ADJUSTMENT` + `refNo` prefix + `postedAt` + location |
| Proposed `refNo` convention | `OPENING-YYYY-MM-DD-{BRANCH}-{LOCATION}` — **not enforceable in UI today** (auto `refNo` on create only) |
| Proposed note convention | `Beginning Stock / count sheet ref …` — **no `note` field**; use external count sheet + spreadsheet mapping `documentId`/`refNo` → sheet |
| Missing link field | **`note` / `evidenceRef`** absent; staff cannot rename `refNo` after create without code or HO DB access |
| Line-level evidence | `qty` on line reflects count entry; `reviewPostingDelta` is the posted magnitude (should match opening count when system stock is zero) |

### Gaps table

| ID | Gap | Classification | Detail |
|----|-----|----------------|--------|
| G1 | Counting sheet Save does not populate `reviewPostingDelta`; POST requires it and ledger ignores `qty` for ADJUSTMENT | **BLOCKER** | Dry run through `/shop/stock-documents` counting UI will fail at POST with `MISSING_ADJ_DELTA` (or post zero movement if validation were bypassed) |
| G2 | `refNo` auto-generated and not editable on save | **SHOULD FIX BEFORE FULL LOAD** | Proposed `OPENING-…` convention cannot be applied by staff; external mapping required until ref assignment exists |
| G3 | No `StockDocument.note` for count-sheet reference text | **PROCEDURE ONLY** | Keep paper/PDF count sheets + manual `documentId`/`refNo` index until field added |
| G4 | ADJUSTMENT allows negative `reviewPostingDelta` at server | **PROCEDURE ONLY** | Opening procedure forbids negative; counting save drops negative `qty` but API could send negative delta |
| G5 | Workflow POST/CONFIRM/SUBMIT routes lack session RBAC | **NICE TO HAVE** | UI sends `staffId`; server trusts body — hardening separate from opening stock |
| G6 | No dedicated opening-stock report / filter | **NICE TO HAVE** | Covered by non-goal §11; use list filter + `refNo` prefix discipline |
| G7 | `OPENING` doc type absent | **Not required for this audit** | Option B deferred unless G1 fix still leaves audit ambiguity unacceptable |

### Recommendation

**GAP — code change required before dry run**

ADJUSTMENT is the **correct vehicle** for beginning stock (schema, workflow, and ledger are sufficient **when `reviewPostingDelta` is set**). The **counting sheet UI path** — the intended shop entry mode for ADJUSTMENT — does not complete the Save → POST contract today.

**Minimum fix (not implemented in this step):** When saving ADJUSTMENT from counting mode on a zero-stock baseline, persist `reviewPostingDelta` equal to entered count (or compute delta from system on-hand vs count). Legacy `asa-con` used a `cal-adj` step; v0 has no equivalent (`cal-adj` route absent).

**Not required for dry run:** `OPENING` doc type, schema migration, UI redesign, or stock posting lock.

### Next action

| # | Action | Owner |
|---|--------|-------|
| 1 | Implement **G1 fix** (counting qty → `reviewPostingDelta` for opening/counting save, or restore cal-adj step) — smallest change only | Dev |
| 2 | Re-run Step 1 audit spot-check after G1 fix | Dev |
| 3 | Execute **§6 Dry Run** (10–20 SKUs, one branch) | Operations |
| 4 | Decide whether G2 (`refNo` assignment) needs a small UI/API affordance before full load | Ops + Dev |
| 5 | Update §9A and Option A/B recommendations after dry run | Ops |

---

## 5. Stock Count Procedure

Physical count is the **source of truth** for opening balances. The system entry must mirror the count sheet.

### Scope

| Rule | Detail |
|------|--------|
| Count by branch/location | Each opening load is tied to **one** branch and **one** stock location (warehouse / shop floor as defined in master data) |
| Count by product hook/code | Walk the reference product list by **hook group** (K / C / M / O / S) and product code — same order as the counting sheet tabs |
| Qty zero handling | SKUs with **zero on hand** may be recorded as `0` on the count sheet; only lines with **qty > 0** are persisted on Save (zero-qty master rows remain visible in the UI but are not saved as document lines) |
| Negative qty | **Not allowed** for opening count — reject and re-count; do not post negative opening quantities |
| Empty product rows | Rows with no qty entered are **ignored** on save — they do not create document lines |
| Evidence | The **signed count sheet** (paper or controlled export) is the audit evidence; StockDocument ref/no and posted timestamp link system state to that evidence |

### Roles

| Role | Responsibility |
|------|----------------|
| Counter | Physical count per location |
| Reviewer | Spot-check high-value or high-variance SKUs |
| Data entry | Enter counts into ADJUSTMENT (or OPENING) draft using counting sheet |
| Approver | Confirm document before POST |

---

## 6. Dry Run Plan

Run a **limited** opening load before any full-branch rollout. Record all findings in a short dry-run report (appendix or linked note).

| Step | Action |
|------|--------|
| 1 | Select **10–20 SKUs** spanning multiple hook groups (include at least one zero-qty and one high-qty item) |
| 2 | Pick **one branch/location** first |
| 3 | Count manually on the floor; complete a count sheet |
| 4 | Create StockDocument (ADJUSTMENT per current assumption); enter quantities via counting sheet |
| 5 | Workflow: Save → Submit → Confirm → **Post** |
| 6 | Verify resulting **stock balance** (stock summary / ledger query / spot-check in UI) against count sheet |
| 7 | Document: mismatches, master-data gaps (missing product, wrong location), workflow friction, doc-type confusion |
| 8 | **Do not** proceed to full load until mismatches are understood and the beginning-stock method decision (Section 4) is recorded |

---

## 7. Full Opening Load Plan

After dry run passes:

| Step | Action |
|------|--------|
| 1 | Repeat count → enter → confirm → post for **all branches/locations** required for parallel run |
| 2 | Default: **one StockDocument per branch/location** unless readiness audit justifies splitting (e.g. very large SKU count — document operational limit first) |
| 3 | **Confirm all documents** (and POST) before parallel run starts — no draft opening balances in production comparison |
| 4 | Retain **count sheets** as evidence; map each posted document `refNo` / id to its sheet |
| 5 | Produce a **verification report**: location × SKU sample (or full) comparing count sheet qty vs posted system balance |

---

## 8. Parallel Run Plan

Parallel run validates daily operations before cutover. The **old system remains source of truth** until exit criteria (Section 10) are met.

| Phase | Rule |
|-------|------|
| Authority | Legacy system = **source of truth** for stock and sales reporting initially |
| Side-by-side | asa-con-v0 runs **in parallel** — POS sales post stock; stock documents record transfers/adjustments as operational practice |
| Daily compare | Compare **end-of-day stock** (or agreed SKU subset) and **POS movement** between systems |
| Mismatches | **Record every mismatch** with date, location, SKU, both quantities, and suspected cause (opening error, master data, timing, unposted document) |
| Cutover gate | **Do not cut over** until mismatch causes are understood and recurring errors are eliminated or accepted with documented rationale |

Suggested comparison cadence: daily for the first 1–2 weeks, then weekly until stable.

---

## 9. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong opening count | Wrong system balance **forever** (POSTED is immutable) | Dry run; dual review; count sheets as evidence; verify before POST |
| Staff misunderstand doc type | Opening entered as TRANSFER or mid-year adjustment | Procedure training; clear ref naming; evaluate OPENING type if confusion persists |
| POST before verification | Audit confusion; hard to align system to physical | Confirm step + verification checklist; no POST until balance check passes |
| Parallel run reveals master-data gaps | Missing products, wrong branch/location, CONSUMABLE vs TRACKED errors | Fix master data during parallel run; do not force cutover |
| ADJUSTMENT used for both opening and corrections | Reporting and audit ambiguity | Naming convention, document notes, optional OPENING type decision |

---

## 9A. Go-Live Recommendation Status

| Field | Status |
|-------|--------|
| Beginning Stock Method | **ADJUSTMENT** (preferred) — blocked on G1 until counting → `reviewPostingDelta` wiring |
| Step 1 Audit | **Complete** (2026-06-10) — verdict **GAP** |
| Dry Run Completed | Pending |
| Opening Balances Loaded | Pending |
| Verification Passed | Pending |
| Parallel Run Started | Pending |
| Recommended For Go-Live | **No** |

---

## 10. Exit Criteria

Stock go-live readiness is **complete** when:

| # | Criterion |
|---|-----------|
| 1 | Beginning stock method **selected** (Section 4 recommendation filled in) |
| 2 | **Dry run passed** — findings resolved or accepted |
| 3 | Opening balances **posted** for all required locations |
| 4 | **Verification report** reviewed and signed off |
| 5 | Staff can perform **daily** StockDocument input (adjustment / transfer as needed) without developer support |
| 6 | **Parallel run start date** selected and communicated |

Cutover to asa-con-v0 as sole stock authority is a **separate decision** after parallel run stability — not implied by this checklist alone.

---

## 11. Explicit non-goals

The following are **out of scope** for this readiness effort:

| Non-goal | Reason |
|----------|--------|
| Stock Posting Lock | Not required for opening load; finance period lock is separate — do not implement stock-specific lock yet |
| StockDocument UI redesign | Use existing counting sheet and editor; cosmetic or layout overhauls wait |
| Inventory audit reports | No new audit dashboard; use count sheets + stock summary + manual comparison |
| Advanced stock dashboard | Reporting kernel summaries are sufficient for parallel run verification |

---

## 12. Next decision after this doc

Step 1 audit (§4A) decided **ADJUSTMENT is the preferred vehicle**; **OPENING doc type is not required** for dry run. Remaining decisions:

| Decision | Options / status |
|----------|------------------|
| G1 fix approach | (a) Set `reviewPostingDelta = qty` on counting save when system stock is zero; (b) compute delta vs on-hand; (c) explicit cal-adj step before POST |
| Opening stock vehicle | **ADJUSTMENT** — confirmed unless dry run proves otherwise |
| Staff UI | Small hint for opening `refNo`/procedure? Optional after G1; **refNo edit** may be needed before full load (G2) |
| Parallel run scope | Which branches/locations and SKU depth (full vs sample) for daily comparison? |
| Cutover date | When (if ever) legacy system stops being stock source of truth — only after parallel run exit evidence exists |

Record outcomes by updating §4A, §9A, and linking dry-run / verification artifacts.
