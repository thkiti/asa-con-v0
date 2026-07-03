/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MainMenuSectionView } from "@/components/main/MainMenuSectionView"
import { MainMenuView } from "@/components/main/MainMenuView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getMainMenuSectionDetail } from "@/lib/main-ui/main-menu"

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
  documentEntityCode: "AS",
}

const hoFinance: SessionUserApi = {
  userId: "u3",
  staffId: "003",
  name: "Finance User",
  role: "HO_FINANCE",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
  documentEntityCode: "AS",
}

const hoOperations: SessionUserApi = {
  userId: "u4",
  staffId: "004",
  name: "Ops User",
  role: "HO_OPERATIONS",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
  documentEntityCode: "AS",
}

describe("MainMenuView", () => {
  it("renders Main Menu header and logout button", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain("Main Menu")
    expect(html).toContain(">Logout<")
    expect(html).toContain("invisible")
    expect(html).toContain("Back to Main Menu")
  })

  it("renders HO Control Center intro", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain("Head Office control center")
  })

  it("renders HO_ADMIN section cards including administration hub at /master", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain('href="/master"')
    expect(html).toContain('href="/finance"')
    expect(html).toContain('href="/main/operations"')
    expect(html).toContain('href="/main/shop"')
    expect(html).toContain('href="/main/system"')
    expect(html).toContain("ADMINISTRATION")
    expect(html).toContain("OPERATIONS")
    expect(html).toContain("SHOP")
    expect(html).not.toContain('href="/shop/stock-documents"')
  })

  it("renders Finance, Operations, Shop, and System cards for HO_FINANCE", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoFinance} />)
    expect(html).toContain('href="/finance"')
    expect(html).toContain('href="/main/operations"')
    expect(html).toContain('href="/main/shop"')
    expect(html).toContain('href="/main/system"')
    expect(html).not.toContain('href="/main/administration"')
  })

  it("renders Operations and Shop cards only for HO_OPERATIONS", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoOperations} />)
    expect(html).toContain('href="/main/operations"')
    expect(html).toContain('href="/main/shop"')
    expect(html).not.toContain('href="/master"')
    expect(html).not.toContain("ADMINISTRATION")
    expect(html).not.toContain('href="/finance"')
    expect(html).not.toContain('href="/main/system"')
  })

  it("renders user summary with role and branchCode", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain("Admin User")
    expect(html).toContain("HO_ADMIN")
    expect(html).toContain("HO999")
  })

  it("renders entity prefix in main menu title", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain('data-testid="main-menu-title"')
    expect(html).toContain("ASAS • MAIN MENU")
  })

  it("does not render post-login entity switching controls", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoFinance} />)
    expect(html).not.toContain('data-testid="session-entity-toggle"')
    expect(html).not.toContain('data-testid="session-entity-control"')
    expect(html).not.toContain('data-testid="session-entity-label"')
  })
})

describe("MainMenuSectionView system", () => {
  it("shows Import Accounting Data as active link to finance system hub", () => {
    const section = getMainMenuSectionDetail("HO_ADMIN", "system")
    expect(section).not.toBeNull()
    const html = renderToStaticMarkup(
      <MainMenuSectionView user={hoAdmin} section={section!} />
    )
    expect(html).toContain('href="/finance/system"')
    expect(html).toContain("Import Accounting Data")
    expect(html).toContain(
      "Chart of accounts and finance setup imports"
    )
    const accountingItem = section!.items.find((item) => item.key === "import-accounting")
    expect(accountingItem?.status).toBe("available")
  })
})
