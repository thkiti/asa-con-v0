import {
  defaultInvoiceVoucherListUiFilter,
  toInvoiceVoucherListFilter,
} from "@/lib/finance-ui/invoice-voucher-list-filter"

describe("invoice-voucher-list-filter", () => {
  it("maps period key to month date range when advanced dates are empty", () => {
    expect(
      toInvoiceVoucherListFilter({
        ...defaultInvoiceVoucherListUiFilter(),
        periodKey: "2026-06",
      })
    ).toMatchObject({
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
      limit: 50,
      offset: 0,
    })
  })

  it("maps No. field to search and omits legal entity from payload", () => {
    expect(
      toInvoiceVoucherListFilter({
        ...defaultInvoiceVoucherListUiFilter(),
        entryNo: "INV-260001",
        status: "POSTED",
      })
    ).toEqual({
      status: "POSTED",
      search: "INV-260001",
      limit: 50,
      offset: 0,
    })
  })

  it("maps post filter to postingState when status is empty", () => {
    expect(
      toInvoiceVoucherListFilter({
        ...defaultInvoiceVoucherListUiFilter(),
        postingState: "unposted",
      })
    ).toMatchObject({ postingState: "unposted" })
  })
})
