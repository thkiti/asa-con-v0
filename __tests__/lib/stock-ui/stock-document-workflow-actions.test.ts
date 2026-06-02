import {
  cancelStockDocument,
  confirmStockDocument,
  postStockDocument,
  submitStockDocument,
} from "@/lib/stock-ui/stock-document-workflow-actions"
import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"

describe("stock-document-workflow-actions", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  const detailBody = {
    id: "doc-1",
    refNo: "PERF-1",
    docType: "PERFORMANCE",
    status: "SUBMITTED",
    date: "2026-06-02T00:00:00.000Z",
    periodMonth: "2026-06",
    branchId: "b1",
    fromLocId: "b1",
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
    lines: [],
  }

  it("submitStockDocument POSTs submit endpoint", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => detailBody,
    })

    const result = await submitStockDocument("doc-1")

    expect(result.status).toBe("SUBMITTED")
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/stock-document/doc-1/submit",
      { method: "POST" }
    )
  })

  it("confirmStockDocument sends staff id in body", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...detailBody, status: "CONFIRMED" }),
    })

    await confirmStockDocument("doc-1", "staff-9")

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/stock-document/doc-1/confirm",
      expect.objectContaining({ method: "POST" })
    )
    const body = JSON.parse(String(init.body))
    expect(body.confirmedByStaffId).toBe("staff-9")
    expect(body.staffId).toBe("staff-9")
  })

  it("cancelStockDocument sends cancelledByStaffId", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...detailBody, status: "CANCELLED" }),
    })

    await cancelStockDocument("doc-1", "staff-9", "mistake")

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body.cancelledByStaffId).toBe("staff-9")
    expect(body.cancelReason).toBe("mistake")
  })

  it("postStockDocument POSTs post endpoint with staffId", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...detailBody, status: "POSTED" }),
    })

    const result = await postStockDocument("doc-1", "staff-9")

    expect(result.status).toBe("POSTED")
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/stock-document/doc-1/post",
      expect.objectContaining({ method: "POST" })
    )
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body.staffId).toBe("staff-9")
  })

  it("postStockDocument surfaces API errors with mapped codes", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: "The accounting period is closed. Posting is blocked.",
        code: "PERIOD_CLOSED",
      }),
    })

    await expect(postStockDocument("doc-1", "staff-9")).rejects.toMatchObject({
      code: "PERIOD_CLOSED",
      message: "The accounting period is closed. Posting is blocked.",
    })
  })

  it("surfaces API errors", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: "Only DRAFT documents may be submitted",
        code: DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
      }),
    })

    await expect(submitStockDocument("doc-1")).rejects.toMatchObject({
      code: DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
    })
  })
})
