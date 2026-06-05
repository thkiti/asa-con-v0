import ShopPage from "@/app/(main)/shop/page"

const mockRedirect = jest.fn()
const mockGetSession = jest.fn()

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
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

    await ShopPage()

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

    await ShopPage()

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
})
