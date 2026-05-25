import { parseReconciliationFilter } from "@/app/api/finance/shared/parse-finance-filter"
import { InvalidDateRangeError } from "@/lib/reporting/report-errors"

function params(entries: Record<string, string>): URLSearchParams {
  return new URLSearchParams(entries)
}

describe("parseReconciliationFilter", () => {
  it("returns optional branchId and date strings when valid", () => {
    expect(
      parseReconciliationFilter(
        params({
          branchId: " branch-1 ",
          from: "2026-05-01",
          to: "2026-05-31",
        })
      )
    ).toEqual({
      branchId: "branch-1",
      from: "2026-05-01",
      to: "2026-05-31",
    })
  })

  it("omits empty branchId and dates", () => {
    expect(parseReconciliationFilter(params({}))).toEqual({})
  })

  it("throws InvalidDateRangeError for invalid from date", () => {
    expect(() =>
      parseReconciliationFilter(params({ from: "not-a-date" }))
    ).toThrow(InvalidDateRangeError)
  })

  it("throws InvalidDateRangeError when from is after to", () => {
    expect(() =>
      parseReconciliationFilter(
        params({ from: "2026-05-10", to: "2026-05-01" })
      )
    ).toThrow(InvalidDateRangeError)
  })
})

describe("parseReconciliationFilter via inventory route 400 path", () => {
  const { reconcileInventory } = jest.requireMock("@/lib/finance/reconciliation") as {
    reconcileInventory: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns 400 when filter parsing fails", async () => {
    const { NextRequest } = await import("next/server")
    const { GET } = await import("@/app/api/finance/reconciliation/inventory/route")
    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/inventory?from=bad-date"
    )

    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe("INVALID_DATE_RANGE")
    expect(reconcileInventory).not.toHaveBeenCalled()
  })
})

jest.mock("@/lib/finance/reconciliation", () => ({
  reconcileInventory: jest.fn(),
  reconcileSalesAndTender: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))
