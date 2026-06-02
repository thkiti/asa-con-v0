import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentListView } from "@/components/stock/StockDocumentListView"

const sampleItems = [
  {
    id: "doc-1",
    refNo: "TRO-001",
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
  it("renders document rows and new document links", () => {
    const html = renderToStaticMarkup(
      <StockDocumentListView
        items={sampleItems}
        filters={{ docType: "", status: "", periodMonth: "2026-03" }}
        loading={false}
        loadingMore={false}
        error={null}
        hasMore={false}
        onFilterChange={() => {}}
        onApplyFilters={() => {}}
        onLoadMore={() => {}}
      />
    )

    expect(html).toContain("TRO-001")
    expect(html).toContain("Transfer out")
    expect(html).toContain("Draft")
    expect(html).toContain("/shop/stock-documents/doc-1")
    expect(html).toContain("/shop/stock-documents/new?type=TRANSFER_OUT")
    expect(html).toContain("/shop/stock-documents/new?type=PERFORMANCE")
    expect(html).toContain("/shop/stock-documents/new?type=ADJUSTMENT")
  })
})
