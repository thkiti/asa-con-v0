import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/reports/changes-in-equity/route"
import { getChangesInEquity } from "@/lib/finance/reports/changes-in-equity"
import { parseChangesInEquityFilter } from "@/lib/finance/reports/report-filter"
import { ReportError } from "@/lib/reporting/report-errors"

jest.mock("@/lib/finance/reports/report-session", () => ({
  resolveReportSessionLegalEntityCode: jest.fn().mockResolvedValue("AS"),
}))

jest.mock("@/lib/finance/reports/changes-in-equity", () => ({
  getChangesInEquity: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockGetChangesInEquity = getChangesInEquity as jest.MockedFunction<
  typeof getChangesInEquity
>

function params(input: Record<string, string>): { get: (name: string) => string | null } {
  return {
    get: (name: string) => input[name] ?? null,
  }
}

describe("parseChangesInEquityFilter", () => {
  const legalEntityCode = "AS" as const

  it("requires branchId", () => {
    expect(() =>
      parseChangesInEquityFilter(params({ periodKey: "2026-05" }), legalEntityCode)
    ).toThrow(ReportError)
  })

  it("accepts period scope", () => {
    const filter = parseChangesInEquityFilter(
      params({ branchId: "branch-1", periodKey: "2026-05" }),
      legalEntityCode
    )
    expect(filter).toEqual({
      legalEntityCode: "AS",
      branchId: "branch-1",
      periodKey: "2026-05",
    })
  })

  it("accepts date range scope", () => {
    const filter = parseChangesInEquityFilter(
      params({ branchId: "branch-1", from: "2026-05-01", to: "2026-05-31" }),
      legalEntityCode
    )
    expect(filter).toEqual({
      legalEntityCode: "AS",
      branchId: "branch-1",
      from: "2026-05-01",
      to: "2026-05-31",
    })
  })
})

describe("GET /api/finance/reports/changes-in-equity", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("parses filter, calls domain, and returns JSON", async () => {
    const dto = {
      filter: { legalEntityCode: "AS", branchId: "branch-1", periodKey: "2026-05" },
      period: { legalEntityCode: "AS", periodKey: "2026-05" },
      columns: [],
      rows: [],
      profitForPeriod: "0",
      profitSource: "PROFIT_LOSS" as const,
      retainedEarningsAccountCode: "301",
      activeClosingEntry: null,
      reconciliation: {
        isBalanced: true,
        columnDifferences: {},
        totalDifference: "0",
      },
      warnings: [],
    }
    mockGetChangesInEquity.mockResolvedValue(dto)

    const req = new NextRequest(
      "http://localhost/api/finance/reports/changes-in-equity?branchId=branch-1&periodKey=2026-05"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(dto)
    expect(mockGetChangesInEquity).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      { legalEntityCode: "AS", branchId: "branch-1", periodKey: "2026-05" }
    )
  })

  it("returns 400 for invalid filter", async () => {
    const req = new NextRequest(
      "http://localhost/api/finance/reports/changes-in-equity?branchId=branch-1&periodKey=bad"
    )
    const res = await GET(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "periodKey must be YYYY-MM",
      code: "INVALID_FILTER",
    })
    expect(mockGetChangesInEquity).not.toHaveBeenCalled()
  })
})
