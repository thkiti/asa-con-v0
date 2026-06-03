import { renderToStaticMarkup } from "react-dom/server"
import { MainMenuView } from "@/components/main/MainMenuView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"

const hoAdmin: SessionUserApi = {
  userId: "u1",
  staffId: "001",
  name: "Admin User",
  role: "HO_ADMIN",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
}

const shStaff: SessionUserApi = {
  userId: "u2",
  staffId: "002",
  name: "Shop User",
  role: "SH_STAFF",
  branchId: "b2",
  branchCode: "SH001",
  branchName: "Shop Branch",
}

describe("MainMenuView", () => {
  it("renders title and stock documents link", () => {
    const html = renderToStaticMarkup(<MainMenuView user={shStaff} />)
    expect(html).toContain("Main Menu")
    expect(html).toContain('href="/shop/stock-documents"')
    expect(html).toContain("Stock Documents")
  })

  it("HO_ADMIN sees System Import link", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain('href="/system/import"')
    expect(html).toContain("System Import")
  })

  it("SH_STAFF does not render System Import link", () => {
    const html = renderToStaticMarkup(<MainMenuView user={shStaff} />)
    expect(html).not.toContain('href="/system/import"')
    expect(html).not.toContain("System Import")
  })

  it("renders user summary with role and branchCode", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain("Admin User")
    expect(html).toContain("HO_ADMIN")
    expect(html).toContain("HO999")
  })

  it("renders coming soon items as disabled blocks", () => {
    const html = renderToStaticMarkup(<MainMenuView user={shStaff} />)
    expect(html).toContain("Coming soon")
    expect(html).toContain("Product")
    expect(html).not.toContain('href="/product"')
  })
})
