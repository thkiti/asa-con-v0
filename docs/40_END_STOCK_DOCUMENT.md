# END Stock Document

Status: **Implemented (domain + shop UI)**  
Scope: Period-end quantity worksheet (`DocType.END`) for ASAS / ASAD

---

## Purpose

END is a **locked period quantity summary** for one legal entity + branch + `periodMonth`.

It aggregates operational source documents into per-product BEGIN / IN / USAGE / COUNT / ENDING / ADJ lines and sales summary totals. It does **not** mutate live `Stock` / `StockLayer`, create `StockTransaction`, calculate cost, or post inventory Finance entries.

See also: [architecture/02_PERIOD_STOCK_LEDGER_DECISION.md](./architecture/02_PERIOD_STOCK_LEDGER_DECISION.md).

---

## Source rules

| Source | Document | Contribution | Notes |
|--------|----------|--------------|-------|
| REC | Completed `Sale` / `SaleItem` (AS shop END only) | USAGE for `TRACKED` items | `CONSUMABLE` sales go to **untrackable sales** only — never USAGE qty |
| REF | `Refund` | Sales summary **REFUND** total only | Never added to USAGE maps |
| DEY | `TRANSFER_OUT` with `shopReceivedAt` set | AS shop (`toLocId`): **IN**; AD HO (`fromLocId`): **USAGE** | Qty = `receivedQty ?? qty` |
| CNT | Latest POSTED `ADJUSTMENT` for branch+period | COUNT | Multiple POSTED CNT → warning, latest `postedAt` wins |
| PURCHASE / TRANSFER_IN | POSTED into HO (AD only) | IN | ASAD HO END |

Rebuild never reads `Stock`, `StockLayer`, or `StockTransaction`.

---

## Formulas

Per product line:

```
ACTUAL  = BEGIN + IN - USAGE
ENDING  = COUNT          (null when COUNT missing)
ADJ Qty = ENDING - ACTUAL  (null when ENDING null)
ADJ Amount = ADJ Qty × sellingPriceSnapshot  (money scale 2)
```

Document totals:

- `endTrackableSales` / `endUntrackableSales` / `endTotalSales` / `endRefundsTotal`
- `endTotalAdjAmount` = sum of line ADJ Amounts

---

## 2026-01 initialization

- Initial END period is **`2026-01`** (`INITIAL_END_PERIOD`).
- CSV import is allowed **only** for `2026-01` (HO_ADMIN / HO_OPERATIONS).
- Required columns: `Product Code`, `BEGIN Qty`; optional `COUNT Qty`.
- Apply sets `beginManual` (and `countManual` when COUNT present), then rebuilds.
- When no POSTED CNT exists for 2026-01, every line must have manual COUNT (or completeness blocks lock/submit).

---

## Carry-forward

For periods after 2026-01:

- Prior period END must be **LOCKED**.
- BEGIN for each product = prior ENDING (unless `beginManual` on the current line).
- Missing / unlocked prior END is a completeness **blocker**.

---

## Rebuild

- Allowed while `endStatus !== LOCKED`.
- Deletes and recreates `EndLine` + `EndSourceContribution` from sources.
- Preserves manual BEGIN / COUNT flags and quantities across rebuild.
- Increments `endSourceRebuildVersion`, sets `endRebuiltAt`.
- Idempotent for the same source snapshot (same lines / contributions).

---

## Lock / reopen

| Action | Roles | Effect |
|--------|-------|--------|
| Submit | HO_ADMIN / HO_FINANCE / HO_OPERATIONS | `DRAFT` → `READY_FOR_REVIEW` (completeness must pass) |
| Lock | HO_ADMIN / HO_FINANCE / HO_OPERATIONS | Sets `endStatus=LOCKED`, `endLockedAt` — **no** StockTransaction / issueStock / Finance inventory |
| Reopen | HO_ADMIN / HO_FINANCE only | Requires non-empty reason; clears lock; blocked if a later-period END exists or period is HARD_CLOSED |

`POSTABLE_BY_DOC_TYPE.END` is empty — END is never `postDocument`'d.

---

## DEY `shopReceivedAt` limitation

END IN/USAGE from DEY requires `StockDocument.shopReceivedAt` on the transfer.

- Shop receipt confirmation (`confirmShopReceipt`) sets `receivedQty` on lines and `shopReceivedAt` / `shopReceivedByStaffId` on the TRANSFER_OUT.
- Transfers without `shopReceivedAt` are **invisible** to END rebuild for that period.
- Status may move to `RECEIVED` when the workflow transition allows; confirmation still stamps `shopReceivedAt` even when status cannot change.

---

## UI / API

- Shop detail: `/shop/stock-documents/end/[id]`
- List filter kind: `END • สต็อกสิ้นงวด`
- HO list action: **Open / Create END** → `POST /api/stock-document/end/get-or-create`
- Domain: `lib/stock/end/*`
- Thin routes: `app/api/stock-document/end/*`

---

## Related

- [ARCHITECTURE_GUARDS.md](./ARCHITECTURE_GUARDS.md)
- [29_STOCK_DOCUMENT_WORKFLOW.md](./29_STOCK_DOCUMENT_WORKFLOW.md)
- [07_STOCK_DOCUMENT_POSTING.md](./07_STOCK_DOCUMENT_POSTING.md)
