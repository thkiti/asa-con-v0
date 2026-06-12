# MC-1A — Minimal LegalEntity Layer Design Review

Project: `asa-con-v0`  
Status: Design review only  
Scope: Minimal LegalEntity layer for two legal entities in one application / one database

---

## 1. Business assumptions

### Finalized architecture decision

The project will continue with:

- One database
- One application
- One deployment
- Shared master data
- Two legal entities

The project will **not** use:

- Duplicate databases
- Duplicate deployments
- Duplicate product masters
- Duplicate staff masters

### Legal entities

| Code | Legal entity |
|---|---|
| `AD` | ASAD |
| `AS` | ASAS |

### Shared areas

The following remain shared masters / shared operational references:

- Office
- Staff
- Product master
- Supplier / customer references
- HO control
- Operational users

### Separated areas

The following must be separated by legal entity:

- Accounting documents
- Tax identity
- VAT
- Financial statements
- Retained earnings
- Legal entity reporting

### Business model

#### ASAD / AD

ASAD owns the import / purchase / material side:

- Import
- Supplier purchases
- Material ownership
- Distribution
- Sells mainly to ASAS

#### ASAS / AS

ASAS owns the retail / service / shop side:

- Retail
- Services
- POS
- Shops
- Customer-facing operations

### POS and SHOP facts

- POS is **AS only**.
- SHOP operations are **AS only**.
- SHOP stock counts are **AS only**.
- ASAD does **not** use full POS.

### Core principle

`Branch / location` is **not the same thing as** `document owner`.

A HO user may work under branch `HO999`, but create documents for either:

- `AS` / ASAS
- `AD` / ASAD

Therefore legal entity ownership must be attached to documents / accounting scope, not blindly inferred from branch.

---

## 2. LegalEntity model proposal

### Smallest possible model

The smallest viable `LegalEntity` model is:

```prisma
model LegalEntity {
  code    String @id
  name    String
  address String?
  taxId   String?
}
```

Recommended seed rows:

| code | name |
|---|---|
| `AS` | ASAS |
| `AD` | ASAD |

### Field review

| Field | Required? | Reason |
|---|---:|---|
| `code` | Yes | Stable business identifier used in session, documents, reports, imports. |
| `name` | Yes | Display name for UI, print, reports. |
| `address` | Yes, nullable initially | Needed for tax identity / document print, but can be nullable during transition. |
| `taxId` | Yes, nullable initially | Needed for VAT / tax identity, but can be nullable during transition. |

### Not recommended for MC-1A

Do **not** add the following unless a later phase proves the need:

- Company hierarchy
- Consolidation group model
- Currency
- Fiscal calendar per entity
- VAT registration tables
- Legal representative fields
- Separate chart of accounts per entity
- Separate branch ownership model
- Complex intercompany rules

### Conclusion

Yes, `LegalEntity` can contain only:

- `code`
- `name`
- `address`
- `taxId`

and still satisfy the immediate needs for:

- Document ownership
- Tax identity
- Migration separation
- Entity-level reporting

The key requirement is not a large master table. The key requirement is that finance / stock documents carry a reliable `legalEntityCode` / `entityCode` field.

---

## 3. Session proposal

### Required session fields

Session should continue storing branch context and add document entity context:

```ts
session = {
  branchId,
  branchCode,
  documentEntityCode // "AS" | "AD"
}
```

### Meaning of `documentEntityCode`

`documentEntityCode` means:

> The legal entity under which newly created documents will be owned.

It does **not** mean:

- The user's employer
- The physical branch owner
- The branch's legal entity
- The product owner
- The database tenant

### Login behavior

Current flow:

```text
Staff ID → Branch HO999
```

New behavior:

```text
Staff ID → Branch
          └─ if Branch = HO999 and role is allowed:
                show entity toggle
                default ASAS
```

### HO toggle rules

If branch is `HO999` and user role is HO finance/admin-capable:

- Show entity toggle.
- Default selected entity: `AS` / ASAS.
- User may switch to `AD` / ASAD.
- Persist selected value to session as `documentEntityCode`.

If branch is not `HO999`:

- Do not show toggle.
- Force `documentEntityCode = AS`.

If user is SHOP user:

- Do not show toggle.
- Force `documentEntityCode = AS`.

### Persistence

Recommended persistence:

- Store `documentEntityCode` inside the authenticated session / session payload.
- Treat it as the default context for document creation.
- Also write it onto each created document as immutable document ownership.

Important distinction:

- Session value = current working default
- Document value = permanent ownership record

Changing the session after login must not change existing documents.

### Validation requirement

Every create endpoint for legal-entity-sensitive documents must validate:

- User is allowed to create documents for requested entity.
- SHOP/POS users cannot create `AD` documents.
- POS always uses `AS` regardless of session toggle.
- HO finance/admin may create `AD` or `AS` documents when working from `HO999`.

---

## 4. Branch relationship

### Question

Should `Branch` have `legalEntityId`?

### Recommendation

For MC-1A, **do not make Branch the source of document legal entity ownership**.

The safest design is:

- Keep `documentEntityCode` independent from branch.
- Add legal entity ownership directly to documents that require separation.
- Optionally add a branch default later, but never rely on it as the legal owner for all documents.

### Reason

`HO999` may create both `AD` and `AS` documents.

If `Branch.legalEntityId` becomes the main ownership source, then HO will either:

1. Incorrectly belong to one entity only, or
2. Need complicated override logic, or
3. Reintroduce hidden multi-company ERP behavior.

That contradicts the core principle:

> Branch / location ≠ Document owner

### Optional future field

A future field may be useful:

```prisma
Branch.defaultLegalEntityCode String?
```

But it should be treated only as a defaulting hint, not as accounting truth.

### MC-1A answer

For the minimum implementation:

- `Branch.legalEntityId` is **not required**.
- `documentEntityCode` should remain independent from branch.
- Documents must own their legal entity explicitly.

---

## 5. Finance impact

### Principle

Finance reports and period control must be legal-entity aware.

Financial statements must be able to answer:

- AS only
- AD only
- Consolidated

Therefore the finance posting layer must have reliable legal entity ownership.

### Objects that must know legal entity directly

The following should have direct legal entity ownership:

| Object | Required? | Reason |
|---|---:|---|
| `Voucher` | Yes | Primary accounting document / audit source. |
| `JournalEntry` | Yes | Posting and reporting must filter by entity. |
| `AccountingPeriod` | Yes | Period close/reopen must be per legal entity. |
| Closing Entry | Yes | Retained earnings and close evidence are entity-specific. |
| Opening Journal Import | Yes | ASAD and ASAS opening balances must not mix. |

### Objects that may derive legal entity

The following may derive entity if they are always children of an entity-owned parent:

| Object | Can derive from |
|---|---|
| Journal lines | `JournalEntry.legalEntityCode` |
| Voucher lines | `Voucher.legalEntityCode` |
| Close evidence detail rows | Accounting period / closing entry |
| Report rows | JournalEntry / AccountingPeriod filter |

### Voucher vs JournalEntry

Recommended minimum:

- `Voucher.legalEntityCode`
- `JournalEntry.legalEntityCode`

Even if JournalEntry can theoretically derive from Voucher, storing it directly on JournalEntry is safer for:

- Trial balance
- Income statement
- Balance sheet
- Close process
- Audit queries
- Migration imports

This avoids expensive or ambiguous joins during reporting.

### AccountingPeriod

Accounting periods should be scoped per legal entity.

Recommended unique shape:

```text
legalEntityCode + year + month
```

or equivalent existing period key plus entity.

Reason:

- AS and AD may close at different times.
- Retained earnings are separate.
- Reopen approval / close evidence should not cross entity boundaries.

### Reports

Report filters should support:

```ts
entityScope: "AS" | "AD" | "CONSOLIDATED"
```

Implementation behavior:

- `AS`: filter journal entries by `legalEntityCode = "AS"`
- `AD`: filter journal entries by `legalEntityCode = "AD"`
- `CONSOLIDATED`: include both, then aggregate

For MC-1A, consolidated can be a future report mode, but the schema should not block it.

---

## 6. Stock impact

### Principle

Stock location and legal ownership are related but not identical.

Stock documents must be separated by legal entity when they represent ownership / accounting impact.

### Objects that must know legal entity directly

| Object | Required? | Reason |
|---|---:|---|
| `StockDocument` | Yes | Header ownership, workflow, audit, import separation. |
| Stock posting / ledger header or row | Yes, if ledger is queried directly | Inventory valuation and ownership reports must filter by entity. |
| Inventory opening import | Yes | Opening stock for AD and AS must not mix. |

### StockDocument

Recommended minimum:

```text
StockDocument.legalEntityCode
```

Rules:

- SHOP stock documents: always `AS`.
- POS-related stock movement: always `AS`.
- HO finance/admin stock documents: use session `documentEntityCode`.
- AD stock documents: allowed only from HO/admin paths, not SHOP POS paths.

### Stock posting

If existing stock ledger / posting rows are normally queried through `StockDocument`, they can technically derive legal entity from the document.

However, for safer reporting and migration validation, recommended minimum is:

- Store legal entity on `StockDocument`.
- Ensure stock posting queries join/filter by `StockDocument.legalEntityCode`.
- Add direct ledger-level legal entity only if the ledger is heavily queried without document joins.

### Inventory opening

Opening stock import must be entity-scoped.

Required import input:

```text
legalEntityCode, location, product, quantity, cost/value if applicable
```

Rules:

- ASAS opening stock import → `AS`
- ASAD opening stock import → `AD`
- Opening stock document numbers should be entity-distinguishable.
- Validation must reject rows without entity.

### Transfer caution

Transfers should not silently move ownership between AD and AS.

If AD sells/transfers material to AS, that is not merely a branch transfer. It is an intercompany legal event and should be represented by proper documents later.

For MC-1A, do not implement intercompany automation. Only ensure documents are entity-owned so future intercompany logic has a safe base.

---

## 7. Migration impact

### Can M2 proceed after MC-1A?

M2 can proceed only after the minimum legal entity foundation exists.

MC-1A is a design review. It creates no schema and no DB writes. Therefore M2 should not import legal opening balances until the actual minimal implementation phase is complete.

### Required before ASAD opening journal import

- `LegalEntity` master exists with `AD` and `AS`.
- `AccountingPeriod` is entity-scoped.
- `Voucher` / `JournalEntry` can store `legalEntityCode`.
- Import tool requires `legalEntityCode = AD`.
- Reports can filter `AD`.
- Close/open period validation checks `AD` period, not global period.

### Required before ASAS opening journal import

- Same as ASAD, but `legalEntityCode = AS`.
- POS/shop-generated finance remains forced to `AS`.
- Reports can filter `AS`.

### Required before opening stock import

- `StockDocument` can store `legalEntityCode`.
- Opening stock import requires legal entity.
- Stock posting/reporting can filter by document entity.
- SHOP/POS stock flows remain forced to `AS`.

### Migration safety rule

Every migration import batch must declare legal entity at batch level and/or row level.

Recommended:

- Batch-level entity required.
- Row-level entity optional only if it must match the batch.
- Reject mixed-entity import files unless explicitly designed and tested.

---

## 8. Reporting impact

### Required future report modes

Reports should support:

- `AD` only
- `AS` only
- Consolidated

### Minimal report filter design

```ts
type LegalEntityReportScope = "AD" | "AS" | "CONSOLIDATED";
```

### Finance reports

Finance reports should filter at the journal entry level:

- Trial Balance
- Income Statement
- Balance Sheet
- General Ledger
- Close Evidence
- Retained Earnings

For consolidated mode:

- Include both `AD` and `AS`.
- Sum balances by account.
- Do not eliminate intercompany balances in MC-1A.

Intercompany eliminations are a future consolidation feature, not part of the minimal layer.

### Stock reports

Stock reports should filter by `StockDocument.legalEntityCode` or derived posting entity:

- AD stock only
- AS stock only
- Combined operational view if needed

### Tax / VAT reports

VAT and tax reports must be entity-specific.

Minimum requirement:

- Filter tax source documents by legal entity.
- Print/display entity tax identity from `LegalEntity.taxId` and `LegalEntity.address`.

---

## 9. Minimum viable implementation

### Required fields

#### LegalEntity

```text
code
name
address
taxId
```

#### Session

```text
documentEntityCode
```

#### Finance

Minimum direct entity fields:

```text
Voucher.legalEntityCode
JournalEntry.legalEntityCode
AccountingPeriod.legalEntityCode
```

Closing entries / close evidence should either directly store entity or derive safely from `AccountingPeriod` / `JournalEntry`, but the close workflow must be entity-scoped.

#### Stock

Minimum direct entity field:

```text
StockDocument.legalEntityCode
```

Stock ledger/posting may derive through `StockDocument` if all reporting and validation paths consistently join through the document.

### Required schema changes

For the actual implementation phase after MC-1A, likely required schema changes are:

1. Add `LegalEntity` model.
2. Seed `AS` and `AD`.
3. Add `legalEntityCode` to `Voucher`.
4. Add `legalEntityCode` to `JournalEntry`.
5. Add `legalEntityCode` to `AccountingPeriod`.
6. Add `legalEntityCode` to `StockDocument`.
7. Add indexes / unique constraints for entity-aware queries.

Recommended indexes / uniqueness:

```text
Voucher(legalEntityCode, date/status/docNo as appropriate)
JournalEntry(legalEntityCode, entryDate/status as appropriate)
AccountingPeriod(legalEntityCode, year, month) unique
StockDocument(legalEntityCode, docType/status/documentDate as appropriate)
```

Exact field names should follow the existing schema naming convention after reviewing `schema.prisma`.

### Required session changes

1. Login determines default `documentEntityCode`.
2. Branch `HO999` + authorized HO finance/admin role shows toggle.
3. Default toggle value is `AS` / ASAS.
4. SHOP users never see toggle.
5. Non-HO branches force `AS`.
6. Session carries `documentEntityCode`.
7. Create endpoints use session value only as default; persisted documents store final entity explicitly.

### Required validations

#### Global validations

- Entity code must be either `AS` or `AD`.
- Entity must exist in `LegalEntity`.
- User must be authorized for selected entity.
- Existing document entity must not change after posting/confirming unless a specific audited correction workflow exists.

#### POS validations

- POS documents must always be `AS`.
- SHOP stock counts must always be `AS`.
- ASAD cannot use full POS.

#### Finance validations

- Voucher and JournalEntry must have matching legal entity when linked.
- Posting period must match document legal entity.
- Closing entry must close only one legal entity.
- Reports must require explicit entity scope or default to `AS` only in UI where appropriate.

#### Stock validations

- StockDocument must have legal entity.
- SHOP-created StockDocument must be `AS`.
- Opening stock import must require legal entity.
- Stock posting must not mix AD and AS lines inside one document unless a future intercompany document type explicitly supports it.

---

## 10. Risks

### Risk 1 — Accidentally using branch as legal owner

If branch becomes the legal owner, HO documents will be unsafe because HO can create both AS and AD documents.

Mitigation:

- Treat branch as operational location only.
- Store legal entity on documents.

### Risk 2 — Finance reports accidentally mixing entities

If JournalEntry does not carry legal entity, reports may silently include both companies.

Mitigation:

- Add `JournalEntry.legalEntityCode`.
- Require report scope.
- Add tests for AS-only, AD-only, and combined behavior.

### Risk 3 — Accounting periods remain global

A global period would block or reopen both companies together.

Mitigation:

- Scope `AccountingPeriod` by legal entity.

### Risk 4 — Stock ownership ambiguity

If stock documents lack entity, opening stock and AD/AS material ownership will mix.

Mitigation:

- Add `StockDocument.legalEntityCode` before opening stock import.

### Risk 5 — Session context mistaken for audit truth

If reports rely on current session instead of persisted document entity, old documents may appear under the wrong company.

Mitigation:

- Persist entity on every relevant document.
- Use session only as create-time default.

### Risk 6 — Overbuilding into multi-company ERP

Adding too many legal entity features may slow M2 and create unnecessary complexity.

Mitigation:

- Keep LegalEntity minimal.
- Add only document ownership and report filters.
- Defer intercompany automation and consolidation eliminations.

---

## 11. Final recommendation

### Recommended design

Use a minimal `LegalEntity` master with only:

```text
code
name
address
taxId
```

Use `documentEntityCode` in session as the current working document context.

Persist legal entity explicitly on finance and stock documents.

Do not make `Branch.legalEntityId` the source of accounting ownership.

### Absolute minimum required before M2

Before M2 opening imports, the project needs the actual implementation of:

1. `LegalEntity` master with `AS` and `AD`.
2. Session `documentEntityCode` with HO toggle behavior.
3. `Voucher.legalEntityCode`.
4. `JournalEntry.legalEntityCode`.
5. `AccountingPeriod.legalEntityCode`.
6. `StockDocument.legalEntityCode`.
7. Validation that POS / SHOP flows are always `AS`.
8. Validation that HO finance/admin may create `AS` or `AD` documents from `HO999`.
9. Finance report filters by entity.
10. Migration import gates requiring explicit entity.

### Can M2 proceed immediately after MC-1A?

No.

MC-1A is only the design review. M2 can proceed after the minimal LegalEntity implementation is completed and tested.

### Final decision

Proceed with a **minimal LegalEntity layer**, not a multi-company ERP.

The safe implementation is:

```text
Shared masters
+ explicit document legal entity ownership
+ entity-aware finance periods/reports
+ entity-aware stock documents/imports
```

This satisfies ASAD / ASAS separation without duplicating database, deployment, product master, or staff master.
