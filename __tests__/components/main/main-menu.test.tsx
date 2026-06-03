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

const hoFinance: SessionUserApi = {
  userId: "u3",
  staffId: "003",
  name: "Finance User",
  role: "HO_FINANCE",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
}

const hoOperations: SessionUserApi = {
  userId: "u4",
  staffId: "004",
  name: "Ops User",
  role: "HO_OPERATIONS",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
}

describe("MainMenuView", () => {
  it("renders Main Menu header and logout button", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain("Main Menu")
    expect(html).toContain(">Logout<")
  })

  it("renders HO Control Center intro", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain("Head Office control center")
  })

  it("renders five section cards for HO_ADMIN linking to /main/{section}", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain('href="/main/administration"')
    expect(html).toContain('href="/main/finance"')
    expect(html).toContain('href="/main/operations"')
    expect(html).toContain('href="/main/shop"')
    expect(html).toContain('href="/main/system"')
    expect(html).toContain("ADMINISTRATION")
    expect(html).toContain("OPERATIONS")
    expect(html).toContain("SHOP")
    expect(html).not.toContain('href="/finance"')
    expect(html).not.toContain('href="/shop/stock-documents"')
  })

  it("renders Finance, Operations, Shop cards for HO_FINANCE", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoFinance} />)
    expect(html).toContain('href="/main/finance"')
    expect(html).toContain('href="/main/operations"')
    expect(html).toContain('href="/main/shop"')
    expect(html).not.toContain('href="/main/administration"')
    expect(html).not.toContain('href="/main/system"')
  })

  it("renders Operations and Shop cards only for HO_OPERATIONS", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoOperations} />)
    expect(html).toContain('href="/main/operations"')
    expect(html).toContain('href="/main/shop"')
    expect(html).not.toContain('href="/main/finance"')
    expect(html).not.toContain('href="/main/administration"')
    expect(html).not.toContain('href="/main/system"')
  })

  it("renders user summary with role and branchCode", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain("Admin User")
    expect(html).toContain("HO_ADMIN")
    expect(html).toContain("HO999")
  })
})
