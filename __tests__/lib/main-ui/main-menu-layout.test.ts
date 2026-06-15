import {
  mainMenuCardClass,
  mainMenuCardHeightClass,
  mainMenuGridClass,
  mainMenuHeaderClass,
  mainMenuIntroClass,
  mainMenuLargePageTitleClass,
  mainMenuPageClass,
  mainMenuProfileClass,
  mainMenuTitleClass,
} from "@/lib/main-ui/main-menu-layout"

describe("main-menu-layout", () => {
  it("defines shared main menu shell and card classes", () => {
    expect(mainMenuPageClass).toContain("max-w-5xl")
    expect(mainMenuPageClass).toContain("p-6")
    expect(mainMenuHeaderClass).toContain("border-b")
    expect(mainMenuProfileClass).toContain("rounded")
    expect(mainMenuIntroClass).toContain("mt-6")
    expect(mainMenuTitleClass).toContain("text-2xl")
    expect(mainMenuTitleClass).toContain("mt-3")
    expect(mainMenuLargePageTitleClass).toContain("text-3xl")
    expect(mainMenuLargePageTitleClass).toContain("font-bold")
    expect(mainMenuGridClass).toBe(
      "mt-4 grid w-[976px] grid-cols-[482px_482px] gap-[12px]"
    )
    expect(mainMenuCardClass).toContain(mainMenuCardHeightClass)
    expect(mainMenuCardHeightClass).toContain("max-h-[108px]")
  })
})
