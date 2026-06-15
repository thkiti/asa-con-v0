/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { TargetSalesDashboardPage } from "@/components/shop/TargetSalesDashboardPage"
import { mainMenuLargePageTitleClass } from "@/lib/main-ui/main-menu-layout"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

jest.mock("@/lib/shop-ui/sales-dashboard-client", () => ({
  fetchSalesDashboard: jest.fn(),
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
  documentEntityCode: "AS",
}

describe("TargetSalesDashboardPage", () => {
  it("uses uppercase primary page title with larger heading class", () => {
    const html = renderToStaticMarkup(
      <TargetSalesDashboardPage user={hoAdmin} />
    )

    expect(html).toContain("LAST MONTH / ACTUAL SALES")
    expect(html).not.toContain("Target / Sales")
    expect(html).toContain(mainMenuLargePageTitleClass)
    expect(html).not.toContain("Target vs Sales")
  })
})
