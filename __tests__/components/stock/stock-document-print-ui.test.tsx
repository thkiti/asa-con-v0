import { renderToStaticMarkup } from "react-dom/server"
import {
  StockDocumentPrintHeader,
  StockDocumentPrintLinesTable,
} from "@/components/stock/stock-document-print-ui"
import type { StockDocumentDetailVM } from "@/lib/stock-ui/types"

const sampleDetail: StockDocumentDetailVM = {
  id: "doc-1",
  refNo: "PERF-1",
  docType: "PERFORMANCE",
  status: "SUBMITTED",
  date: "2026-06-02T00:00:00.000Z",
  periodMonth: "2026-06",
  branchId: "branch-shop",
  fromLocId: "branch-shop",
  toLocId: null,
  submittedAt: "2026-06-02T12:00:00.000Z",
  confirmedAt: null,
  postedAt: null,
  createdByStaffId: "staff-1",
  confirmedByStaffId: null,
  postedByStaffId: null,
  cancelledAt: null,
  cancelledByStaffId: null,
  cancelReason: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  lines: [
    {
      id: "line-1",
      productId: "prod-1",
      qty: 3,
      endingQty: null,
      reviewPostingDelta: null,
      product: { id: "prod-1", code: "C1", name: "Saved item" },
    },
    {
      id: "line-2",
      productId: "prod-2",
      qty: 1,
      endingQty: null,
      reviewPostingDelta: null,
      product: { id: "prod-2", code: "C2", name: "Second item" },
    },
  ],
}

describe("stock-document-print-ui", () => {
  it("StockDocumentPrintHeader renders saved document metadata", () => {
    const html = renderToStaticMarkup(<StockDocumentPrintHeader detail={sampleDetail} />)
    expect(html).toContain("print-only")
    expect(html).toContain("PERF-1")
    expect(html).toContain("Performance")
    expect(html).toContain("Submitted")
    expect(html).toContain("branch-shop")
    expect(html).toContain("Printed from saved document record")
  })

  it("StockDocumentPrintLinesTable renders saved lines in order", () => {
    const html = renderToStaticMarkup(<StockDocumentPrintLinesTable detail={sampleDetail} />)
    expect(html).toContain("print-only")
    expect(html).toContain("C1")
    expect(html).toContain("Saved item")
    expect(html).toContain("C2")
    expect(html).toContain("Second item")
    expect(html).toContain(">3<")
    expect(html).toContain(">1<")
  })

  it("StockDocumentPrintLinesTable shows ADJ columns for ADJUSTMENT", () => {
    const adjDetail: StockDocumentDetailVM = {
      ...sampleDetail,
      docType: "ADJUSTMENT",
      lines: [
        {
          id: "line-adj",
          productId: "prod-1",
          qty: 0,
          endingQty: 10,
          reviewPostingDelta: 2,
          product: { id: "prod-1", code: "A1", name: "Adj item" },
        },
      ],
    }
    const html = renderToStaticMarkup(<StockDocumentPrintLinesTable detail={adjDetail} />)
    expect(html).toContain("Ending qty")
    expect(html).toContain("ADJ delta")
    expect(html).toContain(">10<")
    expect(html).toContain(">2<")
  })
})
