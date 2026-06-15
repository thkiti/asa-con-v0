/**
 * @jest-environment jsdom
 */
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { redirect } from "next/navigation"
import Page from "@/app/(main)/shop/target-sales/page"
import { getSession } from "@/lib/auth/session"
import { SHOP_SALES_DASHBOARD_ASAS_ONLY_MESSAGE } from "@/lib/permissions/sales-dashboard"

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/components/shop/TargetSalesDashboardPage", () => ({
  TargetSalesDashboardPage: () =>
    createElement("div", { "data-testid": "target-sales-dashboard-page" }),
}))

const hoAdmin = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_ADMIN" as const,
  staffId: "001",
  name: "Admin",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
  documentEntityCode: "AS" as const,
}

describe("/shop/target-sales page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirects unauthenticated users to login", async () => {
    jest.mocked(getSession).mockResolvedValue(null)
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT:/login")
  })

  it("renders dashboard for ASAS entity", async () => {
    jest.mocked(getSession).mockResolvedValue(hoAdmin)
    const result = await Page()
    const html = renderToStaticMarkup(result)
    expect(html).toContain('data-testid="target-sales-dashboard-page"')
    expect(redirect).not.toHaveBeenCalled()
  })

  it("blocks ASAD direct URL with shop-sales-only message", async () => {
    jest.mocked(getSession).mockResolvedValue({
      ...hoAdmin,
      documentEntityCode: "AD",
    })
    const result = await Page()
    const html = renderToStaticMarkup(result)
    expect(html).toContain('data-testid="sales-dashboard-entity-blocked"')
    expect(html).toContain(SHOP_SALES_DASHBOARD_ASAS_ONLY_MESSAGE)
    expect(html).not.toContain('data-testid="target-sales-dashboard-page"')
    expect(html).not.toContain('data-testid="target-sales-dashboard"')
  })
})
