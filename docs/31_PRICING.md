# Pricing (HO Administration)

## Concepts

| Concept | Direction | Storage |
|---------|-----------|---------|
| **Pricing Policy** | HO → SHOP transfer / internal supply | `PricingPolicy` — markup %, rounding after markup, effective dates |
| **Selling Price** | SHOP → Customer retail (all branches) | `SellingPrice` — global per product, effective-dated history |
| **Promotion Price** *(planned)* | Temporary retail override | Future `PromotionPrice` — does **not** overwrite selling rows |

## Pricing class vs product type

`PricingClass` (MATERIAL, MACHINERY, CONSUMABLE) is used for **policy lookup**, not as a mirror of `Product.productType`.

Resolution (`lib/pricing/resolve-pricing-class.ts`):

- `Product.productType === CONSUMABLE` → `CONSUMABLE`
- Else `groupCode >= 90` → `MACHINERY`
- Else → `MATERIAL`

## Active rows

- **Pricing policy:** one active row per `(marketType, pricingClass)` where `effectiveTo IS NULL`.
- **Selling price:** one active row per `productId` where `effectiveTo IS NULL`.
- New save closes the open row (`effectiveTo = now()`) and inserts a new row.

## Rounding

Applied **after** markup: `base × (1 + markupPercent)` then `roundingMode`.

| Mode | Rule |
|------|------|
| `NONE` | No rounding |
| `CENT_01` | Nearest 0.01 baht (1 satang) |
| `CENT_05` | Nearest 0.05 baht (25/50 satang coins) — e.g. 4.73 → 4.75 |
| `BAHT_1` | Nearest 1 baht |
| `BAHT_10` | Nearest 10 baht |
| `BAHT_100` | Nearest 100 baht |

**Suggested defaults when creating policy:** MATERIAL → `CENT_05`, MACHINERY → `BAHT_10`, CONSUMABLE → `CENT_01`.

## POS retail resolution (future-ready)

`lib/pricing/resolve-pos-retail-price.ts`:

1. Active **Promotion Price** (not implemented)
2. Active **Selling Price**
3. `null` → cannot sell

## Routes

| UI | API |
|----|-----|
| `/master/pricing` | Hub |
| `/master/pricing/policy` | `GET/POST /api/master/pricing/policy` |
| | `GET /api/master/pricing/policy/lookup` |
| `/master/pricing/selling-price` | `GET /api/master/pricing/selling-price/products` |
| | `POST /api/master/pricing/selling-price` |
| | `GET/POST group preview & apply` |

Access: **HO_ADMIN** only (`requireMasterDatabaseSession`).

## Future: PromotionPrice (schema sketch)

```prisma
model PromotionPrice {
  id            String    @id @default(uuid())
  productId     String?
  productGroup  String?
  price         Decimal   @db.Decimal(18, 2)
  effectiveFrom DateTime
  effectiveTo   DateTime?
  createdAt     DateTime  @default(now())
}
```
