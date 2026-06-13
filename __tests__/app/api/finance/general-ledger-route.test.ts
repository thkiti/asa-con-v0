import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/reports/general-ledger/route"
import { getGeneralLedger } from "@/lib/finance/reports/general-ledger"
import { parseGeneralLedgerFilter } from "@/lib/finance/reports/report-filter"
import { ReportError } from "@/lib/reporting/report-errors"

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
  it("requires branchId", () => {
    expect(() =>
      parseGeneralLedgerFilter(params({ periodKey: "2026-05", accountCode: "1100" }))
    ).toThrow(ReportError)
  })

  it("accepts period scope with accountCode", () => {
    const filter = parseGeneralLedgerFilter(
      params({ branchId: "branch-1", periodKey: "2026-05", accountCode: "1100" })
    )
    expect(filter).toEqual({
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
      })
    )
    expect(filter).toEqual({
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
      )
    )
    expect(filter).toEqual({
      branchId: "branch-1",
      periodKey: "2026-05",
      accountCodes: ["1100", "4000"],
    })
  })

  it("allows all-accounts scope when no account filter is provided", () => {
    const filter = parseGeneralLedgerFilter(
      params({ branchId: "branch-1", periodKey: "2026-05" })
    )
    expect(filter).toEqual({ branchId: "branch-1", periodKey: "2026-05" })
  })
})

describe("GET /api/finance/reports/general-ledger", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("parses filter, calls domain, and returns JSON", async () => {
    const dto = {
      filter: {
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
})
