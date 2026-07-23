/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentListView } from "@/components/stock/StockDocumentListView"

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
  it("renders compact admin table with PeriodSelector Year/Month", () => {
    const html = renderToStaticMarkup(
      <StockDocumentListView
        items={sampleItems}
        filters={{
          shopBranchId: "",
          docKind: "",
          status: "",
          periodMonth: "2026-03",
        }}
        shopOptions={[{ id: "branch-1", code: "SH001", name: "Chidlom" }]}
        loading={false}
        loadingMore={false}
        error={null}
        hasMore={false}
        onFilterChange={() => {}}
        onSearch={() => {}}
        onClear={() => {}}
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
    expect(html).toContain("Shop")
    expect(html).toContain("All Shops")
    expect(html).toContain('data-testid="stock-document-period"')
    expect(html).toContain('data-testid="stock-document-period-year"')
    expect(html).toContain('data-testid="stock-document-period-month"')
    expect(html).toContain("01 • JAN")
    expect(html).toContain("Search")
    expect(html).toContain("Clear")
    expect(html).not.toContain(">Period<")
    expect(html).not.toContain("2026 • 03")
    expect(html).toContain("ORD • ใบสั่งของ")
    expect(html).toContain("CNT • ตรวจนับสินค้า")
    expect(html).toContain("ADJ • ปรับปรุง")
    expect(html).toContain("END • สต็อกสิ้นงวด")
    expect(html).not.toContain("DEY • ส่งของ")
    expect(html).not.toContain("Transferred")
    expect(html).not.toContain("Cancelled")
    expect(html).not.toContain("ASAS • CNT")
  })

  it("uses Location vocabulary for ASAD and only HO/DEY/CNT/END types", () => {
    const html = renderToStaticMarkup(
      <StockDocumentListView
        items={[]}
        filters={{
          shopBranchId: "ho",
          docKind: "",
          status: "",
          periodMonth: "2026-03",
        }}
        shopOptions={[{ id: "ho", code: "HO999", name: "Head Office" }]}
        shopFilterDisabled
        loading={false}
        loadingMore={false}
        error={null}
        hasMore={false}
        onFilterChange={() => {}}
        onSearch={() => {}}
        onClear={() => {}}
        onLoadMore={() => {}}
        viewerEntityCode="AD"
      />
    )

    expect(html).toContain("Location")
    expect(html).not.toContain("All Shops")
    expect(html).toContain("DEY • ส่งของ")
    expect(html).toContain("CNT • ตรวจนับสินค้า")
    expect(html).toContain("END • สต็อกสิ้นงวด")
    expect(html).not.toContain("ORD • ใบสั่งของ")
    expect(html).not.toContain("ADJ • ปรับปรุง")
    expect(html).toContain('data-testid="stock-document-period"')
  })

  it("links END rows to the END detail path and shows Open END / Enter Opening for 2026-01", () => {
    const html = renderToStaticMarkup(
      <StockDocumentListView
        items={[
          {
            ...sampleItems[0]!,
            id: "end-9",
            refNo: "END-SH001-202601-0001",
            docType: "END",
            status: "DRAFT",
          },
        ]}
        filters={{
          shopBranchId: "",
          docKind: "END",
          status: "",
          periodMonth: "2026-01",
        }}
        shopOptions={[{ id: "branch-1", code: "SH001", name: "Chidlom" }]}
        loading={false}
        loadingMore={false}
        error={null}
        hasMore={false}
        onFilterChange={() => {}}
        onSearch={() => {}}
        onClear={() => {}}
        onLoadMore={() => {}}
        viewerEntityCode="AS"
        showOpenCreateEnd
        onOpenCreateEnd={() => {}}
      />
    )

    expect(html).toContain("/shop/stock-documents/end/end-9")
    expect(html).toContain("Open END / Enter Opening")
    expect(html).toContain("ASAS • END")
  })

  it("shows compact empty state when there are no rows", () => {
    const html = renderToStaticMarkup(
      <StockDocumentListView
        items={[]}
        filters={{
          shopBranchId: "",
          docKind: "",
          status: "",
          periodMonth: "2026-07",
        }}
        shopOptions={[]}
        loading={false}
        loadingMore={false}
        error={null}
        hasMore={false}
        onFilterChange={() => {}}
        onSearch={() => {}}
        onClear={() => {}}
        onLoadMore={() => {}}
        viewerEntityCode="AS"
      />
    )

    expect(html).toContain("No stock documents found.")
  })
})
