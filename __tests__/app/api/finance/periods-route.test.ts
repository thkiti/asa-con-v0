import { NextRequest } from "next/server"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { listAccountingPeriods } from "@/lib/finance/period-list"
import { GET } from "@/app/api/finance/periods/route"

jest.mock("@/lib/finance/period-list", () => ({
  listAccountingPeriods: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockList = listAccountingPeriods as jest.MockedFunction<
  typeof listAccountingPeriods
>

describe("GET finance/periods", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("calls listAccountingPeriods and returns periods DTO", async () => {
    const openedAt = new Date("2026-05-01T00:00:00.000Z")
    mockList.mockResolvedValue([
      {
        id: "period-1",
        periodKey: "2026-05",
        branchId: "branch-1",
        branchName: "Main Shop",
        status: AccountingPeriodStatus.OPEN,
        openedAt,
        closedAt: null,
      },
    ])

    const req = new NextRequest(
      "http://localhost/api/finance/periods?branchId=branch-1"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      periods: [
        {
          id: "period-1",
          periodKey: "2026-05",
          branchId: "branch-1",
          branchName: "Main Shop",
          status: AccountingPeriodStatus.OPEN,
          openedAt: openedAt.toISOString(),
          closedAt: null,
        },
      ],
    })
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      { branchId: "branch-1" }
    )
  })

  it("omits branchId filter when query param is blank", async () => {
    mockList.mockResolvedValue([])

    const req = new NextRequest("http://localhost/api/finance/periods?branchId=  ")
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      { branchId: undefined }
    )
  })
})
