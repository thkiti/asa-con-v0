/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MainMenuView } from "@/components/main/MainMenuView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"

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
  it("renders Main Menu header and logout button", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain("Main Menu")
    expect(html).toContain(">Logout<")
  })

  it("does not render New Stock Document link", () => {
    const html = renderToStaticMarkup(<MainMenuView user={shStaff} />)
    expect(html).not.toContain("New Stock Document")
    expect(html).not.toContain('href="/shop/stock-documents/new"')
  })

  it("renders Stock Documents link and Stock group", () => {
    const html = renderToStaticMarkup(<MainMenuView user={shStaff} />)
    expect(html).toContain('href="/shop/stock-documents"')
    expect(html).toContain("Stock Documents")
    expect(html).toContain(">Stock<")
  })

  it("renders Finance group for HO_ADMIN", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain(">Finance<")
    expect(html).toContain('href="/finance"')
  })

  it("renders Master Database group with maintenance links for HO_ADMIN", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain("Master Database")
    expect(html).toContain("Product / Reference Stock")
    expect(html).toContain('href="/master/product-reference"')
    expect(html).toContain('href="/master/branch"')
    expect(html).toContain('href="/master/staff"')
  })

  it("SH_STAFF does not render Master Database group", () => {
    const html = renderToStaticMarkup(<MainMenuView user={shStaff} />)
    expect(html).not.toContain("Master Database")
    expect(html).not.toContain('href="/master/product-reference"')
  })

  it("HO_ADMIN sees System group with System Import link", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain('href="/system/import"')
    expect(html).toContain("System Import")
    expect(html).toContain(">System<")
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

  it("renders planned items without href", () => {
    const html = renderToStaticMarkup(<MainMenuView user={shStaff} />)
    expect(html).toContain("Planned")
    expect(html).toContain("Stock Card")
    expect(html).not.toContain('href="/product"')
    expect(html).toContain('aria-disabled="true"')
  })
})
