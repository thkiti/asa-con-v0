import {
  themeAdminTable,
  themeBannerError,
  themeBannerSuccess,
  themeDialog,
  themeDialogLight,
  themeDialogLightBtnPrimary,
  themeEmptyState,
  themeInlineError,
  themeInput,
  themeLinkPrimary,
  themeMeta,
  themeMuted,
  themePanelList,
  themeSelect,
  themeTextPrimary,
} from "@/lib/theme/theme-classes"

describe("theme semantic classes", () => {
  it("exports stable admin surface class names", () => {
    expect(themeDialog).toContain("theme-dialog")
    expect(themePanelList).toContain("theme-panel-list")
    expect(themeBannerSuccess).toContain("theme-banner-success")
    expect(themeBannerError).toContain("theme-banner-error")
    expect(themeAdminTable).toContain("theme-admin-table")
    expect(themeLinkPrimary).toContain("link-primary")
    expect(themeTextPrimary).toBe("text-primary")
    expect(themeMuted).toBe("text-muted")
    expect(themeMeta).toContain("text-xs")
    expect(themeEmptyState).toContain("text-muted")
    expect(themeDialogLight).toContain("theme-dialog-light")
    expect(themeDialogLightBtnPrimary).toContain("theme-dialog-light-btn-primary")
    expect(themeSelect).toBe("theme-select")
    expect(themeInput).toContain("theme-input")
    expect(themeInlineError).toBe("theme-inline-error")
  })
})

describe("finance visual class re-exports", () => {
  it("re-exports theme admin classes for finance screens", async () => {
    const financeClasses = await import("@/lib/finance-ui/finance-visual-classes")
    expect(financeClasses.themePanelList).toBe(themePanelList)
    expect(financeClasses.themeBtnSuccess).toContain("theme-btn-success")
    expect(financeClasses.themeLinkPrimary).toContain("link-primary")
  })
})
