import { NextRequest } from "next/server"
import { GET as getGeneralLedgerRoute } from "@/app/api/finance/reports/general-ledger/route"
import { GET as getProfitLossRoute } from "@/app/api/finance/reports/profit-loss/route"
import { GET as getBalanceSheetRoute } from "@/app/api/finance/reports/balance-sheet/route"
import { GET as getTrialBalanceRoute } from "@/app/api/finance/reports/trial-balance/route"
import { resolveReportSessionLegalEntityCode } from "@/lib/finance/reports/report-session"
import { getGeneralLedger } from "@/lib/finance/reports/general-ledger"
import { getProfitLoss } from "@/lib/finance/reports/profit-loss"
import { getBalanceSheet } from "@/lib/finance/reports/balance-sheet"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
import { ReportError } from "@/lib/reporting/report-errors"

jest.mock("@/lib/finance/reports/report-session", () => ({
  resolveReportSessionLegalEntityCode: jest.fn(),
}))

jest.mock("@/lib/finance/reports/report-branch-scope", () => ({
  applyReportBranchScope: jest.fn(async (_prisma: unknown, filter: unknown) => filter),
}))

jest.mock("@/lib/finance/reports/general-ledger", () => ({
  getGeneralLedger: jest.fn(),
}))

jest.mock("@/lib/finance/reports/profit-loss", () => ({
  getProfitLoss: jest.fn(),
}))

jest.mock("@/lib/finance/reports/balance-sheet", () => ({
  getBalanceSheet: jest.fn(),
}))

jest.mock("@/lib/finance/reports/trial-balance", () => ({
  getTrialBalance: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockResolveEntity = resolveReportSessionLegalEntityCode as jest.Mock
const mockGetGeneralLedger = getGeneralLedger as jest.Mock
const mockGetProfitLoss = getProfitLoss as jest.Mock
const mockGetBalanceSheet = getBalanceSheet as jest.Mock
const mockGetTrialBalance = getTrialBalance as jest.Mock

const baseQuery = "periodKey=2026-05"

describe("finance report API routes entity scope", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResolveEntity.mockResolvedValue("AS")
    mockGetGeneralLedger.mockResolvedValue({ filter: {}, accounts: [] })
    mockGetProfitLoss.mockResolvedValue({
      filter: {},
      revenue: [],
      expenses: [],
      totalRevenue: "0",
      totalExpense: "0",
      netIncome: "0",
    })
    mockGetBalanceSheet.mockResolvedValue({
      filter: {},
      assets: [],
      liabilities: [],
      equity: [],
      totalAssets: "0",
      totalLiabilities: "0",
      totalEquity: "0",
      totalLiabilitiesAndEquity: "0",
      balanceDifference: "0",
      isBalanced: true,
    })
    mockGetTrialBalance.mockResolvedValue({
      filter: {},
      rows: [],
      totalDebits: "0",
      totalCredits: "0",
      difference: "0",
      isBalanced: true,
    })
  })

  it.each([
    ["general-ledger", getGeneralLedgerRoute, mockGetGeneralLedger],
    ["profit-loss", getProfitLossRoute, mockGetProfitLoss],
    ["balance-sheet", getBalanceSheetRoute, mockGetBalanceSheet],
    ["trial-balance", getTrialBalanceRoute, mockGetTrialBalance],
  ] as const)(
    "%s uses session entity and ignores client legalEntityCode query",
    async (_name, route, domainMock) => {
      const req = new NextRequest(
        `http://localhost/api/finance/reports/${_name}?${baseQuery}&legalEntityCode=AD&accountCode=1100`
      )
      const res = await route(req)

      expect(res.status).toBe(200)
      expect(mockResolveEntity).toHaveBeenCalled()
      expect(domainMock).toHaveBeenCalledWith(
        expect.objectContaining({ mocked: true }),
        expect.objectContaining({ legalEntityCode: "AS" })
      )
    }
  )

  it.each([
    ["general-ledger", getGeneralLedgerRoute, mockGetGeneralLedger],
    ["profit-loss", getProfitLossRoute, mockGetProfitLoss],
    ["balance-sheet", getBalanceSheetRoute, mockGetBalanceSheet],
    ["trial-balance", getTrialBalanceRoute, mockGetTrialBalance],
  ] as const)("%s returns 401 when session entity is missing", async (_name, route, domainMock) => {
    mockResolveEntity.mockRejectedValue(
      new ReportError("Session legal entity is required", "UNAUTHORIZED")
    )

    const req = new NextRequest(
      `http://localhost/api/finance/reports/${_name}?${baseQuery}`
    )
    const res = await route(req)

    expect(res.status).toBe(401)
    expect(domainMock).not.toHaveBeenCalled()
  })
})
