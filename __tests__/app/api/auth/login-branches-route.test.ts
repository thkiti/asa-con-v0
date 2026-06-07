import { GET } from "@/app/api/auth/login-branches/route"

jest.mock("@/lib/shop", () => ({
  listActiveShopBranches: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { listActiveShopBranches } from "@/lib/shop"

const mockedList = listActiveShopBranches as jest.MockedFunction<
  typeof listActiveShopBranches
>

describe("GET /api/auth/login-branches", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedList.mockResolvedValue([
      { id: "branch-sh-1", code: "SH001", name: "Shop 1" },
    ])
  })

  it("returns active shop branches", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      branches: [{ id: "branch-sh-1", code: "SH001", name: "Shop 1" }],
    })
    expect(mockedList).toHaveBeenCalled()
  })
})
