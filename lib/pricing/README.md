# lib/pricing

HO pricing: transfer policy (markup + rounding) and global retail selling prices.

## Modules

| Module | Purpose |
|--------|---------|
| `pricing-policy.ts` | List / create HO→SHOP policies (effective-dated) |
| `get-active-pricing-policy.ts` | Lookup active policy by market + class |
| `apply-markup-rounding.ts` | Markup then rounding (`NONE`, `CENT_01`, `CENT_05`, `BAHT_1`, `BAHT_10`, `BAHT_100`) |
| `rounding-defaults.ts` | UI defaults by pricing class (MATERIAL→CENT_05, etc.) |
| `selling-price.ts` | Active retail price, history, set by item |
| `reference-product-group.ts` | Group preview for set-by-group |
| `set-selling-price-group.ts` | Bulk set with anchor price guard |
| `resolve-pos-retail-price.ts` | POS resolver (selling-only stub) |

## Future: Promotion Price

Temporary retail overrides — **separate table**, does not overwrite `SellingPrice`.

POS resolution order (when implemented):

1. Active Promotion Price
2. Active Selling Price (`resolvePosRetailPrice` today)
3. No price → cannot sell

See [docs/31_PRICING.md](../docs/31_PRICING.md).
