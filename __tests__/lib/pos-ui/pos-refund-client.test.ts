import {
  fetchPosRefund,
  fetchPosRefundPreviewByReceiptNo,
} from "@/lib/pos-ui/pos-refund-client"

describe("pos-refund-client", () => {
  it("loads preview by receipt number", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        saleId: "sale-1",
        saleTotal: "100.00",
        refundedTotal: "0.00",
        remainingRefundable: "100.00",
        originalReceiptId: "rcpt-1",
        originalReceiptNo: "REC-SH001-202606-0001",
      }),
    })

    const result = await fetchPosRefundPreviewByReceiptNo(
      "REC-SH001-202606-0001",
      fetchFn
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.preview.saleId).toBe("sale-1")
      expect(result.preview.originalReceiptNo).toBe("REC-SH001-202606-0001")
    }
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/pos/refund/preview?receiptNo=REC-SH001-202606-0001",
      expect.objectContaining({ method: "GET" })
    )
  })

  it("posts sale-linked refund", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        refund: {
          id: "refund-1",
          refundNo: "REF-SH001-202606-0001",
          amount: "50.00",
        },
      }),
    })

    const result = await fetchPosRefund(
      { saleId: "sale-1", amount: "50.00", reason: "Defect" },
      fetchFn
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.refund.id).toBe("refund-1")
      expect(result.refund.refundNo).toBe("REF-SH001-202606-0001")
    }
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/pos/refund",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          amount: "50.00",
          reason: "Defect",
        }),
      })
    )
  })
})
