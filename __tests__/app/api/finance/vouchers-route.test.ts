import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/vouchers/route"
import { listFinanceVouchers } from "@/lib/finance/inquiry/voucher-list"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { prisma } from "@/lib/shared/prisma"
import { PeriodAdminAuthError } from "@/lib/auth"

jest.mock("@/lib/finance/inquiry/voucher-list", () => ({
  listFinanceVouchers: jest.fn(),
}))

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth")
  return {
    ...actual,
    getSession: jest.fn(),
    requirePeriodAdminActor: jest.fn(),
  }
})

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockListFinanceVouchers = listFinanceVouchers as jest.MockedFunction<
  typeof listFinanceVouchers
>

const sessionAs = { documentEntityCode: "AS" as const }

describe("GET finance/vouchers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({ staffId: "staff-1" })
    mockListFinanceVouchers.mockResolvedValue({ vouchers: [], total: 0 })
  })

  it("returns voucher list scoped to session entity", async () => {
    mockListFinanceVouchers.mockResolvedValue({
      vouchers: [
        {
          id: "voucher-1",
          voucherNo: "V-2026-06-00001",
          date: "2026-06-14T00:00:00.000Z",
          legalEntityCode: "AS",
          periodKey: "2026-06",
          refType: "POS_SETTLEMENT_COLLECTOR_PICKUP",
          refNo: "COL-260001",
          description: null,
          status: "POSTED",
          totalDebit: "1000",
          totalCredit: "1000",
        },
      ],
      total: 1,
    })

    const req = new NextRequest(
      "http://localhost/api/finance/vouchers?refNo=COL-260001&from=2026-06-01&to=2026-06-30"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      vouchers: [
        expect.objectContaining({
          voucherNo: "V-2026-06-00001",
          refNo: "COL-260001",
        }),
      ],
      total: 1,
    })
    expect(mockListFinanceVouchers).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        legalEntityCode: "AS",
        refNo: "COL-260001",
      })
    )
  })

  it("blocks unauthorized roles", async () => {
    ;(requirePeriodAdminActor as jest.Mock).mockImplementation(() => {
      throw new PeriodAdminAuthError("Insufficient permissions", "FORBIDDEN", 403)
    })

    const req = new NextRequest("http://localhost/api/finance/vouchers")
    const res = await GET(req)

    expect(res.status).toBe(403)
    expect(mockListFinanceVouchers).not.toHaveBeenCalled()
  })
})
