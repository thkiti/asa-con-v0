import {
  FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE,
  formatFinanceDocumentInquiryPageSummary,
  resetFinanceDocumentInquiryPage,
  resolveFinanceDocumentInquiryPage,
  withFinanceDocumentInquiryPage,
} from "@/lib/finance-ui/finance-document-inquiry-paging"

describe("finance-document-inquiry-paging", () => {
  it("defaults page size to 50", () => {
    expect(FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE).toBe(50)
    expect(resolveFinanceDocumentInquiryPage({}, 224)).toEqual({
      page: 1,
      pageSize: 50,
      totalPages: 5,
      offset: 0,
    })
  })

  it("maps page changes to offset", () => {
    expect(
      withFinanceDocumentInquiryPage({ postingState: "all", limit: 50 }, 3)
    ).toEqual({
      postingState: "all",
      limit: 50,
      offset: 100,
    })
  })

  it("resets to page 1", () => {
    expect(
      resetFinanceDocumentInquiryPage({
        postingState: "all",
        limit: 50,
        offset: 150,
      })
    ).toEqual({
      postingState: "all",
      limit: 50,
      offset: 0,
    })
  })

  it("formats Thai page summary", () => {
    expect(formatFinanceDocumentInquiryPageSummary(224, 1, 5)).toBe(
      "224 รายการ • หน้า 1 / 5"
    )
  })
})
