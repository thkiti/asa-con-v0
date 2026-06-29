import {
  mainMenuCardClass,
  mainMenuCardHeightClass,
  mainMenuGridClass,
  mainMenuHeaderClass,
  mainMenuIntroClass,
  mainMenuLargePageTitleClass,
  mainMenuLogoutAnchorClass,
  mainMenuPageClass,
  mainMenuProfileClass,
  mainMenuShellContentClass,
  mainMenuShellHeaderClass,
  mainMenuTitleClass,
  appPageContainerClass,
  hubMenuCardClass,
  hubMenuGridClass,
} from "@/lib/main-ui/main-menu-layout"

describe("main-menu-layout", () => {
  it("defines shared main menu shell and card classes", () => {
    expect(mainMenuPageClass).toContain("max-w-5xl")
    expect(mainMenuPageClass).toContain("p-6")
    expect(mainMenuHeaderClass).toContain("relative")
    expect(mainMenuHeaderClass).toContain("border-b")
    expect(mainMenuLogoutAnchorClass).toContain("absolute")
    expect(mainMenuProfileClass).toContain("rounded")
    expect(mainMenuIntroClass).toContain("mt-6")
    expect(mainMenuTitleClass).toContain("text-2xl")
    expect(mainMenuTitleClass).toContain("mt-3")
    expect(mainMenuLargePageTitleClass).toContain("text-3xl")
    expect(mainMenuLargePageTitleClass).toContain("font-bold")
    expect(mainMenuGridClass).toBe(
      "hub-menu-grid mt-4 grid w-[976px] max-w-full grid-cols-[482px_482px] gap-[12px]"
    )
    expect(hubMenuGridClass).toBe(mainMenuGridClass)
    expect(hubMenuCardClass).toBe(mainMenuCardClass)
    expect(mainMenuCardClass).toContain(mainMenuCardHeightClass)
    expect(mainMenuCardHeightClass).toContain("max-h-[108px]")
    expect(mainMenuShellContentClass).toBe(appPageContainerClass)
    expect(mainMenuShellHeaderClass).toContain("w-full")
  })
})
