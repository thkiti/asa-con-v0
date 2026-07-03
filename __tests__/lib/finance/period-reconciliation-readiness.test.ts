import { GlAccountReconciliationRole } from "@/generated/prisma/client"
import { loadPeriodReconciliationReadinessSummary } from "@/lib/finance/period-reconciliation-readiness"

describe("loadPeriodReconciliationReadinessSummary", () => {
  it("does not reference hardcoded default bank or cash account codes", async () => {
    const prisma = {
      glAccount: {
        findMany: jest.fn(async (args: { where: { reconciliationRole: string } }) => {
          if (args.where.reconciliationRole === GlAccountReconciliationRole.BANK) {
            return [{ id: "bank-1", code: "1021001", name: "Bank A" }]
          }
          return [{ id: "cash-1", code: "1001", name: "Cash drawer" }]
        }),
      },
      bankReconciliation: {
        findMany: jest.fn(async () => []),
      },
      cashReconciliation: {
        findMany: jest.fn(async () => []),
      },
    }

    const summary = await loadPeriodReconciliationReadinessSummary(prisma, {
      legalEntityCode: "AS",
      periodKey: "2026-01",
      branchId: "branch-1",
    })

    expect(summary.applies).toBe(true)
    expect(summary.bank.required).toBe(true)
    expect(summary.bank.missingWorksheetAccountCodes).toEqual(["1021001"])
    expect(summary.cash.missingWorksheetAccountCodes).toEqual(["1001"])
    expect(prisma.glAccount.findMany).toHaveBeenCalled()
    expect(prisma.glAccount.findFirst).toBeUndefined()
  })

  it("skips reconciliation requirements for opening balance period 2025-12", async () => {
    const prisma = {
      glAccount: {
        findMany: jest.fn(),
      },
      bankReconciliation: {
        findMany: jest.fn(),
      },
      cashReconciliation: {
        findMany: jest.fn(),
      },
    }

    const summary = await loadPeriodReconciliationReadinessSummary(prisma, {
      legalEntityCode: "AS",
      periodKey: "2025-12",
      branchId: "branch-1",
    })

    expect(summary.applies).toBe(false)
    expect(prisma.glAccount.findMany).not.toHaveBeenCalled()
    expect(prisma.bankReconciliation.findMany).not.toHaveBeenCalled()
    expect(prisma.cashReconciliation.findMany).not.toHaveBeenCalled()
  })

  it("marks readiness complete when all configured accounts are confirmed", async () => {
    const prisma = {
      glAccount: {
        findMany: jest.fn(async (args: { where: { reconciliationRole: string } }) => {
          if (args.where.reconciliationRole === GlAccountReconciliationRole.BANK) {
            return [{ id: "bank-1", code: "1021001", name: "Bank A" }]
          }
          return [{ id: "cash-1", code: "1001", name: "Cash drawer" }]
        }),
      },
      bankReconciliation: {
        findMany: jest.fn(async () => [
          {
            id: "br-1",
            status: "CONFIRMED",
            variance: { toFixed: () => "0.00" },
            evidenceNote: "stmt.pdf",
            branchId: null,
            glAccount: { code: "1021001" },
          },
        ]),
      },
      cashReconciliation: {
        findMany: jest.fn(async () => [
          {
            id: "cr-1",
            status: "LOCKED",
            variance: { toFixed: () => "0.00" },
            evidenceNote: "count sheet",
            branchId: "branch-1",
            glAccount: { code: "1001" },
          },
        ]),
      },
    }

    const summary = await loadPeriodReconciliationReadinessSummary(prisma, {
      legalEntityCode: "AS",
      periodKey: "2026-02",
      branchId: "branch-1",
    })

    expect(summary.bank.completed).toBe(true)
    expect(summary.cash.completed).toBe(true)
    expect(summary.bank.missingWorksheetAccountCodes).toEqual([])
    expect(summary.cash.missingWorksheetAccountCodes).toEqual([])
  })
})
