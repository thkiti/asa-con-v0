import {
  defaultPaymentVoucherListUiFilter,
  toPaymentVoucherListFilter,
} from "@/lib/finance-ui/payment-voucher-list-filter"

describe("payment-voucher-list-filter", () => {
  it("maps period key to month date range when advanced dates are empty", () => {
    expect(
      toPaymentVoucherListFilter({
        ...defaultPaymentVoucherListUiFilter(),
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
      toPaymentVoucherListFilter({
        ...defaultPaymentVoucherListUiFilter(),
        entryNo: "PAV-260001",
        status: "POSTED",
      })
    ).toEqual({
      status: "POSTED",
      search: "PAV-260001",
      limit: 50,
      offset: 0,
    })
  })

  it("maps post filter to postingState when status is empty", () => {
    expect(
      toPaymentVoucherListFilter({
        ...defaultPaymentVoucherListUiFilter(),
        postingState: "unposted",
      })
    ).toMatchObject({ postingState: "unposted" })
  })
})
