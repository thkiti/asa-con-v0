import {
  buildCollectorPickupSettlementReturnPath,
  COLLECTOR_PICKUP_SETTLEMENT_PATH,
  parseCollectorPickupSettlementFilterFromSearchParams,
  parseCollectorPickupSettlementUiFilterFromSearchParams,
} from "@/lib/finance-ui/collector-pickup-settlement"
import {
  buildFinanceVoucherDetailPath,
  formatFinanceDocumentBackLabel,
  resolveFinanceDocumentBackLink,
} from "@/lib/finance-ui/finance-navigation"

describe("collector pickup settlement navigation", () => {
  it("builds return path with branch and period filters", () => {
    expect(
      buildCollectorPickupSettlementReturnPath({
        branchId: "branch-sh001",
        periodKey: "2026-06",
        dateFrom: "",
        dateTo: "",
      })
    ).toBe(
      `${COLLECTOR_PICKUP_SETTLEMENT_PATH}?branchId=branch-sh001&period=2026-06`
    )
  })

  it("builds return path with advanced cross-month dates", () => {
    expect(
      buildCollectorPickupSettlementReturnPath({
        branchId: "branch-sh001",
        periodKey: "2026-06",
        dateFrom: "2026-06-30",
        dateTo: "2026-07-01",
      })
    ).toBe(
      `${COLLECTOR_PICKUP_SETTLEMENT_PATH}?branchId=branch-sh001&period=2026-06&dateFrom=2026-06-30&dateTo=2026-07-01`
    )
  })

  it("parses UI filter from period search params", () => {
    const params = new URLSearchParams(
      "branchId=branch-sh001&period=2026-06&dateFrom=2026-06-30&dateTo=2026-07-01"
    )
    expect(parseCollectorPickupSettlementUiFilterFromSearchParams(params)).toEqual({
      branchId: "branch-sh001",
      periodKey: "2026-06",
      dateFrom: "2026-06-30",
      dateTo: "2026-07-01",
    })
  })

  it("parses legacy from/to search params into UI filter", () => {
    const params = new URLSearchParams(
      "branchId=branch-sh001&from=2026-06-01&to=2026-06-30"
    )
    expect(parseCollectorPickupSettlementUiFilterFromSearchParams(params)).toEqual({
      branchId: "branch-sh001",
      periodKey: "2026-06",
      dateFrom: "",
      dateTo: "",
    })
    expect(parseCollectorPickupSettlementFilterFromSearchParams(params)).toEqual({
      branchId: "branch-sh001",
      from: "2026-06-01",
      to: "2026-06-30",
    })
  })

  it("embeds settlement return path in voucher drill-down links", () => {
    const returnTo = buildCollectorPickupSettlementReturnPath({
      branchId: "branch-sh001",
      periodKey: "2026-06",
      dateFrom: "",
      dateTo: "",
    })
    const href = buildFinanceVoucherDetailPath("voucher-pickup-1", returnTo)

    expect(href).toContain("/finance/vouchers/voucher-pickup-1")
    expect(href).toContain(
      encodeURIComponent(
        "/finance/pos-settlement/collector-pickup?branchId=branch-sh001&period=2026-06"
      )
    )
  })

  it("resolves voucher back link to collector pickup settlement with filters", () => {
    const returnTo = buildCollectorPickupSettlementReturnPath({
      periodKey: "2026-06",
      branchId: "",
      dateFrom: "",
      dateTo: "",
    })

    const link = resolveFinanceDocumentBackLink({
      returnTo,
      refType: "POS_SETTLEMENT_COLLECTOR_PICKUP",
      refId: "collector-report-1",
      documentNo: "V-2026-06-00001",
      entryType: null,
      moduleDefaultHref: "/finance/reconciliation",
      moduleDefaultLabel: "← Reconciliation",
    })

    expect(link.href).toBe(
      "/finance/pos-settlement/collector-pickup?period=2026-06"
    )
    expect(link.label).toBe("← V-2026-06-00001")
    expect(
      formatFinanceDocumentBackLabel({
        href: returnTo,
      })
    ).toBe("← Collector Pickup Settlement")
  })
})
