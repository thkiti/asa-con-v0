import {
  createPaymentVoucherDraft,
  fetchPaymentVoucher,
  fetchPaymentVouchers,
  postPaymentVoucher,
} from "@/lib/finance-ui/payment-vouchers"

describe("payment-vouchers UI fetchers", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("fetchPaymentVouchers sends request-scoped legalEntityCode", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [], total: 0 }),
    })

    await fetchPaymentVouchers("AS", { status: "DRAFT" })

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/payment-vouchers?legalEntityCode=AS&status=DRAFT",
      undefined
    )
  })

  it("fetchPaymentVoucher detail includes legalEntityCode query", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ entry: { id: "pav-1" } }),
    })

    await fetchPaymentVoucher("AD", "pav-1")

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/payment-vouchers/pav-1?legalEntityCode=AD",
      undefined
    )
  })

  it("createPaymentVoucherDraft POSTs with scoped URL", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ entry: { id: "pav-1", legalEntityCode: "AS" } }),
    })

    await createPaymentVoucherDraft("AS", {
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: "2026-06-14",
      payFromAccountId: "acc-1",
      payeeName: "Vendor",
      lines: [],
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/payment-vouchers?legalEntityCode=AS",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("postPaymentVoucher uses scoped post URL", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ entry: { id: "pav-1" } }),
    })

    await postPaymentVoucher("AS", "pav-1")

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/payment-vouchers/pav-1/post?legalEntityCode=AS",
      { method: "POST" }
    )
  })
})
