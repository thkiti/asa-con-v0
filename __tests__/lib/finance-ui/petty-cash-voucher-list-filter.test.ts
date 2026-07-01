import {
  defaultPettyCashVoucherListUiFilter,
  toPettyCashVoucherListFilter,
} from "@/lib/finance-ui/petty-cash-voucher-list-filter"

describe("petty-cash-voucher-list-filter", () => {
  it("maps period key to month date range when advanced dates are empty", () => {
    expect(
      toPettyCashVoucherListFilter({
        ...defaultPettyCashVoucherListUiFilter(),
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
      toPettyCashVoucherListFilter({
        ...defaultPettyCashVoucherListUiFilter(),
        entryNo: "PCV-260001",
        status: "POSTED",
      })
    ).toEqual({
      status: "POSTED",
      search: "PCV-260001",
      limit: 50,
      offset: 0,
    })
  })

  it("maps post filter to postingState when status is empty", () => {
    expect(
      toPettyCashVoucherListFilter({
        ...defaultPettyCashVoucherListUiFilter(),
        postingState: "unposted",
      })
    ).toMatchObject({ postingState: "unposted" })
  })
})
