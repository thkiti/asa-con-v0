# Phase 23F-3 — Compact Counting Sheet Manual Smoke Checklist

Use on a dev build with ADJUSTMENT draft + populated reference stock input list.

## Counting sheet (screen)

- [ ] Open ADJUSTMENT DRAFT → shows **ตรวจนับสต็อก — รายชิ้น** (not old English “Stock count” table with Name column).
- [ ] **K** tab with 40+ items → multiple compact blocks; **horizontal scroll** shows many hooks per swipe.
- [ ] Switch **K / C / M / O / S** → only that hook group’s rows appear in item area.
- [ ] Tab badges show count of lines with **qty > 0** per group.
- [ ] Edit qty → value updates in the row input (local state).
- [ ] Hook column shows **number only** (e.g. `10`), not `K.10`.
- [ ] No **Product Name** column in item blocks; name only in tooltip/aria if needed.
- [ ] **S** tab → Thai prefix section titles; **Code + Qty** only (no Hook column in block tables).

## Group summary (right panel)

- [ ] Title **สรุปตามกลุ่มสินค้า** and subtitle **สำหรับตรวจทาน — ไม่ใช่การบันทึกจำนวน**.
- [ ] Summary totals match **active tab** lines only (switch tab → summary changes).
- [ ] No inputs in summary panel (read-only).

## Document workflow (unchanged)

- [ ] **Save** persists only lines with qty > 0; zero-qty master rows remain on screen.
- [ ] **Submit / Confirm / Post** remain document-level actions (not per line).
- [ ] **Post** still posts the whole document batch.

## Unaffected areas

- [ ] Print view for submitted/posted docs unchanged (detail snapshot, not counting sheet).
- [ ] Reference stock / product import unchanged.
- [ ] Finance / posting lock screens unchanged.

## Regression automation

Run:

```bash
npm test -- --testPathPatterns="stock-document-counting|stock-document-group|stock-document-hook|stock-document-editor|counting-editor-load|merge-input-list|build-counting-group|counting-sheet"
```
