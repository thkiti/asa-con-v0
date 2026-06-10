import ShopPage from "@/app/(main)/shop/page"

const mockRedirect = jest.fn()
const mockGetSession = jest.fn()

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args)
    throw new Error("NEXT_REDIRECT")
  },
}))

jest.mock("@/lib/auth/session", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

jest.mock("@/components/pos/PosTerminalPage", () => ({
  PosTerminalPage: () => <div data-testid="pos-terminal-page">POS Terminal</div>,
}))

describe("ShopPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirects to login without session", async () => {
    mockGetSession.mockResolvedValue(null)

    await expect(ShopPage()).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/login")
  })

  it("redirects to login when role cannot access shop", async () => {
    mockGetSession.mockResolvedValue({
      sessionId: "sess-1",
      role: "INVALID",
      staffId: "001",
      userId: "u1",
      name: "User",
      branchId: "b1",
      branchCode: "SH001",
      branchName: "Shop",
    })

    await expect(ShopPage()).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/login")
  })

  it("renders POS terminal page with valid shop session", async () => {
    mockGetSession.mockResolvedValue({
      sessionId: "sess-1",
      role: "SH_STAFF",
      staffId: "002",
      userId: "u1",
      name: "Shop User",
      branchId: "b1",
      branchCode: "SH001",
      branchName: "Shop",
    })

    const page = await ShopPage()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(page).toBeTruthy()
  })

  it("redirects HO_ADMIN on HO999 to main menu", async () => {
    mockGetSession.mockResolvedValue({
      sessionId: "sess-1",
      role: "HO_ADMIN",
      staffId: "001",
      userId: "u1",
      name: "Admin",
      branchId: "branch-ho",
      branchCode: "HO999",
      branchName: "Head Office",
    })

    await expect(ShopPage()).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/main")
  })
})
