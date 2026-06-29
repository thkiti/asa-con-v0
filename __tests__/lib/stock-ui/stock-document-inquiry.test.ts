import {
  applyStockDocumentInquiryNoToFilter,
  buildStockDocumentInquiryReturnPath,
  buildStockDocumentInquirySearchParams,
  parseStockDocumentInquiryFilterFromSearchParams,
  resolveStockDocumentInquiryNoDisplay,
} from "@/lib/stock-ui/stock-document-inquiry"

describe("stock-document-inquiry client helpers", () => {
  it("parses filter fields from search params", () => {
    const filter = parseStockDocumentInquiryFilterFromSearchParams(
      new URLSearchParams(
        "branchId=b1&periodKey=2026-06&from=2026-06-01&to=2026-06-30&kind=ORD&documentNo=ORD-1&status=DRAFT&postingState=unposted"
      )
    )

    expect(filter).toEqual({
      branchId: "b1",
      periodKey: "2026-06",
      from: "2026-06-01",
      to: "2026-06-30",
      kind: "ORD",
      refNo: "ORD-1",
      documentNo: "ORD-1",
      status: "DRAFT",
      postingState: "unposted",
    })
  })

  it("round-trips search params and return path", () => {
    const filter = {
      periodKey: "2026-06",
      kind: "CNT" as const,
      postingState: "all" as const,
    }
    const params = buildStockDocumentInquirySearchParams(filter)
    expect(params.get("periodKey")).toBe("2026-06")
    expect(params.get("kind")).toBe("CNT")
    expect(buildStockDocumentInquiryReturnPath(filter)).toBe(
      "/finance/stock-documents?periodKey=2026-06&kind=CNT&postingState=all"
    )
  })

  it("applies and resolves document number filter", () => {
    expect(resolveStockDocumentInquiryNoDisplay({ documentNo: " ADJ-1 " })).toBe("ADJ-1")
    expect(
      applyStockDocumentInquiryNoToFilter({ postingState: "all" }, "ORD-9")
    ).toEqual({
      postingState: "all",
      refNo: "ORD-9",
      documentNo: "ORD-9",
    })
  })
})
