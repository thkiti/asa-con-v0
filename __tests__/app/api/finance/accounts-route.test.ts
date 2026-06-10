import { NextRequest } from "next/server"
import { GlAccountType } from "@/generated/prisma/client"
import { GET } from "@/app/api/finance/accounts/route"
import { listGlAccounts } from "@/lib/finance/gl-account-list"

jest.mock("@/lib/finance/gl-account-list", () => ({
  listGlAccounts: jest.fn(),
  getGlAccountTree: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

const mockList = listGlAccounts as jest.MockedFunction<typeof listGlAccounts>

describe("GET /api/finance/accounts", () => {
  beforeEach(() => {
    mockList.mockReset()
  })

  it("returns flat account list", async () => {
    mockList.mockResolvedValue({
      accounts: [
        {
          id: "1",
          code: "1100",
          name: "Cash",
          accountType: GlAccountType.ASSET,
          parentId: null,
          parentCode: null,
          parentName: null,
          isActive: true,
          deleted: false,
          hasJournalLines: false,
          childCount: 0,
        },
      ],
      total: 1,
    })

    const req = new NextRequest("http://localhost/api/finance/accounts")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.view).toBe("flat")
    expect(body.total).toBe(1)
  })
})
