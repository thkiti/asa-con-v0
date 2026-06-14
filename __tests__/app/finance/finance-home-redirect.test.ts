jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

import { redirect } from "next/navigation"
import Page from "@/app/(main)/finance/page"

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/components/finance/FinanceMenuView", () => ({
  FinanceMenuView: () => null,
}))

import { getSession } from "@/lib/auth"

describe("/finance home", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirects unauthenticated users to login", async () => {
    jest.mocked(getSession).mockResolvedValue(null)
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT:/login")
  })

  it("renders finance menu for HO_FINANCE", async () => {
    jest.mocked(getSession).mockResolvedValue({
      userId: "u1",
      staffId: "001",
      name: "Finance",
      role: "HO_FINANCE",
      branchId: "b1",
      branchCode: "HO999",
      branchName: "Head Office",
      documentEntityCode: "AS",
    } as never)
    const result = await Page()
    expect(result).not.toBeNull()
    expect(redirect).not.toHaveBeenCalled()
  })
})
