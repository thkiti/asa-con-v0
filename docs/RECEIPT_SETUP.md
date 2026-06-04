# Receipt Setup (POS abbreviated tax invoice)

HO_ADMIN maintains receipt layout; branch master holds contact and tax/machine IDs.

## Tax ID rules (`Branch.taxId`)

| Branch | Meaning on printed receipt |
|--------|---------------------------|
| `HO999` | **Company Tax ID** — used on every shop receipt |
| `SHxxx` | **Machine / POS approval ID** — used for that branch only |

No separate `machineId` column.

## Data sources at print time

| Slip field | Source |
|------------|--------|
| Company display name | `ReceiptPrintSettings.companyDisplayName` |
| Company Tax ID | `Branch.taxId` where `code = HO999` |
| Machine ID | Current sale branch `taxId` (hidden when branch is `HO999`) |
| Branch code + name | Sale branch |
| Address / phone | Sale branch `address`, `phone` |
| Footer lines 1–5 | `ReceiptPrintSettings` |
| Thai tax lines | `showAbbreviatedTaxTitle`, `showVatIncludedMessage` |

## UI

- **Administration → Receipt Setup** — `/admin/receipt-setup`
- **Master → Branch** — address, phone, tax ID (label depends on HO999 vs shop)

## Receipt number

`REC-{BranchCode}-{YYYYMM}-{Seq4}` — monthly sequence per branch (`lib/pos/receipt.ts`).

## VAT on slip

Display only: `taxable = total / 1.07`, `vat = total - taxable`. Does not change checkout totals.
