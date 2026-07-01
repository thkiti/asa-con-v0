"use client"

import { useEffect, useState } from "react"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import {
  isCollectorPickupMoreFilterActive,
  type CollectorPickupSettlementUiFilter,
} from "@/lib/finance-ui/collector-pickup-settlement-list-filter"
import {
  voucherInquiryFilterActions,
  voucherInquiryFilterBar,
  voucherInquiryFilterBranch,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterButtonSecondary,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { INQUIRY_FILTER_DISMISS_ATTR } from "@/lib/finance-ui/inquiry-more-filter-state"
import { themeInlineError, themeLabel } from "@/lib/theme/theme-classes"

type CollectorPickupSettlementFilterBarProps = {
  draft: CollectorPickupSettlementUiFilter
  onDraftChange: (next: CollectorPickupSettlementUiFilter) => void
  isMoreFilterOpen: boolean
  setIsMoreFilterOpen: React.Dispatch<React.SetStateAction<boolean>>
  onApply: () => void
  onClear: () => void
  loading?: boolean
}

export function CollectorPickupSettlementFilterBar({
  draft,
  onDraftChange,
  isMoreFilterOpen,
  setIsMoreFilterOpen,
  onApply,
  onClear,
  loading = false,
}: CollectorPickupSettlementFilterBarProps) {
  const [branches, setBranches] = useState<PosSettlementBranchOption[]>([])
  const [branchesError, setBranchesError] = useState<string | null>(null)

  useEffect(() => {
    void fetchPosSettlementBranches()
      .then((result) => {
        setBranches(result.items)
        setBranchesError(null)
      })
      .catch((err) => {
        setBranches([])
        setBranchesError(err instanceof Error ? err.message : "Failed to load branches")
      })
  }, [])

  const moreFilterActive = isCollectorPickupMoreFilterActive(draft)

  return (
    <div
      className={voucherInquiryFilterBar}
      data-testid="collector-pickup-settlement-filters"
    >
      <label className={voucherInquiryFilterBranch}>
        <span className={themeLabel}>Branch</span>
        <select
          className={voucherInquiryFilterSelect}
          value={draft.branchId}
          onChange={(event) =>
            onDraftChange({ ...draft, branchId: event.target.value })
          }
          disabled={loading}
          data-testid="collector-pickup-filter-branch"
        >
          <option value="">All SH branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {formatPosSettlementBranchLabel(branch)}
            </option>
          ))}
        </select>
        {branchesError ? (
          <span className={`text-xs ${themeInlineError}`}>{branchesError}</span>
        ) : null}
      </label>

      <DocumentInquiryMoreFilter
        periodKey={draft.periodKey}
        onPeriodKeyChange={(value) =>
          onDraftChange({ ...draft, periodKey: value })
        }
        periodTestId="collector-pickup-filter-period"
        from={draft.dateFrom}
        to={draft.dateTo}
        onFromChange={(value) =>
          onDraftChange({ ...draft, dateFrom: value })
        }
        onToChange={(value) => onDraftChange({ ...draft, dateTo: value })}
        testIdPrefix="collector-pickup"
        isMoreFilterOpen={isMoreFilterOpen}
        setIsMoreFilterOpen={setIsMoreFilterOpen}
        onPeriodKeyEnter={onApply}
        isMoreFilterActive={moreFilterActive}
      />

      <div className={voucherInquiryFilterActions}>
        <button
          type="button"
          className={voucherInquiryFilterButtonPrimary}
          onClick={onApply}
          disabled={loading}
          {...{ [INQUIRY_FILTER_DISMISS_ATTR]: "true" }}
          data-testid="collector-pickup-apply"
        >
          {loading ? "…" : "Apply"}
        </button>
        <button
          type="button"
          className={voucherInquiryFilterButtonSecondary}
          onClick={onClear}
          disabled={loading}
          {...{ [INQUIRY_FILTER_DISMISS_ATTR]: "true" }}
          data-testid="collector-pickup-clear"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
