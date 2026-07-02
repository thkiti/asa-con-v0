import {
  buildDocumentTraceListPageMeta,
  DOCUMENT_TRACE_LIST_DEFAULT_LIMIT,
  formatDocumentTraceListCountLabel,
  formatDocumentTraceListLimitedHelper,
  parseDocumentTraceListLimit,
  parseDocumentTraceListOffset,
  resolveDocumentTraceListPagination,
} from "@/lib/finance/audit/document-trace-list-pagination"

describe("document trace list pagination helpers", () => {
  it("defaults to 30 rows with zero offset", () => {
    expect(resolveDocumentTraceListPagination()).toEqual({
      limit: 30,
      offset: 0,
    })
  })

  it("caps limit at 100", () => {
    expect(parseDocumentTraceListLimit("500")).toBe(100)
    expect(parseDocumentTraceListLimit("0")).toBe(DOCUMENT_TRACE_LIST_DEFAULT_LIMIT)
  })

  it("builds page metadata with hasMore and nextOffset", () => {
    expect(
      buildDocumentTraceListPageMeta({
        limit: 30,
        offset: 0,
        fetchedCount: 31,
        totalCount: 100,
      })
    ).toEqual({
      hasMore: true,
      nextOffset: 30,
      totalCount: 100,
    })
  })

  it("formats count labels for known and unknown totals", () => {
    expect(formatDocumentTraceListCountLabel(30, 100)).toBe("Showing 30 of 100 documents")
    expect(formatDocumentTraceListCountLabel(30, null)).toBe("Showing first 30 documents")
  })

  it("formats muted limited helper text", () => {
    expect(formatDocumentTraceListLimitedHelper(30)).toBe(
      "Showing first 30 documents. Use filters or Load more to narrow results."
    )
  })

  it("parses offsets safely", () => {
    expect(parseDocumentTraceListOffset("-1")).toBe(0)
    expect(parseDocumentTraceListOffset("60")).toBe(60)
  })
})
