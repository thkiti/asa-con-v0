import {
  financeAdminPageClass,
  financeWorkPanelClass,
  FINANCE_ADMIN_PAGE_MAX_WIDTH_PX,
  appPageContainerClass,
  appPageShellClass,
} from "@/lib/main-ui/finance-page-layout"
import { mainMenuPageClass } from "@/lib/main-ui/main-menu-layout"

describe("finance page layout", () => {
  it("matches main menu page container width", () => {
    expect(financeAdminPageClass).toBe(mainMenuPageClass)
    expect(financeAdminPageClass).toBe(appPageShellClass)
    expect(financeAdminPageClass).toContain("max-w-5xl")
    expect(FINANCE_ADMIN_PAGE_MAX_WIDTH_PX).toBe(1024)
    expect(appPageContainerClass).toContain("app-page-container")
  })

  it("defines a narrower centered work panel", () => {
    expect(financeWorkPanelClass).toContain("finance-work-panel")
    expect(financeWorkPanelClass).toContain("max-w-xl")
  })
})
