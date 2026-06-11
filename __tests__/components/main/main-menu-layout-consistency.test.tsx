/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MainMenuView } from "@/components/main/MainMenuView"
import { MainMenuSectionView } from "@/components/main/MainMenuSectionView"
import { MasterHubView } from "@/components/master/MasterHubView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getMainMenuSectionDetail } from "@/lib/main-ui/main-menu"
import {
  mainMenuCardClass,
  mainMenuCardHeightClass,
  mainMenuCardHintClass,
  mainMenuCardHintSlotClass,
  mainMenuCardTitleClass,
  mainMenuCardTitleSlotClass,
  mainMenuGridClass,
  mainMenuGroupedGridsClass,
  mainMenuGroupHeadingClass,
  mainMenuHeaderClass,
  mainMenuIntroClass,
  mainMenuPageClass,
  mainMenuProfileClass,
  mainMenuTitleClass,
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

function layoutMarkers(html: string): string[] {
  return [
    mainMenuPageClass,
    mainMenuHeaderClass,
    mainMenuTitleClass,
    mainMenuProfileClass,
    mainMenuIntroClass,
    mainMenuGridClass,
    mainMenuCardClass,
    mainMenuCardHeightClass,
    mainMenuCardTitleSlotClass,
    mainMenuCardHintSlotClass,
    mainMenuCardTitleClass,
    mainMenuCardHintClass,
  ].filter((marker) => html.includes(marker))
}

describe("main menu layout consistency", () => {
  const pages: Array<{ name: string; html: string }> = []

  beforeAll(() => {
    pages.push({
      name: "/main",
      html: renderToStaticMarkup(<MainMenuView user={hoAdmin} />),
    })

    for (const sectionKey of [
      "operations",
      "finance",
      "system",
      "shop",
    ] as const) {
      const section = getMainMenuSectionDetail("HO_ADMIN", sectionKey)
      expect(section).not.toBeNull()
      pages.push({
        name: `/main/${sectionKey}`,
        html: renderToStaticMarkup(
          <MainMenuSectionView user={hoAdmin} section={section!} />
        ),
      })
    }

    pages.push({
      name: "/master",
      html: renderToStaticMarkup(<MasterHubView user={hoAdmin} />),
    })
  })

  it("uses the same shell and card primitives on every scoped page", () => {
    const reference = layoutMarkers(pages[0].html)
    expect(reference.length).toBeGreaterThan(0)

    for (const page of pages) {
      expect(layoutMarkers(page.html)).toEqual(reference)
    }
  })

  it("reserves back-link space on /main so headings align with section pages", () => {
    const mainHtml = pages.find((page) => page.name === "/main")!.html
    expect(mainHtml).toContain("invisible")
    expect(mainHtml).toContain("Back to Main Menu")
    expect(mainHtml).toContain(mainMenuTitleClass)
  })

  it("uses fixed-size menu card boxes on every scoped page", () => {
    for (const page of pages) {
      expect(page.html).toContain(mainMenuCardHeightClass)
      expect(page.html).toContain("w-[976px]")
      expect(page.html).toContain("w-[482px]")
      expect(page.html).toContain("max-h-[108px]")
      expect(page.html).toContain("line-clamp-2")
      expect(page.html).not.toContain("min-h-[5.25rem]")
      expect(page.html).not.toContain("min-h-[5.5rem]")
      expect(page.html).not.toContain("themeMenuAppCard")
    }
  })

  it("uses grouped finance hub without breaking card primitives", () => {
    const financeHtml = pages.find((page) => page.name === "/main/finance")!.html
    expect(financeHtml).toContain(mainMenuGroupedGridsClass)
    expect(financeHtml).toContain(mainMenuGroupHeadingClass)
    expect(financeHtml).toContain("Reports")
    expect(financeHtml).toContain(mainMenuGridClass)
    expect(financeHtml).toContain(mainMenuCardClass)
  })

  it("renders every scoped hub page through MainMenuHubPage", () => {
    for (const page of pages) {
      expect(page.html).toContain(mainMenuPageClass)
      expect(page.html).toContain(">Logout<")
    }
  })
})
