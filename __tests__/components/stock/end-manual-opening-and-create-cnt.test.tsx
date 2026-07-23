/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { EndManualOpeningPanel } from "@/components/stock/end/EndManualOpeningPanel"
import { StockDocumentListView } from "@/components/stock/StockDocumentListView"

describe("EndManualOpeningPanel", () => {
  it("labels Opening Qty and Physical Count distinctly", () => {
    const html = renderToStaticMarkup(
      <EndManualOpeningPanel onSave={() => {}} />
    )
    expect(html).toContain("Opening Qty (BEGIN)")
    expect(html).toContain("Physical Count Qty")
    expect(html).toContain("Product Code")
    expect(html).toContain('data-testid="end-manual-opening-panel"')
  })
})

describe("Stock Document list Create CNT", () => {
  it("exposes Create CNT with periodKey and branchId in href", () => {
    const html = renderToStaticMarkup(
      <StockDocumentListView
        items={[]}
        filters={{
          shopBranchId: "sh1",
          docKind: "",
          status: "",
          periodMonth: "2026-01",
        }}
        shopOptions={[{ id: "sh1", code: "SH001", name: "Chidlom" }]}
        loading={false}
        loadingMore={false}
        error={null}
        hasMore={false}
        onFilterChange={() => {}}
        onSearch={() => {}}
        onClear={() => {}}
        onLoadMore={() => {}}
        viewerEntityCode="AS"
        createCntHref="/shop/stock-documents/new?type=ADJUSTMENT&branchId=sh1&periodKey=2026-01"
        showOpenCreateEnd
        onOpenCreateEnd={() => {}}
      />
    )
    expect(html).toContain("Create CNT")
    expect(html).toContain("periodKey=2026-01")
    expect(html).toContain("type=ADJUSTMENT")
    expect(html).toContain("Open END / Enter Opening")
  })

  it("disables Create CNT with explanation when All Shops", () => {
    const html = renderToStaticMarkup(
      <StockDocumentListView
        items={[]}
        filters={{
          shopBranchId: "",
          docKind: "",
          status: "",
          periodMonth: "2026-03",
        }}
        shopOptions={[{ id: "sh1", code: "SH001", name: "Chidlom" }]}
        loading={false}
        loadingMore={false}
        error={null}
        hasMore={false}
        onFilterChange={() => {}}
        onSearch={() => {}}
        onClear={() => {}}
        onLoadMore={() => {}}
        viewerEntityCode="AS"
        createCntHref={null}
        createCntDisabledReason="Select a Shop before creating CNT"
      />
    )
    expect(html).toContain("Create CNT")
    expect(html).toContain("Select a Shop before creating CNT")
    expect(html).not.toContain('href="/shop/stock-documents/new?type=ADJUSTMENT')
  })
})
