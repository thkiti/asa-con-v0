import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/reports/general-ledger/route"
import { getGeneralLedger } from "@/lib/finance/reports/general-ledger"
import { parseGeneralLedgerFilter } from "@/lib/finance/reports/report-filter"
import { ReportError } from "@/lib/reporting/report-errors"

jest.mock("@/lib/finance/reports/report-session", () => ({
  resolveReportSessionLegalEntityCode: jest.fn().mockResolvedValue("AS"),
}))

jest.mock("@/lib/finance/reports/report-branch-scope", () => ({
  applyReportBranchScope: jest.fn(async (_prisma: unknown, filter: unknown) => filter),
}))

jest.mock("@/lib/finance/reports/general-ledger", () => ({
  getGeneralLedger: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockGetGeneralLedger = getGeneralLedger as jest.MockedFunction<typeof getGeneralLedger>

function params(
  input: Record<string, string>,
  repeated: Record<string, string[]> = {}
): {
  get: (name: string) => string | null
  getAll: (name: string) => string[]
} {
  return {
    get: (name: string) => input[name] ?? null,
    getAll: (name: string) => repeated[name] ?? [],
  }
}

describe("parseGeneralLedgerFilter", () => {
  const legalEntityCode = "AS" as const

  it("accepts period scope without branchId", () => {
    const filter = parseGeneralLedgerFilter(
      params({ periodKey: "2026-05", accountCode: "1100" }),
      legalEntityCode
    )
    expect(filter).toEqual({
      legalEntityCode: "AS",
      periodKey: "2026-05",
      accountCode: "1100",
    })
  })

  it("accepts period scope with optional branchId", () => {
    const filter = parseGeneralLedgerFilter(
      params({ branchId: "branch-1", periodKey: "2026-05", accountCode: "1100" }),
      legalEntityCode
    )
    expect(filter).toEqual({
      legalEntityCode: "AS",
      branchId: "branch-1",
      periodKey: "2026-05",
      accountCode: "1100",
    })
  })

  it("accepts date range scope with accountId", () => {
    const filter = parseGeneralLedgerFilter(
      params({
        branchId: "branch-1",
        from: "2026-05-01",
        to: "2026-05-31",
        accountId: "acct-1",
      }),
      legalEntityCode
    )
    expect(filter).toEqual({
      legalEntityCode: "AS",
      branchId: "branch-1",
      from: "2026-05-01",
      to: "2026-05-31",
      accountId: "acct-1",
    })
  })

  it("accepts multiple accountCodes", () => {
    const filter = parseGeneralLedgerFilter(
      params(
        { branchId: "branch-1", periodKey: "2026-05" },
        { accountCodes: ["1100", "4000"] }
      ),
      legalEntityCode
    )
    expect(filter).toEqual({
      legalEntityCode: "AS",
      branchId: "branch-1",
      periodKey: "2026-05",
      accountCodes: ["1100", "4000"],
    })
  })

  it("allows all-accounts scope when no account filter is provided", () => {
    const filter = parseGeneralLedgerFilter(
      params({ branchId: "branch-1", periodKey: "2026-05" }),
      legalEntityCode
    )
    expect(filter).toEqual({
      legalEntityCode: "AS",
      branchId: "branch-1",
      periodKey: "2026-05",
    })
  })
})

describe("GET /api/finance/reports/general-ledger", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("parses filter without branchId, calls domain, and returns JSON", async () => {
    const dto = {
      filter: {
        legalEntityCode: "AS",
        periodKey: "2026-05",
        accountCode: "1100",
      },
      accounts: [],
    }
    mockGetGeneralLedger.mockResolvedValue(dto)

    const req = new NextRequest(
      "http://localhost/api/finance/reports/general-ledger?periodKey=2026-05&accountCode=1100"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(dto)
    expect(mockGetGeneralLedger).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      {
        legalEntityCode: "AS",
        periodKey: "2026-05",
        accountCode: "1100",
      }
    )
  })

  it("parses filter with branchId, calls domain, and returns JSON", async () => {
    const dto = {
      filter: {
        legalEntityCode: "AS",
        branchId: "branch-1",
        periodKey: "2026-05",
        accountCode: "1100",
      },
      accounts: [],
    }
    mockGetGeneralLedger.mockResolvedValue(dto)

    const req = new NextRequest(
      "http://localhost/api/finance/reports/general-ledger?branchId=branch-1&periodKey=2026-05&accountCode=1100"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(dto)
    expect(mockGetGeneralLedger).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      {
        legalEntityCode: "AS",
        branchId: "branch-1",
        periodKey: "2026-05",
        accountCode: "1100",
      }
    )
  })

  it("returns 400 for invalid filter", async () => {
    const req = new NextRequest(
      "http://localhost/api/finance/reports/general-ledger?branchId=branch-1&periodKey=bad&accountCode=1100"
    )
    const res = await GET(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "periodKey must be YYYY-MM",
      code: "INVALID_FILTER",
    })
    expect(mockGetGeneralLedger).not.toHaveBeenCalled()
  })

  it("returns 401 when session documentEntityCode is missing", async () => {
    const { resolveReportSessionLegalEntityCode } = await import(
      "@/lib/finance/reports/report-session"
    )
    ;(resolveReportSessionLegalEntityCode as jest.Mock).mockRejectedValueOnce(
      new ReportError("Session legal entity is required", "UNAUTHORIZED")
    )

    const req = new NextRequest(
      "http://localhost/api/finance/reports/general-ledger?branchId=branch-1&periodKey=2026-05&accountCode=1100"
    )
    const res = await GET(req)

    expect(res.status).toBe(401)
    expect(mockGetGeneralLedger).not.toHaveBeenCalled()
  })
})
