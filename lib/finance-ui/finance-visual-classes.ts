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

export const collectorPickupSettlementPageClass = "collector-pickup-settlement-page w-full"

export const collectorPickupSettlementTableWrap =
  "collector-pickup-settlement-table-wrap mt-4 w-full max-w-full"

export const collectorPickupSettlementTable =
  "collector-pickup-settlement-table finance-table finance-table--compact w-full max-w-full"

/** Voucher / journal inquiry — compact single-row filter bar. */
export const voucherInquiryFilterBar =
  "voucher-inquiry-filter-bar flex flex-wrap items-end gap-2"

export const voucherInquiryFilterBranch =
  "voucher-inquiry-filter-field voucher-inquiry-filter-branch"

export const voucherInquiryFilterStatus =
  "voucher-inquiry-filter-field voucher-inquiry-filter-status"

export const voucherInquiryFilterPostingState =
  "voucher-inquiry-filter-field voucher-inquiry-filter-posting-state"

/** Inquiry PDF column when archive path is missing */
export const financePdfMissing = "finance-pdf-missing"

/** Voucher inquiry — archive PDF status dot */
export const financePdfIndicator = "finance-pdf-indicator"
export const financePdfIndicatorExists = "finance-pdf-indicator--exists"
export const financePdfIndicatorMissing = "finance-pdf-indicator--missing"
export const financePdfIndicatorUnsupported = "finance-pdf-indicator--unsupported"
export const financePdfIndicatorLink = "finance-pdf-indicator-link"
export const financePdfIndicatorStatic = "finance-pdf-indicator-static"

export const voucherInquiryTable = "voucher-inquiry-table"
export const voucherInquiryTdDocNo = "voucher-inquiry-td-doc-no"
export const voucherInquiryTdDate = "voucher-inquiry-td-date"
export const voucherInquiryTdVoucherNo = "voucher-inquiry-td-voucher-no"
export const voucherInquiryTdJournal = "voucher-inquiry-td-journal"
export const voucherInquiryTdActions = "voucher-inquiry-td-actions"
export const voucherInquiryActions = "voucher-inquiry-actions"

export const voucherInquiryFilterNo =
  "voucher-inquiry-filter-field voucher-inquiry-filter-no"

/** @deprecated Use voucherInquiryFilterNo */
export const voucherInquiryFilterDocumentNo =
  "voucher-inquiry-filter-field voucher-inquiry-filter-document-no"

export const voucherInquiryFilterAmount =
  "voucher-inquiry-filter-field voucher-inquiry-filter-amount"

export const voucherInquiryFilterPdfState =
  "voucher-inquiry-filter-field voucher-inquiry-filter-pdf-state"

export const voucherInquiryFilterField =
  "voucher-inquiry-filter-field flex flex-col gap-1 text-sm shrink-0"

export const voucherInquiryFilterPeriod =
  "voucher-inquiry-filter-field voucher-inquiry-filter-period"

export const voucherInquiryFilterDate =
  "voucher-inquiry-filter-field voucher-inquiry-filter-date"

export const voucherInquiryFilterDocType =
  "voucher-inquiry-filter-field voucher-inquiry-filter-ref-type"

/** @deprecated Use voucherInquiryFilterDocType */
export const voucherInquiryFilterRefType = voucherInquiryFilterDocType

export const voucherInquiryFilterVoucherNo =
  "voucher-inquiry-filter-field voucher-inquiry-filter-voucher-no"

export const voucherInquiryFilterActions =
  "voucher-inquiry-filter-actions flex shrink-0 items-end gap-2"

/** Shared fixed height for inquiry filter inputs, selects, and buttons */
export const voucherInquiryFilterControl = "voucher-inquiry-filter-control"

/** Framed input box — same border/background as finance-filter-select */
export const voucherInquiryFilterFramed = "voucher-inquiry-filter-framed"

/** Native filter dropdown — dark closed field, light readable option list in all themes. */
export const financeFilterSelect = "finance-filter-select"

export const voucherInquiryFilterInput = `theme-input ${voucherInquiryFilterControl} voucher-inquiry-filter-framed w-full min-w-0`

export const voucherInquiryFilterSelect = `${financeFilterSelect} ${voucherInquiryFilterControl}`

export const voucherInquiryFilterButtonPrimary =
  "voucher-inquiry-filter-button voucher-inquiry-filter-control rounded bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover)]"

export const voucherInquiryFilterButtonSecondary =
  "voucher-inquiry-filter-button voucher-inquiry-filter-control rounded border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-fg)] hover:bg-[var(--btn-secondary-hover)]"

export const collectorPickupTh = "px-2 py-2 text-left whitespace-nowrap"
export const collectorPickupThAmount = `${numericTh} px-2 py-2 whitespace-nowrap`
export const collectorPickupThStatus =
  "collector-pickup-th-status px-2 py-2 text-right whitespace-nowrap"
export const collectorPickupThWorkflow =
  "collector-pickup-th-workflow px-2 py-2 text-left whitespace-nowrap"

export const collectorPickupTdCollectNo =
  "px-2 py-1.5 align-middle font-mono text-sm whitespace-nowrap"
export const collectorPickupTdBranch =
  "collector-pickup-td-branch px-2 py-1.5 align-middle text-sm"
export const collectorPickupTdAmount = `${numericCell} px-2 py-1.5 tabular-nums text-sm align-middle whitespace-nowrap`
export const collectorPickupTdStatus =
  "collector-pickup-td-status px-2 py-1.5 align-middle whitespace-nowrap text-right"
export const collectorPickupTdWorkflow =
  "collector-pickup-td-workflow px-2 py-1.5 align-middle whitespace-nowrap"

export const collectorPickupWorkflowActions =
  "collector-pickup-workflow-actions inline-flex items-center"

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
