"use client"

import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { BranchSelect } from "@/components/ui/BranchSelect"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import {
  voucherInquiryFilterBar,
  voucherInquiryFilterBranch,
  voucherInquiryFilterDocType,
  voucherInquiryFilterInput,
  voucherInquiryFilterNo,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
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
        <BranchSelect
          label="Branch"
          labelClassName={themeLabel}
          wrapperClassName={voucherInquiryFilterBranch}
          selectClassName={voucherInquiryFilterSelect}
          value={filter.branchId ?? ""}
          onChange={(branchId) =>
            onFilterChange({
              ...filter,
              branchId: branchId || undefined,
            })
          }
          options={branches}
          emptyOption
          formatOptionLabel={formatBranchLabel}
          disabled={loading}
          data-testid={`${testIdPrefix}-filter-branch`}
        />
      ) : null}

      <DocumentInquiryMoreFilter
        periodKey={filter.periodKey ?? ""}
        onPeriodKeyChange={(value) =>
          onFilterChange({ ...filter, periodKey: value || undefined })
        }
        periodTestId={`${testIdPrefix}-filter-period`}
        periodMode="calendar"
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

      <InquiryFilterActions
        onPrimary={onSearch}
        onClear={onClear}
        loading={loading}
        dismissOnAction
        primaryTestId={`${testIdPrefix}-search`}
        clearTestId={`${testIdPrefix}-clear`}
      />
    </div>
  )
}
