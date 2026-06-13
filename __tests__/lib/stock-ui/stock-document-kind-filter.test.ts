import {
  matchesStockDocumentKindFilter,
  stockDocumentKindToListQuery,
} from "@/lib/stock-ui/stock-document-kind-filter"

describe("stockDocumentKindToListQuery", () => {
  it("maps ORD to TRANSFER_OUT", () => {
    expect(stockDocumentKindToListQuery("ORD", "")).toEqual({
      docType: "TRANSFER_OUT",
    })
  })

  it("maps CNT to ADJUSTMENT draft", () => {
    expect(stockDocumentKindToListQuery("CNT", "")).toEqual({
      docType: "ADJUSTMENT",
      status: "DRAFT",
    })
  })

  it("maps ADJ to ADJUSTMENT without status when status is All", () => {
    expect(stockDocumentKindToListQuery("ADJ", "")).toEqual({
      docType: "ADJUSTMENT",
    })
  })

  it("passes explicit status for ORD and ADJ", () => {
    expect(stockDocumentKindToListQuery("ORD", "POSTED")).toEqual({
      docType: "TRANSFER_OUT",
      status: "POSTED",
    })
    expect(stockDocumentKindToListQuery("ADJ", "POSTED")).toEqual({
      docType: "ADJUSTMENT",
      status: "POSTED",
    })
  })
})

describe("matchesStockDocumentKindFilter", () => {
  it("splits ADJUSTMENT draft vs non-draft for CNT and ADJ", () => {
    const draft = { docType: "ADJUSTMENT" as const, status: "DRAFT" as const }
    const posted = { docType: "ADJUSTMENT" as const, status: "POSTED" as const }

    expect(matchesStockDocumentKindFilter("CNT", "", draft)).toBe(true)
    expect(matchesStockDocumentKindFilter("CNT", "", posted)).toBe(false)
    expect(matchesStockDocumentKindFilter("ADJ", "", draft)).toBe(false)
    expect(matchesStockDocumentKindFilter("ADJ", "", posted)).toBe(true)
  })

  it("still shows rows with removed statuses when returned from API", () => {
    const cancelled = {
      docType: "TRANSFER_OUT" as const,
      status: "CANCELLED" as const,
    }
    expect(matchesStockDocumentKindFilter("", "", cancelled)).toBe(true)
    expect(matchesStockDocumentKindFilter("ORD", "", cancelled)).toBe(true)
  })
})
