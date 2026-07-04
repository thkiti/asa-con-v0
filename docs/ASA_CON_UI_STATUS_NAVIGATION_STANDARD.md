# ASA-CON UI Status & Navigation Standard

Status: **Active project rule (adopt gradually)**  
Scope: All ASA-CON modules — Finance, POS, Inventory, Master Data, Admin, and future surfaces.

This document defines a shared visual language for **status indication** and **page back navigation**. The goal is cleaner screens, less text clutter, and a modern ERP feel where users learn color meaning once and reuse it everywhere.

Related:

- [FINANCE_PRESENTATION_CONTRACT.md](./FINANCE_PRESENTATION_CONTRACT.md) — posted finance voucher presentation rules
- [POS_UI_ARCHITECTURE_V2.md](./POS_UI_ARCHITECTURE_V2.md) — POS screen structure
- [02_FOLDER_CONVENTIONS.md](./02_FOLDER_CONVENTIONS.md) — where shared UI components live

---

## 1. Traffic Light Status Indicator

Use a **small circular status dot** on the main screen. Do **not** show a status text label unless the page already requires a dedicated status column (for example inquiry list tables where status is a first-class field).

### Colors and meaning

| Color | Name | Meaning |
|-------|------|---------|
| **Red** | Action Required | New, not reviewed, missing evidence, variance, error, or any state that needs user action |
| **Yellow** | In Progress | Draft, submitted, waiting for review, waiting for documents, partially complete |
| **Green** | Completed / OK | Posted, approved, reconciled, verified, hard closed, completed successfully |

These three meanings are **global**. They apply identically across Finance, POS, Inventory, Master Data, and Admin.

**Do not invent module-specific color meanings.** If a status does not fit red, yellow, or green under these definitions, resolve the business mapping first — do not add a fourth traffic-light color.

### Visual rules

| Rule | Requirement |
|------|-------------|
| Dot size | Approximately **10–12px** diameter |
| Label on main screen | **No visible status text** unless the page already has a status column |
| Tooltip | **Required on every dot** — explains the exact business status in plain language |
| Accessibility | Dot must have an accessible name (tooltip/`title`, `aria-label`, or visually hidden text) |
| Consistency | Same color semantics everywhere — no Finance-only or POS-only interpretations |

### Examples (mapping business status → dot)

| Business status | Dot | Tooltip example |
|-----------------|-----|-----------------|
| Draft voucher | Yellow | `Draft — not yet submitted` |
| Submitted, awaiting confirm | Yellow | `Submitted — awaiting confirmation` |
| Posted journal | Green | `Posted` |
| Missing archived PDF | Red | `PDF not archived — upload required` |
| Reconciliation variance | Red | `Variance — action required` |
| Reconciled / matched | Green | `Reconciled` |
| Period hard closed | Green | `Period hard closed` |
| Stock count in progress | Yellow | `Count in progress` |
| Evidence pending upload | Red | `Evidence missing` |

When a list row already shows a textual Status column, the dot may appear **in that column** instead of duplicating text elsewhere on the row.

### Current codebase note

Voucher inquiry already uses archive/PDF indicator dots (`finance-pdf-indicator-*` in `lib/finance-ui/finance-visual-classes.ts`). New work should converge on `TrafficLightStatusDot` rather than adding one-off dot styles.

---

## 2. Navigation / Back Action

Replace text back links such as:

- `← Finance`
- `← Back`
- `Back to Dashboard`

with a **small red circular navigation button**.

### Meaning

| Element | Meaning |
|---------|---------|
| Red circular button | **Back** — return to the previous page |
| Tooltip | `Back` |
| Primary action | Browser-style previous-page navigation where appropriate (`router.back()` / history) |
| Fallback | When previous page is unavailable or not meaningful, navigate to the module dashboard or documented parent page |

### Rules

| Rule | Requirement |
|------|-------------|
| Button label | **No text label** on the button itself |
| Tooltip | **`Back`** (or a slightly more specific tooltip only when the fallback target is fixed, e.g. `Back to Finance`) |
| Placement | Consistently near the **top-right** or the module’s standard page-action area |
| Component | Use the **same shared component** everywhere — no page-specific back link markup |
| Login → Main Menu | **Do not** show a back button |
| Main Menu module hubs | Show the red back button **only when** returning to the previous page is meaningful |

### Fallback guidance

| Context | Preferred behavior |
|---------|-------------------|
| Detail page opened from inquiry list | `router.back()` when history exists |
| Deep-linked detail (no history) | Navigate to module parent (e.g. `/finance`, `/master`) |
| Report / journal read-only page | Module dashboard or finance hub per [03_DOMAIN_MAP.md](./03_DOMAIN_MAP.md) |
| Print view | Hide back control (`print:hidden`) |

### Current codebase note

Many finance pages still use text links (`← Finance`, `FinanceDashboardBackLink`). These are **legacy** and should be replaced with `PageBackDotButton` when those pages are touched — not in a single bulk refactor.

---

## 3. Component Proposal

Introduce two reusable UI components. Use them instead of page-specific dots and back links.

### `TrafficLightStatusDot`

**Purpose:** Render a traffic-light status indicator with mandatory tooltip.

**Suggested location:** `components/ui/TrafficLightStatusDot.tsx`

**Props (proposed):**

| Prop | Type | Description |
|------|------|-------------|
| `status` | `"action_required" \| "in_progress" \| "completed"` | Maps to red / yellow / green |
| `tooltip` | `string` | Exact business status shown on hover/focus |
| `className` | `string?` | Optional layout wrapper |
| `testId` | `string?` | For tests |

**Behavior:**

- Renders a 10–12px circle with the correct semantic color token (light + dark theme).
- Exposes accessible name from `tooltip`.
- Does not render adjacent status text unless the parent explicitly renders a status column.

### `PageBackDotButton`

**Purpose:** Standard red circular back control.

**Suggested location:** `components/ui/PageBackDotButton.tsx`

**Props (proposed):**

| Prop | Type | Description |
|------|------|-------------|
| `fallbackHref` | `string?` | Used when `router.back()` is not appropriate or history is empty |
| `className` | `string?` | Optional placement wrapper |
| `testId` | `string?` | For tests |

**Behavior:**

- Renders a small red circular button, no visible text.
- Tooltip: `Back`.
- On click: prefer `router.back()` when navigation history exists; otherwise navigate to `fallbackHref`.
- Hidden in print (`print:hidden`).
- Must not appear on Login or root Main Menu entry.

### Shared styling

- Define color tokens and sizes once (CSS variables or theme classes in `app/globals.css` / `lib/theme/`).
- Dark finance pages must use the same tokens — no separate light-only palette.
- Both components should be theme-aware (`data-theme="dark"` compatible).

---

## 4. Migration Strategy

**Do not update every page at once.** Apply this standard gradually when touching a page for other work.

### Priority surfaces (migrate when edited)

| Area | Example routes / pages |
|------|------------------------|
| Finance — bank & cash | Bank Cash Journal (`/finance/bank-cash`), Bank Reconciliation |
| Finance — periods | Accounting Period list and detail |
| Finance — inquiry | Voucher Inquiry, journal entry inquiry |
| Inventory | Stock Count |
| Master / HR | Staff Evidence |
| Document vault | Document Archive inquiry and detail |
| POS | POS admin and inquiry screens |

### Migration checklist (per page)

1. Replace text back links with `PageBackDotButton` (set `fallbackHref` to module parent).
2. Replace ad-hoc status badges/dots with `TrafficLightStatusDot` where a dot is sufficient.
3. Keep existing status **columns** on inquiry tables; swap inline indicators to the shared dot + tooltip.
4. Verify tooltips describe the **exact** business status, not just the color name.
5. Add or update component tests for dot accessibility and back fallback behavior.
6. Do **not** change API, schema, or business logic as part of a UI-only migration.

### Out of scope for migration-only PRs

- Rewriting unrelated page layout
- Changing status enums or backend workflow
- Bulk replacement across all finance routes in one change

---

## 5. Design Intent

| Goal | How this standard helps |
|------|-------------------------|
| Cleaner screens | Removes redundant “← Finance” / “Back” text and inline status labels |
| Less text clutter | Status communicated by color; detail on demand via tooltip |
| Modern ERP feel | Consistent iconography similar to contemporary operational systems |
| Consistent visual language | One red/yellow/green vocabulary across modules |
| Learn once, reuse everywhere | Users do not re-learn Finance vs POS vs Inventory color rules |

### Non-goals

- This standard does **not** replace structured status columns on inquiry/search screens where sortable/filterable status text is required.
- This standard does **not** define workflow transitions or posting rules — only how status is **shown**.
- This standard does **not** mandate immediate removal of all legacy back links; migration is incremental.

---

## 6. Compliance

Any new page or significant UI edit in ASA-CON should:

1. Use `TrafficLightStatusDot` for traffic-light status indication.
2. Use `PageBackDotButton` for back navigation.
3. Map business statuses to red / yellow / green using the definitions in §1 — no module-specific overrides.
4. Document exceptions in the PR if a page cannot comply yet, with a follow-up migration note.

When in doubt, prefer **tooltip clarity** over **color alone**. The dot attracts attention; the tooltip carries the precise meaning.
