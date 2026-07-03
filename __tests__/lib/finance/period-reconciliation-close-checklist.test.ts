import { buildCloseChecklist } from "@/lib/finance/close-checklist"
import type { PeriodReconciliationReadinessSummary } from "@/lib/finance/period-reconciliation-readiness"

const basePeriod = {
  id: "period-1",
  legalEntityCode: "ASAS",
  branchId: "branch-1",
  periodKey: "2026-01",
  status: "OPEN" as const,
  closedAt: null,
}

const configuredBankAccount = {
  id: "bank-1",
  code: "1021001",
  name: "Bangkok Bank Current",
}

const configuredCashAccount = {
  id: "cash-1",
  code: "1001",
  name: "Cash in drawer",
}

const periodReconciliationBlocked: PeriodReconciliationReadinessSummary = {
  applies: true,
  bank: {
    required: true,
    configuredAccounts: [configuredBankAccount],
    records: [],
    completed: false,
    missingWorksheetAccountCodes: ["1021001"],
    incompleteWorksheetAccountCodes: [],
    unresolvedVarianceCount: 0,
    missingEvidenceCount: 0,
  },
  cash: {
    required: true,
    configuredAccounts: [configuredCashAccount],
    records: [],
    completed: false,
    missingWorksheetAccountCodes: ["1001"],
    incompleteWorksheetAccountCodes: [],
    unresolvedVarianceCount: 0,
    missingEvidenceCount: 0,
  },
}

describe("buildCloseChecklist period reconciliation", () => {
  it("adds bank and cash blockers when configured worksheets are missing", () => {
    const checklist = buildCloseChecklist({
      period: basePeriod,
      latestSnapshot: null,
      periodReconciliation: periodReconciliationBlocked,
    })

    expect(checklist.items.some((item) => item.id === "bank-reconciliation-missing")).toBe(
      true
    )
    expect(checklist.items.some((item) => item.id === "cash-reconciliation-missing")).toBe(
      true
    )
    expect(checklist.status).toBe("BLOCKED")
  })

  it("warns when no reconciliation accounts are configured", () => {
    const checklist = buildCloseChecklist({
      period: basePeriod,
      latestSnapshot: null,
      periodReconciliation: {
        applies: true,
        bank: {
          required: false,
          configuredAccounts: [],
          records: [],
          completed: true,
          missingWorksheetAccountCodes: [],
          incompleteWorksheetAccountCodes: [],
          unresolvedVarianceCount: 0,
          missingEvidenceCount: 0,
        },
        cash: {
          required: false,
          configuredAccounts: [],
          records: [],
          completed: true,
          missingWorksheetAccountCodes: [],
          incompleteWorksheetAccountCodes: [],
          unresolvedVarianceCount: 0,
          missingEvidenceCount: 0,
        },
      },
    })

    expect(
      checklist.items.some((item) => item.id === "bank-reconciliation-not-configured")
    ).toBe(true)
    expect(
      checklist.items.some((item) => item.id === "cash-reconciliation-not-configured")
    ).toBe(true)
    expect(
      checklist.items.some((item) => item.id === "bank-reconciliation-missing")
    ).toBe(false)
  })

  it("skips bank/cash rules for opening balance period summary", () => {
    const checklist = buildCloseChecklist({
      period: { ...basePeriod, periodKey: "2025-12" },
      latestSnapshot: null,
      periodReconciliation: {
        applies: false,
        bank: {
          required: false,
          configuredAccounts: [],
          records: [],
          completed: true,
          missingWorksheetAccountCodes: [],
          incompleteWorksheetAccountCodes: [],
          unresolvedVarianceCount: 0,
          missingEvidenceCount: 0,
        },
        cash: {
          required: false,
          configuredAccounts: [],
          records: [],
          completed: true,
          missingWorksheetAccountCodes: [],
          incompleteWorksheetAccountCodes: [],
          unresolvedVarianceCount: 0,
          missingEvidenceCount: 0,
        },
      },
    })

    expect(
      checklist.items.some((item) => item.id === "bank-reconciliation-missing")
    ).toBe(false)
  })
})
