import {
  appPageContainerClass,
  appPageShellClass,
  APP_PAGE_CONTENT_WIDTH_PX,
  APP_PAGE_MAX_WIDTH_PX,
  APP_PAGE_PADDING_PX,
} from "@/lib/main-ui/page-container"
import { mainMenuPageClass } from "@/lib/main-ui/main-menu-layout"
import { financeAdminPageClass, financePageShellClass } from "@/lib/main-ui/finance-page-layout"

describe("page-container", () => {
  it("defines shared shell and inner content classes", () => {
    expect(appPageShellClass).toContain("max-w-5xl")
    expect(appPageShellClass).toContain("w-full")
    expect(appPageShellClass).toContain("p-6")
    expect(appPageContainerClass).toContain("app-page-container")
    expect(appPageContainerClass).toContain("w-full")
    expect(APP_PAGE_MAX_WIDTH_PX).toBe(1024)
    expect(APP_PAGE_PADDING_PX).toBe(24)
    expect(APP_PAGE_CONTENT_WIDTH_PX).toBe(976)
  })

  it("is aliased by main menu and finance admin page shells", () => {
    expect(mainMenuPageClass).toBe(appPageShellClass)
    expect(financeAdminPageClass).toBe(appPageShellClass)
    expect(financePageShellClass).toBe(appPageShellClass)
  })
})
