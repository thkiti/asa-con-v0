import {
  fetchStockDocumentDetail,
  fetchStockDocumentList,
  fetchStockInputList,
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

  it("fetchStockInputList returns normalized rows", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          rowKey: "K-1",
          source: "REFERENCE",
          referenceStockId: "ref-1",
          productId: "prod-1",
          productCode: "0101001",
          productName: "Key",
          hookGroup: "K",
          hookNo: 1,
          hookLabel: "K.1",
          supplierCode: "#K1",
          displayCode: "#K1",
          displayName: "Key",
          productGroup: "0101900",
          groupCode: "0101900",
          sortKey: "0101900|K|000001|#K1|0101001",
        },
      ],
    })

    const rows = await fetchStockInputList()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.sourceType).toBe("REFERENCE")
    expect(global.fetch).toHaveBeenCalledWith("/api/stock-document/input-list")
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
