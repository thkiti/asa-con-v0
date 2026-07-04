import {
  formatAccountingPeriodSelectedTooltip,
  isAccountingPeriodKeyInList,
  pickLatestAccountingPeriodKey,
  resolveFinancePeriodFilterKey,
  sortAccountingPeriodsDesc,
} from "@/lib/finance-ui/accounting-period-filter"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"

const samplePeriods: AccountingPeriodRow[] = [
  {
    id: "p1",
    periodKey: "2026-01",
    legalEntityCode: "AD",
    branchId: "b1",
    branchName: "HQ",
    status: "OPEN",
    openedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
  },
  {
    id: "p2",
    periodKey: "2025-12",
    legalEntityCode: "AD",
    branchId: "b1",
    branchName: "HQ",
    status: "HARD_CLOSED",
    openedAt: "2025-12-01T00:00:00.000Z",
    closedAt: "2026-01-02T00:00:00.000Z",
  },
]

describe("accounting-period-filter", () => {
  it("sorts periods descending by periodKey", () => {
    expect(sortAccountingPeriodsDesc(samplePeriods).map((row) => row.periodKey)).toEqual([
      "2026-01",
      "2025-12",
    ])
  })

  it("picks latest period key", () => {
    expect(pickLatestAccountingPeriodKey(samplePeriods)).toBe("2026-01")
  })

  it("prefers valid URL periodKey over default", () => {
    expect(
      resolveFinancePeriodFilterKey({
        periods: samplePeriods,
        urlPeriodKey: "2025-12",
      })
    ).toBe("2025-12")
  })

  it("falls back when URL periodKey is not in list", () => {
    expect(
      resolveFinancePeriodFilterKey({
        periods: samplePeriods,
        urlPeriodKey: "2099-01",
      })
    ).toBe("2026-01")
  })

  it("detects membership in period list", () => {
    expect(isAccountingPeriodKeyInList("2026-01", samplePeriods)).toBe(true)
    expect(isAccountingPeriodKeyInList("2026-02", samplePeriods)).toBe(false)
  })

  it("formats selected period tooltip with title-case status", () => {
    expect(formatAccountingPeriodSelectedTooltip(samplePeriods[0]!)).toBe("2026-01 • Open")
    expect(formatAccountingPeriodSelectedTooltip(samplePeriods[1]!)).toBe("2025-12 • Hard closed")
  })
})
