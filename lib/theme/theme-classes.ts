/** Semantic theme class bundles — use instead of raw zinc utilities on migrated surfaces. */

export const themePage = "bg-background text-foreground"

export const themeCard =
  "rounded-lg border border-border bg-card p-6 text-card-foreground"

export const themeTextPrimary = "text-primary"
export const themeTextSecondary = "text-secondary"
export const themeMuted = "text-muted"
export const themeLabel = "font-medium text-[var(--label-text)]"

export const themeInput =
  "theme-input mt-1 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]"

export const themeBtnPrimary =
  "rounded bg-[var(--btn-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:border disabled:border-[var(--btn-disabled-border)] disabled:bg-[var(--btn-disabled-bg)] disabled:text-[var(--btn-disabled-fg)] disabled:font-normal"

export const themeBtnSecondary =
  "theme-btn-secondary rounded border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] px-3 py-1.5 text-sm font-medium text-[var(--btn-secondary-fg)] hover:bg-[var(--btn-secondary-hover)] disabled:cursor-not-allowed disabled:border-[var(--btn-disabled-border)] disabled:bg-[var(--btn-disabled-bg)] disabled:text-[var(--btn-disabled-fg)]"

export const themeLinkPrimary =
  "link-primary disabled:cursor-not-allowed disabled:text-[var(--btn-disabled-fg)] disabled:no-underline"

export const themeLinkMuted =
  "text-secondary underline underline-offset-2 hover:text-primary disabled:cursor-not-allowed disabled:text-[var(--btn-disabled-fg)]"

export const themeMenuCard =
  "block rounded border border-[var(--btn-secondary-border)] bg-card p-3 hover:bg-[var(--btn-secondary-hover)]"

export const themeMenuSummary =
  "rounded border border-border bg-[var(--btn-secondary-hover)] p-3 text-sm text-card-foreground"

export const themeMenuDisabled =
  "block rounded border border-border bg-[var(--btn-disabled-bg)] p-3"

export const themeMenuDisabledText = "text-sm font-semibold text-muted-foreground"

export const themeMenuGroup =
  "rounded-lg border border-border bg-card p-4 text-card-foreground"

export const themeMenuGroupTitle =
  "mb-2 text-xs font-semibold uppercase tracking-wide text-card-foreground"

export const themeMenuRowLink =
  "block rounded px-2 py-1.5 text-sm text-card-foreground hover:bg-[var(--btn-secondary-hover)]"

export const themeMenuRowPlanned =
  "flex items-center justify-between rounded px-2 py-1.5 text-sm text-muted-foreground"

/** SHOP section app tiles — fixed height, full-card click target. */
export const themeMenuAppCard =
  "flex min-h-[5.5rem] flex-col rounded-lg border border-[var(--btn-secondary-border)] bg-card p-4 transition-colors hover:bg-[var(--btn-secondary-hover)]"

export const themeMenuAppCardPlanned =
  "flex min-h-[5.5rem] flex-col justify-between rounded-lg border border-border bg-[var(--btn-disabled-bg)] p-4"

export const themeMenuAppCardBadge =
  "self-start rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"

export const themePageTitle = "text-2xl font-bold tracking-tight text-foreground"

/** Native select — theme-aware closed field; option list styled in globals.css */
export const themeSelect = "theme-select"

export const themeInlineError = "theme-inline-error"

export const themeSectionTitle = "text-sm font-medium text-foreground"

export const themeDialog =
  "theme-dialog w-full max-w-lg rounded-lg p-6 shadow-lg"

export const themeDialogWide =
  "theme-dialog max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg p-6 shadow-lg"

export const themeDialogOverlay =
  "fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"

export const themeDialogOverlayCentered =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"

export const themeDialogLight =
  "theme-dialog-light w-full max-w-sm rounded-lg p-5 shadow-xl"

export const themeDialogLightWide =
  "theme-dialog-light w-full max-w-md rounded-lg p-6 shadow-xl"

export const themeDialogLightTitle = "theme-dialog-light-title text-sm font-semibold"

export const themeDialogLightTitleLg =
  "theme-dialog-light-title text-lg font-semibold"

export const themeDialogLightBody = "theme-dialog-light-body mt-1 text-sm"

export const themeDialogLightLabel = "theme-dialog-light-label mb-1 block text-sm"

export const themeDialogLightInput =
  "theme-dialog-light-input w-full rounded px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"

export const themeDialogLightError = "theme-dialog-light-error mt-2 text-xs"

export const themeDialogLightBtnSecondary =
  "theme-dialog-light-btn-secondary rounded px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed"

export const themeDialogLightBtnPrimary =
  "theme-dialog-light-btn-primary rounded px-4 py-2 text-sm font-medium disabled:cursor-not-allowed"

export const themePanel = "theme-panel rounded p-4"

export const themePanelList = "theme-panel-list divide-y divide-border rounded"

export const themePanelListItem = "px-4 py-3"

export const themeBannerSuccess =
  "theme-banner-success rounded px-4 py-3 text-sm"

export const themeBannerError = "theme-banner-error rounded px-4 py-3 text-sm"

export const themeBannerWarning =
  "theme-banner-warning rounded px-4 py-3 text-sm"

export const themeMeta = "text-xs text-muted"

export const themeAdminTable = "theme-admin-table min-w-full border-collapse text-sm"

export const themeAdminTableHead =
  "border-b border-border text-left text-muted"

export const themeAdminTableHeadCell = "px-3 py-2 font-medium"

export const themeAdminTableRow = "border-b border-border"

export const themeAdminTableCell = "px-3 py-2"

export const themeAdminTableCellMuted = "px-3 py-2 text-muted"

export const themeAdminTableEmpty =
  "px-3 py-4 text-center text-muted"

export const themeBtnSuccess =
  "theme-btn-success rounded px-2 py-1 text-sm disabled:cursor-not-allowed"

export const themeBtnDanger =
  "theme-btn-danger rounded px-2 py-1 text-sm disabled:cursor-not-allowed"

export const themeBadgeSuccess =
  "theme-badge-success inline-block rounded px-2 py-0.5 text-xs font-medium"

export const themeBadgeWarning =
  "theme-badge-warning inline-block rounded px-2 py-0.5 text-xs font-medium"

export const themeBadgeOrange =
  "theme-badge-orange inline-block rounded px-2 py-0.5 text-xs font-medium"

export const themeBadgeInfo =
  "theme-badge-info inline-block rounded px-2 py-0.5 text-xs font-medium"

export const themeBadgeError =
  "theme-badge-error inline-block rounded px-2 py-0.5 text-xs font-medium"

export const themeLoadingText = "text-muted"

export const themeEmptyState = "text-sm text-muted"
