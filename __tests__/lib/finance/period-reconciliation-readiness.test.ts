import { GlAccountReconciliationRole } from "@/generated/prisma/client"
import {
  buildBankCashCheckReconciliationEvidence,
  loadBankCashCheckReconciliationEvidenceForAccounts,
} from "@/lib/finance/bank-cash-check"
import { loadPeriodReconciliationReadinessSummary } from "@/lib/finance/period-reconciliation-readiness"

jest.mock("@/lib/finance/bank-cash-check", () => {
  const actual = jest.requireActual("@/lib/finance/bank-cash-check")
  return {
    ...actual,
    loadBankCashCheckReconciliationEvidenceForAccounts: jest.fn(
      async (
        _prisma: unknown,
        input: { accounts: readonly { id: string; code: string }[] }
      ) =>
        input.accounts.map((account) =>
          actual.buildBankCashCheckReconciliationEvidence({
            glAccountId: account.id,
            glAccountCode: account.code,
            bankAccountId: null,
            bankAccountLabel: null,
            statementId: null,
            statementNo: null,
            statementStatus: null,
            statementEndingBalance: "0.00",
            bookEndingBalance: "0.00",
            outstandingDeposits: "0.00",
            outstandingCheques: "0.00",
          })
        )
    ),
  }
})

const mockedLoadEvidence = jest.mocked(loadBankCashCheckReconciliationEvidenceForAccounts)

function mockBankAccountsForEntity(
  legalEntityCode: string,
  accounts: Array<{ id: string; code: string; name: string }>
) {
  return {
    findMany: jest.fn(async (args: { where: { legalEntityCode: string } }) => {
      if (args.where.legalEntityCode !== legalEntityCode) return []
      return accounts.map((account) => ({ glAccount: account }))
    }),
  }
}

describe("loadPeriodReconciliationReadinessSummary", () => {
  it("does not reference hardcoded default bank or cash account codes", async () => {
    const prisma = {
      bankAccount: mockBankAccountsForEntity("AS", [
        { id: "bank-2", code: "1021002", name: "Bangkok Bank Current" },
        { id: "bank-3", code: "1021003", name: "Bangkok Bank Savings" },
      ]),
      glAccount: {
        findMany: jest.fn(async (args: { where: { reconciliationRole: string } }) => {
          if (args.where.reconciliationRole === GlAccountReconciliationRole.CASH) {
            return [{ id: "cash-1", code: "1001", name: "Cash drawer" }]
          }
          return []
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
    expect(summary.bank.missingWorksheetAccountCodes).toEqual(["1021002", "1021003"])
    expect(summary.cash.missingWorksheetAccountCodes).toEqual(["1001"])
    expect(prisma.bankAccount.findMany).toHaveBeenCalled()
    expect(prisma.glAccount.findFirst).toBeUndefined()
  })

  it("scopes AD bank readiness to AD-linked bank GL accounts only", async () => {
    const prisma = {
      bankAccount: mockBankAccountsForEntity("AD", [
        { id: "bank-1", code: "1021001", name: "Bangkok Bank AD" },
      ]),
      glAccount: {
        findMany: jest.fn(async (args: { where: { reconciliationRole: string } }) => {
          if (args.where.reconciliationRole === GlAccountReconciliationRole.CASH) {
            return [{ id: "cash-1", code: "1001", name: "Cash drawer" }]
          }
          return []
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
      legalEntityCode: "AD",
      periodKey: "2026-01",
      branchId: "branch-1",
    })

    expect(summary.bank.missingWorksheetAccountCodes).toEqual(["1021001"])
    expect(summary.bank.configuredAccounts.map((account) => account.code)).toEqual([
      "1021001",
    ])
  })

  it("skips reconciliation requirements for opening balance period 2025-12", async () => {
    const prisma = {
      bankAccount: {
        findMany: jest.fn(),
      },
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
    expect(prisma.bankAccount.findMany).not.toHaveBeenCalled()
    expect(prisma.glAccount.findMany).not.toHaveBeenCalled()
    expect(prisma.bankReconciliation.findMany).not.toHaveBeenCalled()
    expect(prisma.cashReconciliation.findMany).not.toHaveBeenCalled()
  })

  it("marks readiness complete when all configured accounts are confirmed", async () => {
    const prisma = {
      bankAccount: mockBankAccountsForEntity("AS", [
        { id: "bank-2", code: "1021002", name: "Bangkok Bank Current" },
      ]),
      glAccount: {
        findMany: jest.fn(async (args: { where: { reconciliationRole: string } }) => {
          if (args.where.reconciliationRole === GlAccountReconciliationRole.CASH) {
            return [{ id: "cash-1", code: "1001", name: "Cash drawer" }]
          }
          return []
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
            glAccount: { code: "1021002" },
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

  it("marks bank reconciliation complete for 2026-01 when Bank Cash Check is READY with zero variance", async () => {
    mockedLoadEvidence.mockResolvedValueOnce([
      buildBankCashCheckReconciliationEvidence({
        glAccountId: "bank-1",
        glAccountCode: "1021001",
        bankAccountId: "bank-bbl",
        bankAccountLabel: "Bangkok Bank 2193020266",
        statementId: "stmt-1",
        statementNo: "BS-2026-01-001",
        statementStatus: "READY",
        statementEndingBalance: "638317.53",
        bookEndingBalance: "638317.53",
        outstandingDeposits: "0.00",
        outstandingCheques: "0.00",
      }),
    ])

    const prisma = {
      bankAccount: mockBankAccountsForEntity("AD", [
        { id: "bank-1", code: "1021001", name: "Bangkok Bank AD" },
      ]),
      glAccount: {
        findMany: jest.fn(async (args: { where: { reconciliationRole: string } }) => {
          if (args.where.reconciliationRole === GlAccountReconciliationRole.CASH) {
            return [{ id: "cash-1", code: "1001", name: "Cash drawer" }]
          }
          return []
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
      legalEntityCode: "AD",
      periodKey: "2026-01",
      branchId: "branch-1",
    })

    expect(summary.bank.completed).toBe(true)
    expect(summary.bank.missingWorksheetAccountCodes).toEqual([])
    expect(summary.bank.completedViaBankCashCheckAccountCodes).toEqual(["1021001"])
    expect(summary.bank.bankCashCheckEvidence[0]?.complete).toBe(true)
  })
})
