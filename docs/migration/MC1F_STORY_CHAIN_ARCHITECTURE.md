# MC-1F — Story Chain Architecture (Deferred)

**Project:** asa-con-v0  
**Status:** Deferred design note only — **no implementation planned**  
**Scope:** Record a possible future workflow architecture for later evaluation  
**Related:**

- [STOCK_DOCUMENT_STORYBOARD.md](../manual/STOCK_DOCUMENT_STORYBOARD.md) — current business stories and Submit/Post rules
- [MC1F_STOCK_DOCUMENT_BUSINESS_VOCABULARY.md](./MC1F_STOCK_DOCUMENT_BUSINESS_VOCABULARY.md) — staff-facing phase titles (when written)
- [MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md](./MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md) — legal entity foundation

**Explicit exclusion:** This idea is **not** part of MC-1A, MC-1D, MC-1E, or MC-1F implementation. No code, schema, migrations, or tests are proposed here.

---

## 1. Why this note exists

During MC-1F vocabulary and storyboard design, we identified a possible future pattern:

> **Submit might do more than change status on one row.**  
> Submit might **lock a business snapshot**, preserve evidence, and **open the next phase** as a distinct linked step.

This document records that idea so it is not lost as vocabulary evolves. It does **not** commit the project to build it.

---

## 2. Core concept

```text
Business Story  ≠  Single Document
```

| Model | Idea |
|-------|------|
| **Current v0 (planned MC-1F)** | One document; status progresses; visible title changes by actor and phase |
| **Future story chain (deferred)** | One business story spans **multiple linked phase documents**; each Submit may freeze the prior phase |

The business story becomes a **chain** — not a single mutable header with a changing label.

---

## 3. Current v0 model (baseline)

Today and in near-term MC-1F work, stock documents follow a **single-document lifecycle**:

```text
DRAFT
  → SUBMITTED
  → CONFIRMED (where applicable)
  → POSTED
```

Characteristics:

- One `StockDocument` row (conceptually) carries the full story.
- Submit updates status and may change the **visible phase title** (e.g. `ASAS • CNT` → `ASAS • ADJ`).
- Lines on the same document can be edited only while policy allows (typically DRAFT).
- Post finalizes the story and writes inventory impact.

This model is sufficient for MC-1F vocabulary and UI design. The story chain is an **alternative architecture**, not a correction of the baseline.

---

## 4. Future story chain model (deferred)

### 4.1 Submit as phase handoff with snapshot

Instead of only advancing status on one document, **Submit** could:

1. **Lock** the current phase — no further edits to that phase’s lines or quantities.
2. **Generate evidence** — e.g. PDF snapshot of what was submitted.
3. **Create or activate** the next phase document — new active work item for the next actor.
4. **Link** the new phase to the prior phase (and to a shared business story identifier).

### 4.2 Example — stock count chain

```text
ASAS • CNT                    Active phase document
    Shop enters physical counts
         │
         │  Submit
         ▼
Locked CNT snapshot           Prior phase immutable
PDF evidence generated        Audit / training / dispute reference
         │
         ▼
ASAS • ADJ                    New active phase document
    Finance reviews variance
         │
         │  Submit (if multi-step) or Post
         ▼
Locked ADJ snapshot
PDF evidence generated
         │
         ▼
Post                          Story complete; ledger updated
```

CNT and ADJ remain **one business story** to staff — but **two (or more) linked phase artifacts** in storage.

### 4.3 Example — supplier purchase chain

```text
ASAD • ORD  →  (Submit + snapshot)  →  ASAD • ORS  →  (Submit + snapshot)  →  ASAD • ORI  →  Post
```

Supplier portal interaction may sit between ORD and ORS; each handoff could freeze what was known at that moment.

### 4.4 Example — shop replenishment chain

```text
ASAS • ORD  →  (Submit + snapshot)  →  ASAD • DEY  →  (Ship + snapshot)  →  ASAS • ORI  →  Post
```

Same narrative as [Story 1 in the storyboard manual](../manual/STOCK_DOCUMENT_STORYBOARD.md), but each arrow might be a **new linked phase document** rather than a title change on one row.

### 4.5 Diagram — single document vs chain

```mermaid
flowchart TB
  subgraph current [Current v0 model]
    doc1[One document]
    doc1 --> s1[DRAFT]
    s1 --> s2[SUBMITTED]
    s2 --> s3[CONFIRMED]
    s3 --> s4[POSTED]
  end

  subgraph future [Deferred story chain model]
    story[BusinessStory]
    p1[CNT phase doc]
    p2[ADJ phase doc]
    snap1[Locked snapshot + PDF]
    snap2[Locked snapshot + PDF]
    story --> p1
    p1 -->|Submit| snap1
    snap1 --> p2
    p2 -->|Submit| snap2
    snap2 -->|Post| done[Story complete]
  end
```

---

## 5. Story chain examples (vocabulary-aligned)

These mirror the three operational stories in the storyboard manual. Chains show **phase sequence**; Post still completes the story.

### Story A — Stock count

```text
CNT  →  ADJ  →  POST
```

| Phase | Actor (typical) | Handoff on Submit |
|-------|-----------------|-------------------|
| CNT | Shop staff | Lock count lines; evidence PDF; open ADJ phase |
| ADJ | ASAD finance | Lock review; evidence PDF; ready for Post |
| POST | ASAD finance | Finalize inventory; close business story |

### Story B — Supplier purchase

```text
ORD  →  ORS  →  ORI  →  POST
```

| Phase | Actor (typical) | Handoff on Submit |
|-------|-----------------|-------------------|
| ORD | ASAD operations | Lock PO; supplier link; open ORS track |
| ORS | Supplier / ASAD | Lock confirmed quantities; open ORI |
| ORI | ASAD operations | Lock receipt count; ready for Post |
| POST | ASAD finance | Finalize inventory; close business story |

### Story C — Shop replenishment

```text
ORD  →  DEY  →  ORI  →  POST
```

| Phase | Actor (typical) | Handoff on Submit / Ship |
|-------|-----------------|--------------------------|
| ORD | Shop staff | Lock shop request; open DEY at ASAD |
| DEY | ASAD operations | Lock shipment prep; ship; open ORI at shop |
| ORI | Shop staff | Lock receipt confirmation; ready for Post |
| POST | ASAD finance / ops | Finalize; close business story |

---

## 6. Potential metadata (concept only)

If story chains were ever evaluated in a future phase, designers might need **conceptual** fields. **This section does not propose schema changes.**

| Concept | Purpose |
|---------|---------|
| **BusinessStoryId** | Stable identifier for the full narrative across phases |
| **PreviousPhaseDocumentId** | Link to the prior phase artifact in the chain |
| **PhaseNumber** | Order within the story (1 = CNT, 2 = ADJ, …) |
| **SnapshotPdfPath** | Reference to evidence generated at Submit (path, object key, or print job id — TBD) |

Additional concepts that might be discussed later (not specified now):

- Phase vocabulary code at time of lock (ORD, CNT, …)
- Actor and legal entity at handoff
- Immutable line payload hash for tamper detection

---

## 7. Benefits (why consider this later)

| # | Benefit | Explanation |
|---|---------|-------------|
| 1 | **Strong audit trail** | Original phase cannot be modified after handoff; disputes reference frozen content. |
| 2 | **Evidence preservation** | Each Submit can automatically produce PDF (or equivalent) evidence without a separate manual export step. |
| 3 | **Clear responsibility transfer** | Each phase document has one primary actor; queues filter by active phase only. |
| 4 | **Historical reconstruction** | Full business story can be replayed from ordered snapshots — useful for training, audits, and migration validation. |
| 5 | **Alignment with vocabulary** | Phase titles (CNT, ADJ, ORD, …) map naturally to **distinct artifacts** rather than title rewrites on one row. |

---

## 8. Risks (why this stays deferred)

| # | Risk | Explanation |
|---|------|-------------|
| 1 | **Storage growth** | Each phase + PDF snapshot multiplies rows and files per business event. |
| 2 | **Workflow complexity** | More documents to list, search, cancel, and explain to staff; edge cases multiply (partial chains, rework). |
| 3 | **Migration effort** | Legacy and v0 single-document data do not map 1:1 without transformation rules and parallel-run reconciliation. |
| 4 | **Report implications** | Operational dashboards, finance close evidence, and stock reconciliation must agree on “one story” vs “many phase docs.” |
| 5 | **Implementation cost** | New APIs, UI navigation, print pipeline, and policy for voiding/reopening chains — far beyond MC-1F vocabulary scope. |
| 6 | **Overlap with existing design** | MC-1F already achieves phase clarity via **presentation-layer titles** on one document; chains may be unnecessary if audit needs are met elsewhere. |

---

## 9. Relationship to MC-1F vocabulary work

| Topic | MC-1F (current) | Story chain (deferred) |
|-------|-----------------|------------------------|
| Staff-facing titles | Derived from actor + phase on **one document** | One title per **phase document** |
| Submit | Changes phase / status; story continues | Locks phase; may spawn next document |
| Post | Completes story on **one document** | Completes story on **chain** (likely last phase or story header) |
| Training manual | [STOCK_DOCUMENT_STORYBOARD.md](../manual/STOCK_DOCUMENT_STORYBOARD.md) | Would need revision if chains adopted |
| PDF evidence | Print from read model (existing direction) | Automatic snapshot per Submit (new capability) |

MC-1F vocabulary and storyboard remain valid **whether or not** story chains are ever built. Vocabulary describes **business phases**; storage can be one document or many.

---

## 10. Status and decision

| Item | Decision |
|------|----------|
| Implementation | **None planned** |
| Schema changes | **None** |
| MC-1A / MC-1D / MC-1E / MC-1F | **Out of scope** |
| Revisit trigger | Future audit requirement, regulatory evidence demand, or repeated production disputes over mutable submitted documents |
| Next step if revived | Separate design phase (e.g. MC-2x) with cost estimate, migration impact, and owner sign-off |

**No implementation is planned now.** This file exists only to preserve the idea for future evaluation.

---

## Document history

| Date | Change |
|------|--------|
| 2026-06-12 | Initial deferred architecture note (MC-1F addendum) |
