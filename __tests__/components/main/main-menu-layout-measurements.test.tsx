/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { FinanceMenuHubView } from "@/components/finance/FinanceMenuHubView"
import { FinanceMenuView } from "@/components/finance/FinanceMenuView"
import { MainMenuView } from "@/components/main/MainMenuView"
import { MainMenuSectionView } from "@/components/main/MainMenuSectionView"
import { OperationsHubView } from "@/components/operations/OperationsHubView"
import { MasterHubView } from "@/components/master/MasterHubView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getFinanceMenuHub } from "@/lib/main-ui/finance-menu"
import { getMainMenuSectionDetail } from "@/lib/main-ui/main-menu"
import {
  MAIN_MENU_LAYOUT_SPEC,
  mainMenuCardClass,
  mainMenuCardHeightClass,
  mainMenuGridClass,
  mainMenuHeaderClass,
  mainMenuIntroClass,
  mainMenuLogoutAnchorClass,
  mainMenuLogoutButtonClass,
  mainMenuPageClass,
  mainMenuProfileClass,
  mainMenuTitleClass,
  appPageContainerClass,
} from "@/lib/main-ui/main-menu-layout"

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

type MeasuredLayout = {
  page: string
  pageContainer: string
  contentContainer: string
  header: string
  title: string
  userCard: string
  logout: string
  description: string
  grid: string
  card: string
  forbiddenTokens: string[]
}

function measure(html: string, page: string): MeasuredLayout {
  const pick = (testId: string) => {
    const patterns = [
      new RegExp(`data-testid="${testId}"[^>]*class="([^"]*)"`),
      new RegExp(`class="([^"]*)"[^>]*data-testid="${testId}"`),
    ]
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1]) return match[1].trim()
    }
    return ""
  }

  const forbiddenTokens = [
    "themeMenuAppCard",
    "max-w-3xl",
    "max-w-6xl",
    "min-h-[5.5rem]",
    "min-h-[5.25rem]",
    "auto-rows-fr",
    "flex-wrap",
    "sm:grid-cols-2",
  ].filter((token) => html.includes(token))

  return {
    page,
    pageContainer: pick("main-menu-page"),
    contentContainer: pick("app-page-container"),
    header: pick("main-menu-header"),
    title: pick("main-menu-title"),
    userCard: pick("main-menu-user-card"),
    logout: pick("main-menu-logout"),
    description: pick("main-menu-description"),
    grid: pick("main-menu-grid"),
    card: pick("main-menu-card"),
    forbiddenTokens,
  }
}

function renderAll(): MeasuredLayout[] {
  const operations = getMainMenuSectionDetail("HO_ADMIN", "operations")!
  const system = getMainMenuSectionDetail("HO_ADMIN", "system")!
  const shop = getMainMenuSectionDetail("HO_ADMIN", "shop")!
  const dashboardHub = getFinanceMenuHub("HO_ADMIN", "dashboard")!

  const pages: Array<{ name: string; html: string }> = [
    { name: "/main", html: renderToStaticMarkup(<MainMenuView user={hoAdmin} />) },
    {
      name: "/finance",
      html: renderToStaticMarkup(<FinanceMenuView user={hoAdmin} />),
    },
    {
      name: "/finance/dashboard",
      html: renderToStaticMarkup(
        <FinanceMenuHubView user={hoAdmin} hub={dashboardHub!} />
      ),
    },
    {
      name: "/main/operations",
      html: renderToStaticMarkup(
        <MainMenuSectionView user={hoAdmin} section={operations} />
      ),
    },
    {
      name: "/operations",
      html: renderToStaticMarkup(
        <OperationsHubView user={hoAdmin} section={operations} />
      ),
    },
    {
      name: "/master",
      html: renderToStaticMarkup(<MasterHubView user={hoAdmin} />),
    },
    {
      name: "/main/system",
      html: renderToStaticMarkup(
        <MainMenuSectionView user={hoAdmin} section={system} />
      ),
    },
    {
      name: "/main/shop",
      html: renderToStaticMarkup(
        <MainMenuSectionView user={hoAdmin} section={shop} />
      ),
    },
  ]

  return pages.map(({ name, html }) => measure(html, name))
}

describe("main menu layout measurements", () => {
  const measured = renderAll()
  const reference = measured.find((row) => row.page === "/main")!

  it("documents /main layout spec constants", () => {
    expect(MAIN_MENU_LAYOUT_SPEC.pageMaxWidthPx).toBe(1024)
    expect(MAIN_MENU_LAYOUT_SPEC.cardWidthPx).toBe(482)
    expect(MAIN_MENU_LAYOUT_SPEC.cardHeightPx).toBe(108)
    expect(MAIN_MENU_LAYOUT_SPEC.gridWidthPx).toBe(976)
    expect(MAIN_MENU_LAYOUT_SPEC.gridGapPx).toBe(12)
  })

  it("matches /main class output on every hub page", () => {
    for (const row of measured) {
      expect(row.pageContainer).toBe(reference.pageContainer)
      expect(row.contentContainer).toBe(reference.contentContainer)
      expect(row.header).toBe(reference.header)
      expect(row.title).toBe(reference.title)
      expect(row.userCard).toBe(reference.userCard)
      expect(row.logout).toBe(reference.logout)
      expect(row.description).toBe(reference.description)
      expect(row.grid).toBe(reference.grid)
      expect(row.forbiddenTokens).toEqual([])
      expect(row.card).toContain("w-[482px]")
      expect(row.card).toContain(mainMenuCardHeightClass)
      expect(row.card).not.toContain("w-full min-w-0")
    }
  })

  it("binds /main measurements to main-menu-layout.ts constants", () => {
    expect(reference.pageContainer).toBe(mainMenuPageClass)
    expect(reference.contentContainer).toBe(appPageContainerClass)
    expect(reference.header).toBe(mainMenuHeaderClass)
    expect(reference.title).toBe(mainMenuTitleClass)
    expect(reference.userCard).toBe(mainMenuProfileClass)
    expect(reference.logout).toBe(mainMenuLogoutButtonClass)
    expect(reference.description).toBe(mainMenuIntroClass)
    expect(reference.grid).toBe(mainMenuGridClass)
    expect(reference.grid).toContain("w-[976px]")
    expect(reference.grid).toContain("482px")
    expect(reference.card).toContain(mainMenuCardClass)
    expect(reference.card).toContain("w-[482px]")
  })

  it("positions logout absolutely so it does not narrow the content column", () => {
    const html = renderToStaticMarkup(<MainMenuView user={hoAdmin} />)
    expect(html).toContain(mainMenuLogoutAnchorClass)
    expect(html).toContain(appPageContainerClass)
  })

  it("matches /main/operations and /operations layout output", () => {
    const mainOps = measured.find((row) => row.page === "/main/operations")!
    const ops = measured.find((row) => row.page === "/operations")!
    const { page: _a, ...mainOpsLayout } = mainOps
    const { page: _b, ...opsLayout } = ops
    expect(mainOpsLayout).toEqual(opsLayout)
  })
})
