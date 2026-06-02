import {
  fetchStockDocumentDetail,
  fetchStockDocumentList,
  saveStockDocument,
} from "@/lib/stock-ui/fetchers"
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

  it("saveStockDocument POSTs payload with items alias", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "doc-1",
        refNo: "PERF-1",
        docType: "PERFORMANCE",
        status: "DRAFT",
        date: "2026-06-02T00:00:00.000Z",
        periodMonth: "2026-06",
        branchId: "b1",
        fromLocId: "b1",
        toLocId: null,
        submittedAt: null,
        confirmedAt: null,
        postedAt: null,
        cancelledAt: null,
        lines: [],
      }),
    })

    await saveStockDocument({
      docType: "PERFORMANCE",
      date: "2026-06-02",
      branchId: "b1",
      lines: [{ productId: "p1", qty: 1 }],
    })

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]
    expect(global.fetch).toHaveBeenCalledWith("/api/stock-document", expect.any(Object))
    const body = JSON.parse(String(init.body))
    expect(body.items).toEqual([{ productId: "p1", qty: 1 }])
    expect(body.lines).toEqual([{ productId: "p1", qty: 1 }])
  })

  it("saveStockDocument surfaces API error message", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: "Empty document",
        code: DocumentErrorCodes.EMPTY_DOCUMENT,
      }),
    })

    await expect(
      saveStockDocument({
        docType: "PERFORMANCE",
        date: "2026-06-02",
        branchId: "b1",
        lines: [],
      })
    ).rejects.toMatchObject({
      code: DocumentErrorCodes.EMPTY_DOCUMENT,
    })
  })
})
