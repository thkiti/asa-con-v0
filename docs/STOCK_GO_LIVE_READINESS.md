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
| 4. Counting sheet / input | **Pass** (post-G1) | Counting save sets `reviewPostingDelta = qty`; staff entry routing still missing (§4B) |
| 5. Posting / ledger | **Pass (if delta present)** | Positive `reviewPostingDelta` → `receiveStock`; POSTED immutable; balance via stock summary |
| 6. Audit clarity | **Pass with procedure** | `refNo` + timestamps + external count sheet sufficient if naming discipline applied; **refNo not staff-editable** |
| 7. Gaps | **G1 resolved** | Remaining gaps: staff POS entry, refNo, draft reuse (§4B) |
| 8. Recommendation | **GO** (post-G1) | ADJUSTMENT posting path unblocked; staff UX gaps remain |

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
| Save payload for counting | **`{ productId, qty, reviewPostingDelta: qty }`** — fixed in commit `426ae77` (G1) |

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
| G1 | Counting sheet Save did not populate `reviewPostingDelta` | **Resolved** | Fixed `426ae77` — `reviewPostingDelta = qty` on counting save |
| G2 | `refNo` auto-generated and not editable on save | **SHOULD FIX BEFORE FULL LOAD** | Proposed `OPENING-…` convention cannot be applied by staff; external mapping required until ref assignment exists |
| G3 | No `StockDocument.note` for count-sheet reference text | **PROCEDURE ONLY** | Keep paper/PDF count sheets + manual `documentId`/`refNo` index until field added |
| G4 | ADJUSTMENT allows negative `reviewPostingDelta` at server | **PROCEDURE ONLY** | Opening procedure forbids negative; counting save drops negative `qty` but API could send negative delta |
| G5 | Workflow POST/CONFIRM/SUBMIT routes lack session RBAC | **NICE TO HAVE** | UI sends `staffId`; server trusts body — hardening separate from opening stock |
| G6 | No dedicated opening-stock report / filter | **NICE TO HAVE** | Covered by non-goal §11; use list filter + `refNo` prefix discipline |
| G7 | `OPENING` doc type absent | **Not required for this audit** | Option B deferred unless G1 fix still leaves audit ambiguity unacceptable |

### Recommendation

**GO** (as of commit `426ae77`)

ADJUSTMENT is the correct vehicle for beginning stock. G1 is resolved. Remaining work is **staff entry UX and draft lifecycle** (§4B), not schema or OPENING doc type.

### Next action

| # | Action | Owner |
|---|--------|-------|
| 1 | Implement §4B staff-entry plan (get-or-create, POS route, refNo) | Dev |
| 2 | Execute **§6 Dry Run** (10–20 SKUs, one branch) | Operations |
| 3 | Decide G2 (`refNo` / `DocumentCounter`) before full load | Ops + Dev |
| 4 | Update §9A after dry run | Ops |

---

## 4B. Stock Count Staff Entry Audit

**Audit date:** 2026-06-10  
**Scope:** Compare legacy `asa-con` stock-count staff workflow with `asa-con-v0`; plan only — no implementation  
**Verdict:** **YES WITH SMALL CHANGES** — ADJUSTMENT `StockDocument` is the right backend; POS → direct counting draft needs targeted wiring

### Legacy behavior found (`asa-con`)

| Topic | Finding | Source |
|-------|---------|--------|
| POS entry | **Yes** — `full-pos` keypad **STOCK COUNT** → `openStockCount()` → `openStockDocument("ADJUSTMENT")` | `app/full-pos/page.tsx` |
| API | `POST /api/stock-document/get-or-create` with `{ docType, branchId, staffId }` | `get-or-create/route.ts` |
| Draft reuse | **One DRAFT per shop/month** — not per staff | `adjustmentDraftWhere(branchId, explicitPeriod)` |
| Reuse key | `docType=ADJUSTMENT`, `fromLocId=branchId`, `status=DRAFT`, plus `periodMonth` match (or legacy `periodMonth null` + `date` in month) | Same file |
| Create if missing | New doc with `generateRunningRef`, `date` = today (or last day of period for HO override), `periodMonth` from date | Same file |
| Reopen draft | **Yes** — `findFirst` existing DRAFT returns same `id`; router pushes `/stock-document/{id}` | `full-pos/page.tsx` |
| refNo format | **`ADJ-{BRANCHCODE}-{YYYYMM}-{running}`** e.g. `ADJ-SH001-202606-0001` (4-digit running via `DocumentCounter`) | `lib/generateRef.ts` |
| Display ref | Staff may see shortened ref; full form includes running suffix | `scripts/delete-stock-document-by-ref.ts` examples |
| Calendar gate | Shop staff: STOCK COUNT enabled only **last 5 days of month** (HO bypass) | `isStockCountOpen()` in `full-pos/page.tsx` |
| After SUBMIT | Shop **read-only** — banner: ดูได้อย่างเดียว แก้ไม่ได้; ADJ SUBMITTED leaves shop hub (HO queue only) | `StockDocumentPage.tsx`, `hubLoaders.ts` |
| Staff edit after SUBMIT | **No** for `SH_STAFF` on ADJ; HO uses `saveReview` on SUBMITTED+ | `docs/11_stock-document-adj-ui-and-post.md` |
| cal-adj | **HO only**, `SUBMITTED` status — computes `reviewPostingDelta` from END/COUNT/snapshot (month-end variance), **not** opening-count qty=delta | `cal-adj/route.ts`, `adjMonthAutomation` |
| Counting UI | END \| CNT \| VAR \| ADJ columns; horizontal blocks; full-height layout; no generic header form for shop count | `StockDocumentPage.tsx`, `docs/11_stock-document-adj-ui-and-post.md` |
| Date on reopen | Existing draft returned **unchanged** — get-or-create does not update `date` on hit | `get-or-create/route.ts` |

### Current v0 behavior

| Topic | Finding | Source |
|-------|---------|--------|
| POS / shop entry | **STOCK COUNT** on POS keypad (`/shop` → `PosTerminalPage`) navigates to **`/shop/stock-documents` list** — not counting screen | `lib/pos-ui/pos-navigation.ts`, `PosTerminalPage.tsx` |
| No get-or-create | **No** `get-or-create` API; `DocumentCounter` in schema **unused** | grep across `asa-con-v0` |
| Create path | List → **New ADJUSTMENT** → `/shop/stock-documents/new?type=ADJUSTMENT` → new draft every time unless staff picks existing row | `StockDocumentListView.tsx`, `new/page.tsx` |
| Draft discovery | `listStockDocuments` supports `branchId`, `docType`, `status`, `periodMonth` filters — **no dedicated “open my count draft”** helper | `document-list.ts`, list API |
| refNo today | **`ADJUSTMENT-{timestamp}-{random}`** on first save — not `ADJ-SH001-202606-…` | `document-save.ts` `draftRefNo()` |
| refNo on update | **Unchanged** after create (good) | `document-save.ts` — update path omits `refNo` |
| Date on save | **Updates every save** — `date` and `periodMonth` rewritten from editor header (`periodMonthFromDate(docDate)`) | `document-save.ts` headerData on update |
| Editor date default | **Today** (`createDraftEditorState`) — staff can change date input | `editor-draft-state.ts` |
| Header form | **Always shown** for drafts (`StockDocumentHeaderForm` — type, status, ref, date, from/to loc) | `StockDocumentEditorView.tsx` |
| Counting sheet | ADJUSTMENT DRAFT uses counting sheet; horizontal blocks exist (`countingShoeScrollClass`, `chunkCountingRows`); group summary panel on right | `StockDocumentCountingSheet.tsx`, `counting-sheet-styles.ts` |
| Toolbar actions | **Save, Submit, Confirm, Cancel, Post, Print, Back to list** — not SAVE/SUBMIT/BACK only | `document-permissions.ts`, `StockDocumentEditorToolbarActions.tsx` |
| Session fields | **`staffId`, `name`, `branchId`, `branchCode`, `branchName`, `role`** available server-side and via shop session fetch | `lib/auth/types.ts`, `StockDocumentEditorController` |
| staffId on document | `createdByStaffId` set on first save only — **not** used for draft lookup | `document-save.ts` |
| G1 posting path | Counting save sets **`reviewPostingDelta = qty`** (opening baseline) | `editor-draft-state.ts` (commit `426ae77`) |
| After SUBMIT | Document becomes `readOnly`; counting sheet disabled — **consistent with legacy** | `detailToEditorState`, `isCountingEditorMode` |
| POS route name | v0 POS lives at **`/shop`** (legacy: `/full-pos`) | `app/(main)/shop/page.tsx` |

### Recommended workflow (target)

```
/shop (POS)
  → STOCK COUNT
  → POST get-or-create ADJUSTMENT (branch + current periodMonth)
  → redirect /shop/stock-documents/{id}?mode=count (or dedicated /shop/stock-count)
  → counting sheet only (no header form)
  → compact heading:
     ตรวจนับสต๊อก - REF NO. {refNo} / {branchCode} • {branchName} / {staffId} • {staffName} / {YYYY.MM.DD}
  → SAVE | SUBMIT | BACK (top-right)
  → BACK returns to /shop
```

| Rule | Recommendation |
|------|----------------|
| Draft reuse | Find existing **DRAFT** before create (legacy-aligned) |
| After SUBMIT | get-or-create must **not** return SUBMITTED doc; create **new** draft only when no DRAFT exists for period (or block with message) |
| Opening vs month-end | **Opening load:** staff or HO may POST after confirm (§6 dry run). **Month-end count (later):** SUBMIT-only for shop matches legacy; HO cal-adj/post out of scope here |
| Date immutability | On **existing DRAFT**, save must **not** change `date` / `periodMonth` (fix `document-save.ts` update path for count mode) |
| Location | Set `branchId` + `fromLocId = session.branchId` at create (already default in counting header) |

### Draft reuse rule (recommendation)

**Recommend option A: one shared Stock Count draft per branch + periodMonth**

| Key field | Include? | Reason |
|-----------|----------|--------|
| `docType = ADJUSTMENT` | **Yes** | Stock count vehicle |
| `fromLocId = branchId` | **Yes** | Legacy lookup key; ledger branch |
| `status = DRAFT` | **Yes** | Only reopen editable draft |
| `periodMonth` | **Yes** | Current `YYYY-MM` (v0) or `YYYYMM` (legacy) — **normalize one format** |
| `branchId` | **Yes** (secondary) | v0 header field; include in query for safety |
| `createdByStaffId` / `staffId` | **No** | Legacy does not split by staff; shared count per shop |
| Per staff/month (B) | **No** | Would duplicate counts and confuse reconciliation |
| Per location/month (C) | **Defer** | v0 shop ADJ uses single `fromLocId = shop branch`; multi-location shops need explicit policy later |

Legacy OR clause for `periodMonth null` + `date` in month should be ported if old rows exist; greenfield v0 can require `periodMonth` on create.

### refNo recommendation

| | Legacy | v0 today | Recommend |
|--|--------|----------|-----------|
| Format | `ADJ-SH001-202606-0001` | `ADJUSTMENT-1738…-abc` | Port **`generateRunningRef`** pattern using existing `DocumentCounter` model |
| Prefix | `ADJ` | `ADJUSTMENT` string | **`ADJ`** for parity and compact heading |
| Period | `YYYYMM` in ref | `periodMonth` `YYYY-MM` in DB | Align ref period segment to **`YYYYMM`**; keep DB `periodMonth` as `YYYY-MM` |
| Running | Per branch+period counter | Random | **Required** before staff training — avoids unreadable refs and supports audit |
| Staff-editable ref | No | No | Keep auto-assign at create only (G2) |

Example heading ref segment: `ADJ-SH001-202606` may display **without running suffix**; store full `ADJ-SH001-202606-0001` in DB.

### UI recommendation

| Requirement | Current | Feasibility |
|-------------|---------|-------------|
| Hide document header form | Header always rendered | **Easy** — `staffCountMode` prop/skip `StockDocumentHeaderForm` |
| Compact heading line | Title inside counting sheet only | **Easy** — new banner component using session + `detail.refNo` |
| Paper-like full screen | Page wrapped in `p-8` + list links; counting sheet in bordered section | **Medium** — dedicated route with `h-screen`, reduced padding, hide print snapshot on draft |
| Horizontal overflow only | Blocks use `overflow-x-auto`; vertical chunking by 22 rows | **Mostly there** — tune full-height grid; legacy used full viewport height |
| SAVE / SUBMIT / BACK top-right | Toolbar in counting sheet header via `toolbarActions`; includes extra buttons | **Easy** — filter `getEditorWorkflowActions` for staff count mode |
| Fixed product positions | Input-list order + hook tabs K/C/M/O/S | **Already stable** — same merge order as paper sheet |

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Duplicate DRAFT creation | High | Server-side get-or-create in **one transaction** (legacy pattern) |
| Wrong branch | High | Bind to `session.branchId`; SH_STAFF list already pinned |
| Wrong staff attribution | Medium | Show staff in heading; `createdByStaffId` on first create only |
| SUBMITTED doc reopened | High | get-or-create query **`status: DRAFT` only** |
| refNo collision | Medium | Use `DocumentCounter` upsert (legacy) |
| Date / periodMonth changes on save | High | Freeze `date` on DRAFT update in count mode |
| Staff picks wrong doc from list | Medium | Remove list from happy path; POS goes direct |
| Month boundary (23:59 last day) | Medium | `periodMonth` from **create date**, not each save; document timezone policy |
| Location missing | Low for shop | Default `fromLocId = branchId` at create |
| Opening count vs month-end cal-adj | Medium | Do **not** port cal-adj for opening; G1 qty=delta suffices on zero baseline |
| Multiple ADJ DRAFTs already in DB | Medium | One-time cleanup + unique partial index (future) or get-or-create picks newest DRAFT |

### Implementation order

| # | Item | Class | Notes |
|---|------|-------|-------|
| 1 | `POST /api/stock-document/get-or-create` (or `lib/stock/document/get-or-create.ts` + thin route) | **REQUIRED BEFORE DRY RUN** | Legacy port: find DRAFT ADJ by branch+period; else create with frozen `date` |
| 2 | `generateRunningRef` using `DocumentCounter` | **REQUIRED BEFORE DRY RUN** | Replace `draftRefNo()` for ADJUSTMENT create path |
| 3 | POS STOCK COUNT → get-or-create → redirect to draft editor | **REQUIRED BEFORE DRY RUN** | Replace list navigation in `pos-navigation.ts` / `PosTerminalPage` |
| 4 | Freeze `date`/`periodMonth` on update for count drafts | **REQUIRED BEFORE DRY RUN** | Prevents created date drift |
| 5 | Staff count mode: hide header, compact heading, SAVE/SUBMIT/BACK | **SHOULD FIX BEFORE STAFF TRAINING** | Minimal UI flags on existing editor |
| 6 | BACK → `/shop` (not list) when entered from POS | **SHOULD FIX BEFORE STAFF TRAINING** | `from=pos` query param |
| 7 | Full-viewport counting layout polish | **SHOULD FIX BEFORE STAFF TRAINING** | CSS only |
| 8 | Month-end calendar gate (last 5 days) | **NICE TO HAVE** | Legacy parity for EOM count, not opening load |
| 9 | HO cal-adj / END-CNT-ADJ grid | **NICE TO HAVE** | Month-end variance; separate from opening stock |
| 10 | `note` / evidence field | **NICE TO HAVE** | G3 — external sheets suffice for dry run |

### GO / GAP conclusion

| Question | Answer |
|----------|--------|
| Can we use existing ADJUSTMENT `StockDocument`? | **Yes** — schema, workflow, counting sheet, G1 posting path |
| Can we implement FULL POS → STOCK COUNT → direct counting draft? | **YES WITH SMALL CHANGES** |
| Blockers | No schema change; need get-or-create + refNo + POS route + date freeze + staff UI mode |
| OPENING doc type required? | **No** |
| cal-adj required for opening dry run? | **No** (qty = `reviewPostingDelta` on zero stock) |

**Overall:** **YES WITH SMALL CHANGES**

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
| Beginning Stock Method | **ADJUSTMENT** (preferred) |
| Step 1 Audit (§4A) | **Complete** — G1 **resolved** (`426ae77`) |
| Step 1b Audit (§4B) | **Complete** (2026-06-10) — staff entry **YES WITH SMALL CHANGES** |
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
| G1 fix | **Done** — `reviewPostingDelta = qty` on counting save (`426ae77`) |
| Staff entry (§4B) | get-or-create + legacy refNo + POS direct route + staff count UI mode |
| Opening stock vehicle | **ADJUSTMENT** — confirmed unless dry run proves otherwise |
| Staff UI | Small hint for opening `refNo`/procedure? Optional after G1; **refNo edit** may be needed before full load (G2) |
| Parallel run scope | Which branches/locations and SKU depth (full vs sample) for daily comparison? |
| Cutover date | When (if ever) legacy system stops being stock source of truth — only after parallel run exit evidence exists |

Record outcomes by updating §4A, §9A, and linking dry-run / verification artifacts.
