import {
  financeAdminPageClass,
  financePageContentClass,
  financePageShellClass,
  financeWorkPanelClass,
  FINANCE_ADMIN_PAGE_MAX_WIDTH_PX,
  appPageShellClass,
} from "@/lib/main-ui/finance-page-layout"
import { mainMenuPageClass } from "@/lib/main-ui/main-menu-layout"

describe("finance page layout", () => {
  it("uses one canonical Finance shell and content column", () => {
    expect(financePageShellClass).toBe(appPageShellClass)
    expect(financeAdminPageClass).toBe(financePageShellClass)
    expect(financePageShellClass).toBe(mainMenuPageClass)
    expect(financePageShellClass).toContain("max-w-5xl")
    expect(FINANCE_ADMIN_PAGE_MAX_WIDTH_PX).toBe(1024)
    expect(financePageContentClass).toContain("finance-page-content")
    expect(financePageContentClass).toContain("app-page-container")
    expect(financePageContentClass).not.toContain("976px")
  })

  it("defines a narrower centered work panel for opt-in settlement flows only", () => {
    expect(financeWorkPanelClass).toContain("finance-work-panel")
    expect(financeWorkPanelClass).toContain("max-w-xl")
  })
})
