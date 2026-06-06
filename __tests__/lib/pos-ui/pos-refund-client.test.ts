import {
  fetchPosRefund,
  fetchPosRefundPreviewByReceiptNo,
  fetchPosRefundableReceipts,
  formatRecentSaleReceiptDate,
  formatRecentSaleReceiptOption,
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
        items: [{ name: "KEY BLANK A", qty: 1, lineTotal: "100.00" }],
      }),
    })

    const result = await fetchPosRefundPreviewByReceiptNo(
      "REC-SH001-202606-0001",
      fetchFn
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.preview.saleId).toBe("sale-1")
      expect(result.preview.items).toHaveLength(1)
    }
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/pos/refund/preview?receiptNo=REC-SH001-202606-0001",
      expect.objectContaining({ method: "GET" })
    )
  })

  it("formats Recent Sales dropdown label with issue date", () => {
    expect(formatRecentSaleReceiptDate("2026-06-06T14:32:00.000Z")).toBe("06.06.2026")
    expect(
      formatRecentSaleReceiptOption({
        receiptNo: "REC-SH001-202606-0020",
        saleId: "sale-1",
        issuedAt: "2026-06-06T10:00:00.000Z",
        total: "250.00",
        alreadyRefunded: "0.00",
        remaining: "250.00",
        cashierDisplay: null,
      })
    ).toBe("REC-SH001-202606-0020 / 06.06.2026")
  })

  it("loads refundable receipts for dropdown", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        receipts: [
          {
            receiptNo: "REC-SH001-202606-0001",
            saleId: "sale-1",
            issuedAt: "2026-06-06T14:32:00.000Z",
            total: "250.00",
            alreadyRefunded: "0.00",
            remaining: "250.00",
            cashierDisplay: null,
          },
        ],
      }),
    })

    const result = await fetchPosRefundableReceipts(undefined, fetchFn)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.receipts).toHaveLength(1)
    }
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/pos/refund/receipts",
      expect.objectContaining({ method: "GET" })
    )
  })

  it("posts sale-linked refund with reasonCode", async () => {
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
      { saleId: "sale-1", amount: "50.00", reasonCode: "KEY_BLANK_MISTAKE" },
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
      })
    )
    const body = JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body))
    expect(body).toEqual({
      saleId: "sale-1",
      amount: "50.00",
      reasonCode: "KEY_BLANK_MISTAKE",
    })
  })
})
