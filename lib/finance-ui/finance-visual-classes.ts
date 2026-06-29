/**
 * Finance Visual Standard v1 — shared class bundles.
 * Hierarchy (strongest → weakest) is defined in globals.css tokens:
 * P1 amounts/totals · P2 account (code • name) · P3 headers · P4 memo/description · P5 audit
 */

import { numericCell, numericTh } from "@/lib/ui/numeric-display"

export const financeTextPrimary = "finance-text-primary"
export const financeTextSecondary = "finance-text-secondary"
export const financeTextMuted = "finance-text-muted"

export const financeTable = "finance-table"
export const financeTableCompact = "finance-table finance-table--compact"
/** Finance report tables — sticky column header on vertical scroll */
export const financeReportTable = "finance-table finance-report-table"
/** Scroll wrapper for finance tables — horizontal scroll only */
export const financeTableScroll = "finance-table-scroll overflow-x-auto"

export const financeTh = "px-2 py-2"
export const financeThRight = `${numericTh} px-2 py-2`
export const financeTd = "px-2 py-1"
/** Amount column immediately before a status badge — extra right padding for separation */
export const financeThSettlementAmount = `${numericTh} px-2 py-2 pr-8`
export const financeTdSettlementAmount = `${numericCell} px-2 py-1 pr-8 tabular-nums text-sm`
/** Status column immediately after a numeric amount column */
export const financeThSettlementStatus = "px-2 py-2 pl-4"
export const financeTdSettlementStatus = "px-2 py-1 pl-4"
/** Amount column cell — apply to td/th, not inner spans */
export const financeTdRight = `${numericCell} px-2 py-1`
export const financeAmountCell = financeTdRight

export const financeAccountCell = "finance-account-cell px-2 py-1"
/** Table cell padding for account column */
export const financeAccount = financeAccountCell
/** Inline account row: fixed-width code • name */
export const financeAccountDisplay = "finance-account"
/** @deprecated Use financeAccount + FinanceAccountDisplay */
export const financeAccountCode = "finance-account-code px-2 py-1"
/** @deprecated Use financeAccount + FinanceAccountDisplay */
export const financeAccountName = "finance-account-name px-2 py-1"
export const financeNumber = `finance-number ${numericCell} px-2 py-1`
export const financeMemo = "finance-memo px-2 py-1"

export const financeTotalRow = "finance-total-row"
export const financeTotalRowStrong = "finance-total-row-strong"
export const financeTotalLabel = "finance-total-label px-2 py-2"
export const financeTotalValue = `finance-total-value ${numericCell} px-2 py-2`

export const financeDocumentContainer = "finance-document-container"
export const financeReportContainer = "finance-report-container"

export const financeReportSection = "finance-report-section"

export const financeAuditLine = "finance-audit-line"
export const financeDescriptionLine = "finance-description-line"
export const financeDescriptionLabel = "finance-description-label"
export const financeDiffBalanced = "finance-diff-balanced"
export const financeDiffUnbalanced = "finance-diff-unbalanced"

/** Collector pickup settlement — table within standard finance admin page frame. */
export const posSettlementFilterBar =
  "pos-settlement-filter-bar flex flex-nowrap items-end gap-3"

export const posSettlementFilterFieldBranch =
  "pos-settlement-filter-field pos-settlement-filter-branch shrink-0"

export const posSettlementFilterFieldDate =
  "pos-settlement-filter-field pos-settlement-filter-date shrink-0"

export const posSettlementFilterFieldApply =
  "pos-settlement-filter-field pos-settlement-filter-apply shrink-0"

export const collectorPickupSettlementTableWrap =
  "collector-pickup-settlement-table-wrap mt-4 w-full"

export const collectorPickupSettlementTable =
  "collector-pickup-settlement-table finance-table finance-table--compact w-full"

export const collectorPickupTh = "px-2 py-2 text-left"
export const collectorPickupThAmount = `${numericTh} px-2 py-2`
export const collectorPickupThStatus =
  "collector-pickup-th-status px-2 py-2 text-left whitespace-nowrap"
export const collectorPickupThWorkflow =
  "collector-pickup-th-workflow px-2 py-2 text-left whitespace-nowrap"

export const collectorPickupTdCollectNo =
  "px-2 py-1 align-middle font-mono text-sm whitespace-nowrap"
export const collectorPickupTdBranch =
  "collector-pickup-td-branch max-w-[14rem] px-2 py-1 align-middle text-sm"
export const collectorPickupTdAmount = `${numericCell} px-2 py-1 tabular-nums text-sm align-middle whitespace-nowrap`
export const collectorPickupTdStatus =
  "collector-pickup-td-status px-2 py-1 align-middle whitespace-nowrap"
export const collectorPickupTdWorkflow =
  "collector-pickup-td-workflow px-2 py-1 align-middle whitespace-nowrap"

export const collectorPickupWorkflowActions =
  "collector-pickup-workflow-actions inline-flex items-center gap-2.5"

export const collectorPickupPostBtn =
  "rounded bg-[var(--btn-primary-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:border disabled:border-[var(--btn-disabled-border)] disabled:bg-[var(--btn-disabled-bg)] disabled:text-[var(--btn-disabled-fg)]"

export const collectorPickupPostBtnMuted =
  "rounded border border-[var(--btn-disabled-border)] bg-[var(--btn-disabled-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--btn-disabled-fg)]"

/** Re-export semantic admin UI classes for finance screens (see lib/theme/theme-classes). */
export {
  themeAdminTable,
  themeAdminTableCell,
  themeAdminTableCellMuted,
  themeAdminTableEmpty,
  themeAdminTableHead,
  themeAdminTableHeadCell,
  themeAdminTableRow,
  themeBadgeError,
  themeBadgeInfo,
  themeBadgeOrange,
  themeBadgeSuccess,
  themeBadgeWarning,
  themeBannerError,
  themeBannerSuccess,
  themeBannerWarning,
  themeBtnDanger,
  themeBtnPrimary,
  themeBtnSecondary,
  themeBtnSuccess,
  themeDialog,
  themeDialogOverlay,
  themeDialogWide,
  themeEmptyState,
  themeInput,
  themeLabel,
  themeLinkMuted,
  themeLinkPrimary,
  themeLoadingText,
  themeMeta,
  themeMuted,
  themePanelList,
  themePanelListItem,
  themeSectionTitle,
  themeSelect,
  themeTextPrimary,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"
