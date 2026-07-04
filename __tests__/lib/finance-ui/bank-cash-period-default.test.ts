import type { BankStatementStatus } from "@/lib/finance/bank-statement/bank-statement-types"
import {
  buildBankCashCheckStatementStatusByPeriod,
  findLatestConsecutiveReadyPeriodIndex,
  isBankCashCheckPeriodCompleted,
  resolveBankCashCheckPeriodFilterKey,
  sortAccountingPeriodsAsc,
} from "@/lib/finance-ui/bank-cash-period-default"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"

function period(periodKey: string): AccountingPeriodRow {
  return {
    id: `p-${periodKey}`,
    periodKey,
    legalEntityCode: "AD",
    branchId: "b1",
    branchName: "HQ",
    status: "OPEN",
    openedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
  }
}

function statusMap(
  entries: Array<[string, BankStatementStatus | undefined]>
): Map<string, BankStatementStatus | undefined> {
  return new Map(entries)
}

describe("bank-cash-period-default", () => {
  const periods = [
    period("2026-01"),
    period("2026-02"),
    period("2026-03"),
    period("2026-06"),
  ]

  it("sorts accounting periods ascending for workflow order", () => {
    expect(sortAccountingPeriodsAsc(periods).map((row) => row.periodKey)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-06",
    ])
  })

  it("treats READY as completed and missing/NEW/DRAFT as actionable", () => {
    expect(isBankCashCheckPeriodCompleted("READY")).toBe(true)
    expect(isBankCashCheckPeriodCompleted("DRAFT")).toBe(false)
    expect(isBankCashCheckPeriodCompleted("NEW")).toBe(false)
    expect(isBankCashCheckPeriodCompleted(undefined)).toBe(false)
  })

  it("defaults to the first operating period when no bank check has been completed", () => {
    const result = resolveBankCashCheckPeriodFilterKey({
      periods,
      statementStatusByPeriodKey: statusMap([]),
    })

    expect(result).toEqual({
      periodKey: "2026-01",
      allPeriodsCompleted: false,
    })
  })

  it("defaults to the next sequential period when 2026-01 is READY and 2026-02 is missing", () => {
    const result = resolveBankCashCheckPeriodFilterKey({
      periods,
      statementStatusByPeriodKey: statusMap([["2026-01", "READY"]]),
    })

    expect(result).toEqual({
      periodKey: "2026-02",
      allPeriodsCompleted: false,
    })
  })

  it("defaults to 2026-01 when its statement is still DRAFT", () => {
    const result = resolveBankCashCheckPeriodFilterKey({
      periods,
      statementStatusByPeriodKey: statusMap([["2026-01", "DRAFT"]]),
    })

    expect(result.periodKey).toBe("2026-01")
    expect(result.allPeriodsCompleted).toBe(false)
  })

  it("defaults to 2026-03 when 2026-01 and 2026-02 are READY", () => {
    const result = resolveBankCashCheckPeriodFilterKey({
      periods,
      statementStatusByPeriodKey: statusMap([
        ["2026-01", "READY"],
        ["2026-02", "READY"],
      ]),
    })

    expect(result.periodKey).toBe("2026-03")
    expect(result.periodKey).not.toBe("2026-06")
  })

  it("does not jump to a later period when an earlier month is still open", () => {
    const result = resolveBankCashCheckPeriodFilterKey({
      periods,
      statementStatusByPeriodKey: statusMap([
        ["2026-03", "READY"],
      ]),
    })

    expect(result.periodKey).toBe("2026-01")
  })

  it("respects explicit URL periodKey", () => {
    const result = resolveBankCashCheckPeriodFilterKey({
      periods,
      urlPeriodKey: "2026-06",
      statementStatusByPeriodKey: statusMap([["2026-01", "READY"]]),
    })

    expect(result).toEqual({
      periodKey: "2026-06",
      allPeriodsCompleted: false,
    })
  })

  it("defaults to latest period when every listed period is READY", () => {
    const result = resolveBankCashCheckPeriodFilterKey({
      periods,
      statementStatusByPeriodKey: statusMap([
        ["2026-01", "READY"],
        ["2026-02", "READY"],
        ["2026-03", "READY"],
        ["2026-06", "READY"],
      ]),
    })

    expect(result).toEqual({
      periodKey: "2026-06",
      allPeriodsCompleted: true,
    })
  })

  it("tracks consecutive READY prefix before selecting the next month", () => {
    const sorted = sortAccountingPeriodsAsc(periods)
    const statuses = statusMap([
      ["2026-01", "READY"],
      ["2026-02", "READY"],
      ["2026-03", "DRAFT"],
    ])

    expect(findLatestConsecutiveReadyPeriodIndex(sorted, statuses)).toBe(1)
  })

  it("prefers actionable statement status when multiple rows exist for one period", () => {
    const map = buildBankCashCheckStatementStatusByPeriod([
      {
        periodKey: "2026-01",
        status: "READY",
      },
      {
        periodKey: "2026-01",
        status: "DRAFT",
      },
    ])

    expect(map.get("2026-01")).toBe("DRAFT")
  })
})
