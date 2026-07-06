import {
  allocateInvoiceVoucherNo,
  buildInvoiceVoucherNo,
  INVOICE_VOUCHER_DOCUMENT_CODE,
} from "@/lib/finance/invoice-voucher/invoice-voucher-allocate-no"

describe("invoice-voucher-allocate-no", () => {
  const invoiceDate = new Date("2026-06-15T00:00:00.000Z")

  it("formats INV-YYnnnn document numbers", () => {
    expect(buildInvoiceVoucherNo(invoiceDate, 1)).toBe("INV-260001")
    expect(buildInvoiceVoucherNo(invoiceDate, 42)).toBe("INV-260042")
    expect(INVOICE_VOUCHER_DOCUMENT_CODE).toBe("INV")
  })

  it("allows the same entryNo across different legalEntityCode scopes", async () => {
    const tx = {
      invoiceVoucher: {
        findMany: jest.fn(async ({ where }: { where: { legalEntityCode: string } }) => {
          if (where.legalEntityCode === "AD") {
            return [{ entryNo: "INV-260001" }]
          }
          return []
        }),
      },
    }

    const no = await allocateInvoiceVoucherNo(tx as never, {
      legalEntityCode: "AS",
      invoiceDate,
    })

    expect(no).toBe("INV-260001")
  })
})
