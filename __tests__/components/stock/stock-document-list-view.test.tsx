/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentListView } from "@/components/stock/StockDocumentListView"
import { buildFiscalPeriodOptions } from "@/lib/stock-ui/fiscal-period-options"

const sampleItems = [
  {
    id: "doc-1",
    refNo: "TRO-SH001-202606-0001",
    docType: "TRANSFER_OUT" as const,
    status: "DRAFT" as const,
    date: "2026-03-01T00:00:00.000Z",
    periodMonth: "2026-03",
    branchId: "branch-1",
    fromLocId: "branch-1",
    toLocId: "branch-ho",
    submittedAt: null,
    confirmedAt: null,
    postedAt: null,
    cancelledAt: null,
    lineCount: 2,
    createdAt: "2026-03-01T00:00:00.000Z",
  },
]

describe("StockDocumentListView", () => {
  it("renders compact admin table without create links in the view", () => {
    const html = renderToStaticMarkup(
      <StockDocumentListView
        items={sampleItems}
        filters={{
          shopBranchId: "",
          docKind: "",
          status: "",
          periodMonth: "2026-03",
        }}
        periodOptions={buildFiscalPeriodOptions(2026)}
        shopOptions={[{ id: "branch-1", code: "SH001", name: "Chidlom" }]}
        loading={false}
        loadingMore={false}
        error={null}
        hasMore={false}
        onFilterChange={() => {}}
        onLoadMore={() => {}}
        viewerEntityCode="AS"
      />
    )

    expect(html).toContain("ORD-SH001-202606-0001")
    expect(html).not.toContain("TRO-SH001-202606-0001")
    expect(html).toContain("ASAS • ORD")
    expect(html).toContain("Draft")
    expect(html).toContain("/shop/stock-documents/doc-1")
    expect(html).not.toContain("/shop/stock-documents/new")
    expect(html).not.toContain("Filters")
    expect(html).not.toContain("Apply")
    expect(html).toContain("Shop")
    expect(html).toContain("Period")
    expect(html).toContain("ORD • ใบสั่งของ")
    expect(html).toContain("CNT • ตรวจนับสินค้า")
    expect(html).toContain("ADJ • ปรับปรุง")
    expect(html).not.toContain("Transferred")
    expect(html).not.toContain("Cancelled")
    expect(html).not.toContain("ASAS • CNT")
  })

  it("shows compact empty state when there are no rows", () => {
    const html = renderToStaticMarkup(
      <StockDocumentListView
        items={[]}
        filters={{
          shopBranchId: "",
          docKind: "",
          status: "",
          periodMonth: "",
        }}
        periodOptions={buildFiscalPeriodOptions(2026)}
        shopOptions={[]}
        loading={false}
        loadingMore={false}
        error={null}
        hasMore={false}
        onFilterChange={() => {}}
        onLoadMore={() => {}}
        viewerEntityCode="AS"
      />
    )

    expect(html).toContain("No stock documents found.")
  })
})
