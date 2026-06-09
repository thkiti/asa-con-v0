/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MasterHubView } from "@/components/master/MasterHubView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { mainMenuPageClass } from "@/lib/main-ui/main-menu-layout"

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const hoAdmin: SessionUserApi = {
  userId: "u1",
  staffId: "001",
  name: "Admin User",
  role: "HO_ADMIN",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
}

describe("MasterHubView", () => {
  it("renders administration hub with shared main menu shell", () => {
    const html = renderToStaticMarkup(<MasterHubView user={hoAdmin} />)
    expect(html).toContain(mainMenuPageClass)
    expect(html).toContain("ADMINISTRATION")
    expect(html).toContain('href="/main"')
    expect(html).toContain("Back to Main Menu")
    expect(html).toContain(">Logout<")
    expect(html).toContain("Admin User")
    expect(html).toContain("HO_ADMIN")
    expect(html).toContain("Product &amp; Reference Stock")
    expect(html).toContain('href="/master/product-reference"')
    expect(html).toContain('href="/master/branch"')
    expect(html).toContain('href="/master/staff"')
    expect(html).toContain('href="/master/pricing"')
    expect(html).toContain("Receipt Setup")
    expect(html).toContain('href="/admin/receipt-setup"')
    expect(html).toContain('href="/system/import"')
    expect(html).toContain("h-[108px]")
    expect(html).toContain("line-clamp-2")
  })
})
