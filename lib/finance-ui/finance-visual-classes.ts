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
/** Document trace list — bounded vertical scroll with sticky header */
export const documentTraceListScroll =
  "finance-table-scroll max-h-[26.25rem] overflow-y-auto overflow-x-auto"

export const documentTraceListTableHead =
  "sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(228_228_231)]"

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
/** Inline account row: fixed-width code • name (CSS grid) */
export const financeAccountDisplay = "finance-account-display finance-account"
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

/** Sticky compact identity + actions on posted MJV detail (screen only — see globals.css). */
export const financePostedDocumentStickyBar = "finance-posted-document-sticky-bar"

/** @deprecated Use financePostedDocumentStickyBar */
export const financePostedDocumentActionsSticky = financePostedDocumentStickyBar

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
  "voucher-inquiry-filter-bar flex flex-wrap md:flex-nowrap items-end gap-2"

export const voucherInquiryFilterBranch =
  "voucher-inquiry-filter-field voucher-inquiry-filter-branch"

export const voucherInquiryFilterBranchWide =
  "voucher-inquiry-filter-field voucher-inquiry-filter-branch-wide"

export const voucherInquiryFilterGlAccount =
  "voucher-inquiry-filter-field voucher-inquiry-filter-gl-account"

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

export const voucherInquiryFilterPeriodYear =
  "voucher-inquiry-filter-field voucher-inquiry-filter-period-year"

export const voucherInquiryFilterPeriodMonth =
  "voucher-inquiry-filter-field voucher-inquiry-filter-period-month"

export const voucherInquiryFilterPeriodGroup =
  "voucher-inquiry-filter-period-group shrink-0"

export const voucherInquiryFilterDate =
  "voucher-inquiry-filter-field voucher-inquiry-filter-date"

export const voucherInquiryFilterMore =
  "voucher-inquiry-filter-field voucher-inquiry-filter-more shrink-0"

export const voucherInquiryMoreFilterButton =
  "voucher-inquiry-more-filter-button voucher-inquiry-filter-control voucher-inquiry-filter-framed"

export const voucherInquiryMoreFilterButtonActive =
  "voucher-inquiry-more-filter-button--active"

export const voucherInquiryMoreFilterButtonDot =
  "voucher-inquiry-more-filter-button-dot"

export const voucherInquiryMoreFilterPopover =
  "voucher-inquiry-more-filter-popover"

export const voucherInquiryMoreFilterPopoverHidden =
  "voucher-inquiry-more-filter-popover--hidden"

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

export const voucherInquiryMoreFilterDateInput = `${voucherInquiryFilterInput} voucher-inquiry-more-filter-date shrink-0`

export const voucherInquiryFilterSelect = `${financeFilterSelect} ${voucherInquiryFilterControl}`

export const voucherInquiryFilterButtonPrimary =
  "voucher-inquiry-filter-button voucher-inquiry-filter-control rounded bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover)]"

export const voucherInquiryFilterButtonSecondary =
  "voucher-inquiry-filter-button voucher-inquiry-filter-control rounded border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-fg)] hover:bg-[var(--btn-secondary-hover)]"

export const manualJournalEntryListActionRow =
  "manual-journal-entry-list-actions flex flex-wrap items-center gap-2"

export const manualJournalEntryListActionPrimary =
  "manual-journal-entry-list-action-primary rounded bg-zinc-900 px-4 py-2 text-sm text-white"

export const manualJournalEntryListActionSecondary =
  "manual-journal-entry-list-action-secondary rounded border border-zinc-300 px-3 py-2 text-sm"

export const manualJournalEntryListTable = "manual-journal-entry-list-table"
export const manualJournalEntryListTdDocNo = "mjv-list-td-doc-no"
export const manualJournalEntryListTdDate = "mjv-list-td-date"
export const manualJournalEntryListTdDescription = "mjv-list-td-description"
export const manualJournalEntryListTdLines = "mjv-list-td-lines"
export const manualJournalEntryListTdStatus = "mjv-list-td-status"
export const manualJournalEntryListFilterEntryType =
  "voucher-inquiry-filter-field voucher-inquiry-filter-ref-type manual-journal-entry-filter-entry-type"

export const financeLegacyPdfSnapshotPanel =
  "finance-legacy-pdf-snapshot-panel no-print rounded border px-3 py-3"

export const financeLegacyPdfSnapshotTitle =
  "finance-legacy-pdf-snapshot-title text-xs font-medium uppercase tracking-wide"

export const financeLegacyPdfSnapshotActions =
  "finance-legacy-pdf-snapshot-actions mt-2 flex flex-wrap items-center gap-2"

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

export const collectorPickupSettlementDetailSectionTitle =
  "collector-pickup-settlement-detail-section-title text-sm font-semibold"

export const collectorPickupSettlementDetailStatus =
  "collector-pickup-settlement-detail-status text-sm"

export const collectorPickupSettlementDetailJournalBox =
  "collector-pickup-settlement-detail-journal overflow-x-auto rounded p-3 font-mono text-sm leading-6"

export const collectorPickupSettlementDetailVoucherLink =
  "collector-pickup-settlement-detail-voucher-link text-sm underline underline-offset-2"

export const collectorPickupSettlementDetailTechnical =
  "collector-pickup-settlement-detail-technical mt-6 border-t border-[#e4e4e7] pt-3 text-xs"

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
