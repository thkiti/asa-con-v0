import {
  defaultRevenueVoucherListUiFilter,
  toRevenueVoucherListFilter,
} from "@/lib/finance-ui/revenue-voucher-list-filter"

describe("revenue-voucher-list-filter", () => {
  it("maps period key to month date range when advanced dates are empty", () => {
    expect(
      toRevenueVoucherListFilter({
        ...defaultRevenueVoucherListUiFilter(),
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
      toRevenueVoucherListFilter({
        ...defaultRevenueVoucherListUiFilter(),
        entryNo: "REV-260001",
        status: "POSTED",
      })
    ).toEqual({
      status: "POSTED",
      search: "REV-260001",
      limit: 50,
      offset: 0,
    })
  })

  it("maps post filter to postingState when status is empty", () => {
    expect(
      toRevenueVoucherListFilter({
        ...defaultRevenueVoucherListUiFilter(),
        postingState: "unposted",
      })
    ).toMatchObject({ postingState: "unposted" })
  })
})
