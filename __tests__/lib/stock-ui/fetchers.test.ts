import { fetchStockDocumentDetail, fetchStockDocumentList } from "@/lib/stock-ui/fetchers"
import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"

describe("stock-ui fetchers", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("fetchStockDocumentList returns parsed JSON", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        nextCursor: null,
        hasMore: false,
      }),
    })

    const result = await fetchStockDocumentList({ branchId: "b1" })
    expect(result.items).toEqual([])
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/stock-document?branchId=b1")
    )
  })

  it("fetchStockDocumentDetail throws UiError with code", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({
        error: "Document not found",
        code: DocumentErrorCodes.DOCUMENT_NOT_FOUND,
      }),
    })

    await expect(fetchStockDocumentDetail("missing")).rejects.toMatchObject({
      code: DocumentErrorCodes.DOCUMENT_NOT_FOUND,
    })
  })
})
