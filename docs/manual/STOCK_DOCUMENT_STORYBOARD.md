# Stock Document Storyboard — Business Operations Manual

**Project:** asa-con-v0  
**Status:** Design / training reference only  
**Audience:** Owner, managers, future staff trainers, future developers  
**Related:** [MC1F_STOCK_DOCUMENT_BUSINESS_VOCABULARY.md](../migration/MC1F_STOCK_DOCUMENT_BUSINESS_VOCABULARY.md) (technical vocabulary mapping — separate document)

---

## How to read this manual

Stock documents tell a **continuous business story**. The same document can show different titles depending on:

- **Who** is looking at it (shop staff, head office, supplier)
- **What step** the workflow is on
- **Which company** is acting at that step (ASAS or ASAD)

The question this manual answers:

> **Who presses Submit, and what does the document become next?**

Titles use the pattern **`Company • Code`** — for example, `ASAS • ORD` means “ASAS shop order.”

| Company code | Business name |
|--------------|-----------------|
| ASAS | Retail / shop operations |
| ASAD | Distribution / head office / purchasing |

This manual uses **business language only**. Technical storage names appear only in a short appendix at the end.

---

## Submit changes the phase. Post completes the story.

This is the most important rule in the manual.

### What each stage means

| Stage | Business meaning |
|-------|------------------|
| **Draft** | The current actor is still preparing the document. Work is not ready to hand off. |
| **Submit** | The current actor hands the document to the next actor or the next responsibility. The story continues. |
| **After Submit** | The visible title may change — because the business phase changed, not because a new document was created. |
| **Post** | The document is finalized. The business story is complete. Inventory and accounts are updated. |
| **Submitted but never posted** | The flow is still **unfinished**. The document remains pending work. |

### Simple rules

1. **Submit does not finish the story.** It only changes who is responsible next.
2. **Post finishes the story.** A document is not complete until Post.
3. **Title and status are different things.** The page title shows the business phase (`ASAS • CNT`). A separate status badge shows where the document is in the workflow (Draft, Submitted, Confirmed, Posted).

### Action rule table

| Action | Meaning | Does the story finish? | Can title change? |
|--------|---------|------------------------|-------------------|
| **Save** | Keeps the current phase; work in progress | No | No |
| **Submit** | Hands to next actor / next responsibility | No | Yes |
| **Confirm** | Approves or confirms the current phase | No | Maybe |
| **Post** | Finalizes the business story | Yes | No — story becomes completed |

---

## Phase change examples

These three examples show the same principle: **Submit moves the story forward; Post closes it.**

### Example A — Stock count

```text
ASAS • CNT          Draft counting phase
        │
        │  Submit
        ▼
ASAS • ADJ          Adjustment review phase
        │
        │  Confirm / Post
        ▼
Completed
```

**CNT and ADJ are the same document.** The title changes because business responsibility changes — from “count the floor” to “review and adjust the system.” Submit does not complete the story; Post does.

### Example B — Supplier purchase

```text
ASAD • ORD          ASAD creates purchase order
        │
        │  Submit
        ▼
Supplier receives link
Supplier confirms / edits actual quantity
        │
        │  Submit
        ▼
ASAD • ORS          Supplier sent / confirmed quantity
        │
        │  Receive and count
        ▼
ASAD • ORI          Goods received into ASAD stock
        │
        │  Post
        ▼
Completed
```

Each Submit hands work to the next party. Only Post marks the story finished.

### Example C — Shop replenishment

```text
ASAS • ORD          Shop requests goods
        │
        │  Submit
        ▼
ASAD • DEY          ASAD prepares delivery
        │
        │  Ship
        ▼
ASAS • ORI          Shop receives goods
        │
        │  Post
        ▼
Completed
```

Shop Submit does not close the order. Head office still prepares, ships, and the shop receives. Post finalizes the full story.

---

## Vocabulary catalog

Short codes are **staff-facing phase titles**, not separate document types and not final status. One physical document can pass through several codes as the story progresses.

| Code | Meaning | Who normally uses it | Typical next step |
|------|---------|----------------------|-------------------|
| **ORD** | Order | Shop staff (ASAS) or purchasing staff (ASAD) | Submit → next party takes over |
| **DEY** | Delivery | ASAD head office operations | Ship goods to shop |
| **ORS** | Order Send | ASAD staff; supplier via external link | Supplier confirms shipment quantities |
| **ORI** | Order In | Shop staff (receive from ASAD) or ASAD staff (receive from supplier) | Post → story complete |
| **CNT** | Count | Shop staff during physical stock count | Submit → moves to adjustment phase |
| **ADJ** | Adjustment | ASAD finance (review/post after shop submit) | Post → story complete |

### Vocabulary notes (locked)

- **ORD, ORS, ORI, DEY, CNT, ADJ are phase titles, not final status.** They describe what the business is doing right now.
- **POSTED is a final status, not a vocabulary code.** Staff see “Posted” or “Completed” — not `ASAS • PST` or similar.
- **Do not add PST as a business code for now.** Post is an action and a status; it does not need its own title segment.
- **Submit marks a handoff** — counting is done, order is sent, supplier confirmed, etc. It does not mean “finished.”
- **CNT and ADJ are the same document** at different life stages (see Story 3).

### Design principles (locked)

1. **Do not show internal type names** (such as “Transfer Out”) as the primary screen title.
2. **The entity in the title reflects who is acting**, not always who owns the record in the system.
3. **Post completes the story** — any submitted document still in a work queue is unfinished until posted (where posting applies to that story).

---

## Story 1 — Shop requests goods

**Business intent:** A shop runs low on materials. Staff request replenishment from ASAD head office. ASAD prepares and ships. The shop confirms what arrived. Finance posts to close the story.

This is one document from start to finish. It is not complete until **Post**.

```text
ASAS • ORD
    Shop creates order request
    Actor: Shop staff
    Purpose: Tell head office what the shop needs
         │
         │  Shop presses Submit
         ▼
ASAD • DEY
    Head office prepares and delivers goods
    Actor: ASAD operations staff
    Purpose: Pick, pack, and ship to the shop
         │
         │  Head office presses Ship
         ▼
ASAS • ORI
    Shop receives goods
    Actor: Shop staff
    Purpose: Acknowledge delivery matches what was sent
         │
         │  Post
         ▼
Completed
    Business story finished
```

### Step-by-step

| Step | Visible title | Actor | What they do | Story finished? |
|------|---------------|-------|--------------|-----------------|
| 1 | `ASAS • ORD` | Shop staff | Enter products and quantities needed | No — Submit hands to head office |
| 2 | `ASAD • DEY` | ASAD operations | Review request, prepare and ship | No — Ship hands to shop |
| 3 | `ASAS • ORI` | Shop staff | Confirm goods received | No — Post still required |
| 4 | Completed | ASAD finance / operations | Post | **Yes** |

### What shop staff should understand

- **ORD** = “I am ordering from head office.”
- Submit does **not** mean the order is done — head office still has work (**DEY**).
- **ORI** = “goods arrived; I confirm receipt.” The story still needs Post after that.

### What head office should understand

- When a shop submits, the story becomes **DEY** from ASAD’s perspective.
- A submitted order sitting in the queue is **unfinished** until shipped, received, and posted.
- Post is what closes the business story — not the shop’s first Submit.

---

## Story 2 — Purchase from supplier

**Business intent:** ASAD orders goods from an external supplier. The supplier receives a link, confirms what they will actually ship, ASAD receives and counts goods into inventory, then finance posts.

Not complete until **Post**.

```text
ASAD • ORD
    ASAD creates purchase order
    Actor: ASAD purchasing / operations
    Purpose: Request goods from supplier
         │
         │  ASAD presses Submit
         ▼
Supplier receives link
    Supplier adjusts actual quantities
    Actor: Supplier (external, via secure link)
    Purpose: Confirm what will be shipped (may differ from order)
         │
         │  Supplier presses Submit
         ▼
ASAD • ORS
    Supplier shipment confirmed
    Actor: ASAD staff monitors; supplier already acted
    Purpose: Order is locked for inbound receiving
         │
         │  ASAD receives and counts goods
         ▼
ASAD • ORI
    Goods received into inventory
    Actor: ASAD operations
    Purpose: Physical receipt and count at head office
         │
         │  ASAD presses Post (finance)
         ▼
Completed
    Business story finished
```

### Supplier portal (business concept)

- After ASAD submits a purchase order, the system can generate a **secure external link** for the supplier.
- The supplier does **not** log into the main application.
- They open the link, review line items, and enter **actual quantities they will ship** (which may be less than ordered).
- When the supplier submits, ASAD sees the document as **ORS** — the send is confirmed and ASAD plans receiving.
- Supplier Submit, like all Submits, does **not** finish the story — receiving and Post still remain.

### Step-by-step

| Step | Visible title | Actor | What they do | Story finished? |
|------|---------------|-------|--------------|-----------------|
| 1 | `ASAD • ORD` | ASAD operations | Create PO lines, quantities, supplier | No |
| 2 | (Supplier link) | Supplier | Adjust confirm quantities | No |
| 3 | `ASAD • ORS` | ASAD operations | Track confirmed shipment; prepare receiving | No |
| 4 | `ASAD • ORI` | ASAD operations | Receive and count goods at warehouse | No |
| 5 | Completed | ASAD finance | Post to inventory / accounts | **Yes** |

### What trainers should emphasize

- **ORD** at ASAD is a **supplier** order, not a shop order (shop uses ORD in Story 1).
- **ORS** is the bridge between “ordered” and “physically arriving.”
- **ORI** at ASAD means goods are **in the building** — Post still required to finish.
- **ORI** at ASAS (Story 1) means shop received from head office — same code, different story.

---

## Story 3 — Stock count

**Business intent:** At month end, each shop physically counts stock on hand. After counting is submitted, finance reviews variances and posts adjustments.

**Key idea:** CNT and ADJ are **the same document** at different stages — not two separate documents. Not complete until **Post**.

```text
ASAS • CNT
    Physical counting phase
    Actor: Shop staff
    Purpose: Record what is actually on the shelf / in the van
         │
         │  Shop presses Submit
         ▼
ASAS • ADJ
    Variance review and adjustment phase
    Actor: ASAD finance (active)
    Purpose: Review differences vs system; approve posting
         │
         │  Confirm / Post
         ▼
Completed
    Business story finished
```

### Why two titles for one document?

| Phase | Title | What is happening |
|-------|-------|-------------------|
| Counting | `ASAS • CNT` | Staff walk the floor and enter **physical quantities only**. No variance math required at the counter. |
| After Submit | `ASAS • ADJ` | Counting is **finished**. Responsibility shifts to **review, variance, and posting**. |

**CNT** = “we are still counting.”  
**ADJ** = “count is done; now we adjust the system to match reality (or approved policy).”

Shop Submit changes the phase from CNT to ADJ. It does **not** complete the month-end count — finance must still Post.

### Step-by-step

| Step | Visible title | Actor | What they do | Story finished? |
|------|---------------|-------|--------------|-----------------|
| 1 | `ASAS • CNT` | Shop staff | Enter counted quantities per product | No — Submit hands to finance |
| 2 | `ASAS • ADJ` | ASAD finance | Review variances, calculate adjustment, post | **Yes** after Post |
| 3 | Completed | — | — | — |

### What shop staff should understand

- You only need to worry about **CNT** — count what you see, then Submit.
- After Submit, the title changes to **ADJ**; that is normal. You are not creating a new document.
- Submit does not mean the month count is closed — finance still has work.

### What finance should understand

- **ADJ** means the shop has **declared counting complete** — your work begins here.
- Posting updates official stock and **completes the story**.
- A submitted count waiting in the queue is **unfinished business**.

---

## Story 4 — Future intercompany flow (intent only)

**Status:** Not implemented. Documented here to preserve business intent.

**Possible future story:** When ASAS and ASAD are fully separated at the legal-entity level, a shop order may eventually trigger an explicit intercompany handoff:

```text
ASAS • ORD     Shop requests goods
      ↓
ASAD • DEY     ASAD fulfills and ships
      ↓
ASAS • ORI     Shop confirms receipt
      ↓
Post           Story complete
```

### Why this matters (business, not technical)

- Today, shop replenishment is treated as one operational document that changes titles (Story 1).
- In the future, ownership transfer between **ASAS** (retail) and **ASAD** (distribution) may require separate legal or accounting treatment — for example, when ASAD “sells” to ASAS, not merely “moves” stock.
- The **visible story** may stay the same for staff (ORD → DEY → ORI → Post) even if backend accounting grows more complex.

### What is explicitly out of scope now

- No intercompany pricing rules
- No automatic sales invoice from ASAD to ASAS
- No separate documents for the same shipment

Trainers should teach Story 1 today. Story 4 is a placeholder for when legal-entity separation matures.

---

## Quick reference — Who submits what?

| Story | Who presses Submit first? | Document becomes | Story finished? |
|-------|---------------------------|------------------|-----------------|
| Shop requests goods | Shop staff | `ASAD • DEY` (head office view) | No — Post required |
| Purchase from supplier | ASAD staff | Supplier link, then `ASAD • ORS` | No |
| Purchase from supplier | Supplier (external) | `ASAD • ORS` | No |
| Stock count | Shop staff | `ASAS • ADJ` | No — Post required |

---

## Training notes for managers

1. **Same ref number, different titles** — Staff should recognize the document reference (`TRO-…`, `ADJ-…`) even when the title code changes.
2. **Submit means handoff, not done** — Train staff to Submit only when their part is truly complete, and to expect more steps after.
3. **Post means done** — For stories that require posting, nothing is truly finished until Post.
4. **Pending work is real work** — Submitted documents in queues are not “finished leftovers”; they are active unfinished business.
5. **ORD appears in two stories** — Always clarify *who* is ordering: shop (Story 1) vs ASAD buying from supplier (Story 2).
6. **ORI appears in two stories** — Shop receiving from ASAD (Story 1) vs ASAD receiving from supplier (Story 2). Same code, different actors.
7. **Do not teach internal type names** — Use ORD, DEY, CNT, etc. in training materials.

---

## Guidance for future UI implementation

When the system is built or updated, follow these rules so staff are not misled:

| Rule | Why |
|------|-----|
| **Do not treat Submit as finished** | Staff will stop following up; inventory and accounts will drift. |
| **Keep submitted-but-unposted documents visible in pending work** | Unposted documents are unfinished stories, not archive. |
| **Page title reflects the current business phase** | e.g. `ASAS • CNT`, `ASAD • DEY` — derived from actor + workflow step. |
| **Status badge is separate from title** | Show Draft / Submitted / Confirmed / Posted as a badge — not mixed into the title code. |
| **Title and status are different concepts** | `ASAS • ADJ` + badge “Submitted” is valid — phase title vs workflow position. |
| **Posted documents leave active work queues** | Posted = story complete; move to history or read-only views. |

---

## Appendix — Technical names (developers only)

This appendix exists so developers can connect business vocabulary to the existing system. **Do not use these names in staff training.**

| Business code | Typical internal storage name | Notes |
|---------------|----------------------------|-------|
| Shop ORD / DEY / ORI | Transfer out workflow | One document; status progresses draft → submitted → shipped → confirmed → posted |
| ASAD ORD / ORS / ORI | Purchase or inbound transfer workflow | Supplier path may use purchase or inbound transfer pattern |
| CNT / ADJ | Adjustment workflow | Same document; title changes at submit; post completes |
| Reference numbers | Prefix by family (e.g. TRO, ADJ, PUR) | Shown to staff as ref line, not as primary title |

For full mapping rules (legal entity, actor, status, derivation), see [MC1F_STOCK_DOCUMENT_BUSINESS_VOCABULARY.md](../migration/MC1F_STOCK_DOCUMENT_BUSINESS_VOCABULARY.md).

---

## Document history

| Date | Change |
|------|--------|
| 2026-06-12 | Initial storyboard manual (MC-1F addendum) |
| 2026-06-12 | Submit vs Post rule; action table; phase examples; UI guidance; vocabulary notes |
