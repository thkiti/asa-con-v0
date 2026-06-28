jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth")
  return {
    ...actual,
    getSession: jest.fn(),
    requirePeriodAdminActor: jest.fn(),
  }
})

jest.mock("@/lib/finance/pos-settlement/settlement-branches", () => ({
  listPosSettlementShopBranches: jest.fn(),
}))

import { GET } from "@/app/api/finance/pos-settlement/branches/route"
import { getSession, PeriodAdminAuthError, requirePeriodAdminActor } from "@/lib/auth"
import { listPosSettlementShopBranches } from "@/lib/finance/pos-settlement/settlement-branches"

const mockListBranches = listPosSettlementShopBranches as jest.Mock

const financeActor = { staffId: "staff-finance", role: "HO_FINANCE" as const }
const sessionAs = { documentEntityCode: "AS" as const, staffId: "staff-finance", role: "HO_FINANCE" }

describe("GET /api/finance/pos-settlement/branches", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue(financeActor)
    mockListBranches.mockResolvedValue([
      { id: "branch-sh001", code: "SH001", name: "Chidlom" },
    ])
  })

  it("returns active SH branches for finance user", async () => {
    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      items: [{ id: "branch-sh001", code: "SH001", name: "Chidlom" }],
    })
    expect(mockListBranches).toHaveBeenCalled()
  })

  it("rejects non-finance shop staff", async () => {
    ;(requirePeriodAdminActor as jest.Mock).mockImplementation(() => {
      throw new PeriodAdminAuthError(
        "Insufficient permissions for period admin",
        "FORBIDDEN",
        403
      )
    })

    const res = await GET()

    expect(res.status).toBe(403)
    expect(mockListBranches).not.toHaveBeenCalled()
  })
})
