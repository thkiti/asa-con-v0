"use client"

import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import {
  voucherInquiryFilterActions,
  voucherInquiryFilterBar,
  voucherInquiryFilterBranch,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterButtonSecondary,
  voucherInquiryFilterDocType,
  voucherInquiryFilterInput,
  voucherInquiryFilterNo,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { INQUIRY_FILTER_DISMISS_ATTR } from "@/lib/finance-ui/inquiry-more-filter-state"
import {
  POS_REC_REF_LOOKUP_DOC_TYPE_OPTIONS,
  type PosRecRefLookupDocType,
  type PosRecRefLookupFilter,
} from "@/lib/pos-ui/pos-rec-ref-lookup-filter"
import { themeLabel } from "@/lib/theme/theme-classes"

export type PosRecRefLookupBranchOption = {
  id: string
  code: string
  name: string
}

type PosRecRefLookupFilterBarProps = {
  filter: PosRecRefLookupFilter
  onFilterChange: (next: PosRecRefLookupFilter) => void
  documentNo: string
  onDocumentNoChange: (value: string) => void
  branches?: PosRecRefLookupBranchOption[]
  showBranch?: boolean
  showDocType?: boolean
  isMoreFilterOpen: boolean
  setIsMoreFilterOpen: React.Dispatch<React.SetStateAction<boolean>>
  onSearch: () => void
  onClear: () => void
  loading?: boolean
  testIdPrefix?: string
  formatBranchLabel?: (branch: PosRecRefLookupBranchOption) => string
}

export function PosRecRefLookupFilterBar({
  filter,
  onFilterChange,
  documentNo,
  onDocumentNoChange,
  branches = [],
  showBranch = false,
  showDocType = true,
  isMoreFilterOpen,
  setIsMoreFilterOpen,
  onSearch,
  onClear,
  loading = false,
  testIdPrefix = "pos-rec-ref-lookup",
  formatBranchLabel = (branch) => `${branch.code} • ${branch.name}`,
}: PosRecRefLookupFilterBarProps) {
  return (
    <div className={voucherInquiryFilterBar} data-testid={`${testIdPrefix}-filters`}>
      {showBranch ? (
        <label className={voucherInquiryFilterBranch}>
          <span className={themeLabel}>Branch</span>
          <select
            className={voucherInquiryFilterSelect}
            value={filter.branchId ?? ""}
            onChange={(event) =>
              onFilterChange({
                ...filter,
                branchId: event.target.value || undefined,
              })
            }
            disabled={loading}
            data-testid={`${testIdPrefix}-filter-branch`}
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {formatBranchLabel(branch)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <DocumentInquiryMoreFilter
        periodKey={filter.periodKey ?? ""}
        onPeriodKeyChange={(value) =>
          onFilterChange({ ...filter, periodKey: value || undefined })
        }
        periodTestId={`${testIdPrefix}-filter-period`}
        from={filter.from ?? ""}
        to={filter.to ?? ""}
        onFromChange={(value) =>
          onFilterChange({ ...filter, from: value || undefined })
        }
        onToChange={(value) => onFilterChange({ ...filter, to: value || undefined })}
        testIdPrefix={testIdPrefix}
        isMoreFilterOpen={isMoreFilterOpen}
        setIsMoreFilterOpen={setIsMoreFilterOpen}
      />

      {showDocType ? (
        <label className={voucherInquiryFilterDocType}>
          <span className={themeLabel}>Doc Type</span>
          <select
            className={voucherInquiryFilterSelect}
            value={filter.docType ?? ""}
            onChange={(event) =>
              onFilterChange({
                ...filter,
                docType: event.target.value as PosRecRefLookupDocType,
              })
            }
            disabled={loading}
            data-testid={`${testIdPrefix}-filter-doc-type`}
          >
            {POS_REC_REF_LOOKUP_DOC_TYPE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className={voucherInquiryFilterNo}>
        <span className={themeLabel}>No</span>
        <input
          className={voucherInquiryFilterInput}
          value={documentNo}
          onChange={(event) => onDocumentNoChange(event.target.value)}
          placeholder="REC-… or REF-…"
          disabled={loading}
          data-testid={`${testIdPrefix}-filter-no`}
        />
      </label>

      <div className={voucherInquiryFilterActions}>
        <button
          type="button"
          className={voucherInquiryFilterButtonPrimary}
          onClick={onSearch}
          disabled={loading}
          {...{ [INQUIRY_FILTER_DISMISS_ATTR]: "true" }}
          data-testid={`${testIdPrefix}-search`}
        >
          Search
        </button>
        <button
          type="button"
          className={voucherInquiryFilterButtonSecondary}
          onClick={onClear}
          disabled={loading}
          {...{ [INQUIRY_FILTER_DISMISS_ATTR]: "true" }}
          data-testid={`${testIdPrefix}-clear`}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
