import { buildInvoiceVoucherNo, INVOICE_VOUCHER_DOCUMENT_CODE } from "@/lib/finance/invoice-voucher/invoice-voucher-allocate-no"

describe("buildInvoiceVoucherNo", () => {
  it("formats INV-YYnnnn document numbers", () => {
    const date = new Date("2026-06-15T00:00:00.000Z")
    expect(buildInvoiceVoucherNo(date, 1)).toBe("INV-260001")
    expect(buildInvoiceVoucherNo(date, 42)).toBe("INV-260042")
    expect(INVOICE_VOUCHER_DOCUMENT_CODE).toBe("INV")
  })
})
