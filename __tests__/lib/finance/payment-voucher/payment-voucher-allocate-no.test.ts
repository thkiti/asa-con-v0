import {
  buildPaymentVoucherNo,
  allocatePaymentVoucherNo,
  PAYMENT_VOUCHER_DOCUMENT_CODE,
} from "@/lib/finance/payment-voucher/payment-voucher-allocate-no"

describe("payment-voucher-allocate-no", () => {
  const entryDate = new Date("2026-06-14T12:00:00.000Z")

  it("uses PAV document code", () => {
    expect(PAYMENT_VOUCHER_DOCUMENT_CODE).toBe("PAV")
    expect(buildPaymentVoucherNo(entryDate, 1)).toBe("PAV-260001")
    expect(buildPaymentVoucherNo(entryDate, 42)).toBe("PAV-260042")
  })

  it("allocates next sequence per legal entity and calendar year", async () => {
    const tx = {
      paymentVoucher: {
        count: jest.fn().mockResolvedValue(1),
      },
    }

    const no = await allocatePaymentVoucherNo(tx as never, {
      legalEntityCode: "AS",
      entryDate,
    })

    expect(no).toBe("PAV-260002")
    expect(tx.paymentVoucher.count).toHaveBeenCalled()
  })
})
