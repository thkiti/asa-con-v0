import {
  buildCollectorPickupSettlementReturnPath,
  COLLECTOR_PICKUP_SETTLEMENT_PATH,
  parseCollectorPickupSettlementFilterFromSearchParams,
} from "@/lib/finance-ui/collector-pickup-settlement"
import {
  buildFinanceVoucherDetailPath,
  formatFinanceDocumentBackLabel,
  resolveFinanceDocumentBackLink,
} from "@/lib/finance-ui/finance-navigation"

describe("collector pickup settlement navigation", () => {
  it("builds return path with branch and date filters", () => {
    expect(
      buildCollectorPickupSettlementReturnPath({
        branchId: "branch-sh001",
        from: "2026-06-01",
        to: "2026-06-30",
      })
    ).toBe(
      `${COLLECTOR_PICKUP_SETTLEMENT_PATH}?branchId=branch-sh001&from=2026-06-01&to=2026-06-30`
    )
  })

  it("parses filter values from search params", () => {
    const params = new URLSearchParams(
      "branchId=branch-sh001&from=2026-06-01&to=2026-06-30"
    )
    expect(parseCollectorPickupSettlementFilterFromSearchParams(params)).toEqual({
      branchId: "branch-sh001",
      from: "2026-06-01",
      to: "2026-06-30",
    })
  })

  it("embeds settlement return path in voucher drill-down links", () => {
    const returnTo = buildCollectorPickupSettlementReturnPath({
      branchId: "branch-sh001",
      from: "2026-06-01",
      to: "2026-06-30",
    })
    const href = buildFinanceVoucherDetailPath("voucher-pickup-1", returnTo)

    expect(href).toContain("/finance/vouchers/voucher-pickup-1")
    expect(href).toContain(
      encodeURIComponent(
        "/finance/pos-settlement/collector-pickup?branchId=branch-sh001&from=2026-06-01&to=2026-06-30"
      )
    )
  })

  it("resolves voucher back link to collector pickup settlement with filters", () => {
    const returnTo = buildCollectorPickupSettlementReturnPath({
      from: "2026-06-01",
      to: "2026-06-30",
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
      "/finance/pos-settlement/collector-pickup?from=2026-06-01&to=2026-06-30"
    )
    expect(link.label).toBe("← V-2026-06-00001")
    expect(
      formatFinanceDocumentBackLabel({
        href: returnTo,
      })
    ).toBe("← Collector Pickup Settlement")
  })
})
