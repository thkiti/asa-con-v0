# POS UI Architecture v2

Status: **Adopted layout (June 2026)**  
Scope: POS terminal screen structure — sales, shop tools, document workspace  
Out of scope: checkout logic, barcode flow, permissions, API routes

Related:

- [POS_COMPLETION_ROADMAP.md](./POS_COMPLETION_ROADMAP.md)
- [08_POS_CHECKOUT_ARCHITECTURE.md](./08_POS_CHECKOUT_ARCHITECTURE.md)

---

## Design principle

The POS screen is divided into three logical areas:

| Area | Purpose | Keypad region |
|------|---------|---------------|
| **Sales** | Live selling | Barcode, numeric keypad (cols 3–6), cart panel, CHECKOUT |
| **Shop Tools** | Day-to-day shop operations | Column 2 — inventory & repair (before numeric keypad) |
| **Documents** | Reports & document lookup | Column 7 — opens the orange **Workspace** |

Column 1 holds HO / session utilities (worktime, targets, **collector**, logout).  
Collector stays here — it is an external HO workflow with staff credential gate, not a document-column action.

Staff onboarding (ทำประวัติพนักงาน) uses the shop-tools row-1 blank slot until evidence is complete.

---

## Keypad layout (v2)

### Document column (col 7) — audit / close-day / correction

| Row | Button |
|-----|--------|
| 1 | READ X |
| 2 | READ Z |
| 3 | REFUND |
| 4 | LOOKUP |

Collector is **not** in this column — see staff column (col 1).

### Shop Tools column (col 2)

| Row | Button |
|-----|--------|
| 1 | *(blank — reserved; staff evidence when onboarding)* |
| 2 | ORDER |
| 3 | STOCK COUNT |
| 4 | REPAIR TICKET |

Numeric keypad occupies cols 3–5 (digits) and col 6 (⌫ / C / ENTER).

### Staff / HO column (col 1)

| Row | Button |
|-----|--------|
| 1 | WORKTIME IN/OUT |
| 2 | TARGET VS SALES |
| 3 | COLLECTOR |
| 4 | LOGOUT |

Row 5 also carries the message / clock slot across cols 1–5.

### Sales area (unchanged)

- Barcode capture (top)
- Numeric keypad cols 3–5, rows 1–4
- Cart / receipt panel (right of terminal)
- CHECKOUT bottom row (cols 6–7)

---

## Document Workspace

Document buttons **only open** the orange full-screen Workspace overlay.  
They do not print, save, or search from the keypad.

All document actions happen **inside** the Workspace:

```
Open workspace
    ↓
Input / search / credentials
    ↓
Preview (thermal slip or report)
    ↓
Action (print, save, PDF, close day, …)
    ↓
Return to POS
```

### Workspace flows (by document type)

**READ X** — preview on-screen report → close (no persist).

**READ Z** — preview → **PRINT REPORT** → close day / exit.  
Print is triggered from the Workspace (thermal clone of on-screen slip), not from a document keypad cell.

**REFUND** — search receipt → preview refund ticket → **PRINT REFUND** (save + print + exit).

**COLLECTOR** — select period → preview collector ticket → **PRINT REPORT** (save + print + exit).

**LOOKUP** — search by year/month/running → preview → View PDF / Print PDF.

---

## What stays on the keypad

| Category | Examples | Behaviour |
|----------|----------|-----------|
| Sales | digits, ENTER, CHECKOUT | Cart & payment |
| Shop Tools | ORDER, STOCK COUNT, REPAIR TICKET | Navigate or open shop flows |
| Document openers | READ X/Z, REFUND, LOOKUP | Open Workspace only |
| HO / session | LOGOUT, WORKTIME, TARGET VS SALES, COLLECTOR | Session, targets, HO collect gate |
| Staff onboarding | ทำประวัติพนักงาน | Shop-tools row 1 until evidence complete |

Document actions (print report, process refund, print collector, PDF) **do not** live on the document column.  
The only transitional exception is READ Z **PRINT REPORT** appearing on shop-tools row 1 while a Z report is open, until that action is fully moved into `PosReadReportPanel`.

---

## Visual consistency

Existing button colours are preserved:

| Button | Colour |
|--------|--------|
| READ X | blue |
| READ Z | red / rose |
| REFUND | rose |
| LOOKUP | blue |
| ORDER | green |
| STOCK COUNT | green |
| REPAIR TICKET | sky blue |
| COLLECTOR | amber / brown gradient |
| BLANK | disabled ghost tile |
| CHECKOUT | green `#16A34A` |

All function buttons use the same cell size within the 7×6 grid.

---

## Implementation map

| Concern | Location |
|---------|----------|
| Grid definition | `lib/pos-ui/keypad-layout.ts` |
| Render / placeholders | `components/pos/PosKeypadGrid.tsx` |
| Workspace overlays | `components/pos/PosShell.tsx` → `PosReceiptPanel` overlay slot |
| Action routing | `components/pos/PosTerminalPage.tsx` + `lib/pos-ui/pos-actions.ts` |

---

## Out of scope (v2)

- Checkout redesign
- Barcode capture redesign
- Numeric keypad redesign
- Business rules, numbering, permissions, or API contracts
