"use client"

import { useEffect, useState } from "react"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { BranchSelect } from "@/components/ui/BranchSelect"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
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
  voucherInquiryFilterBar,
  voucherInquiryFilterBranch,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
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
      <BranchSelect
        label="Branch"
        labelClassName={themeLabel}
        wrapperClassName={voucherInquiryFilterBranch}
        selectClassName={voucherInquiryFilterSelect}
        value={draft.branchId}
        onChange={(branchId) => onDraftChange({ ...draft, branchId })}
        options={branches}
        emptyOption={{ label: "All SH branches" }}
        formatOptionLabel={formatPosSettlementBranchLabel}
        disabled={loading}
        hint={
          branchesError ? (
            <span className={`text-xs ${themeInlineError}`}>{branchesError}</span>
          ) : null
        }
        data-testid="collector-pickup-filter-branch"
      />

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

      <InquiryFilterActions
        mode="apply-clear"
        onPrimary={onApply}
        onClear={onClear}
        loading={loading}
        loadingPrimaryLabel="…"
        dismissOnAction
        primaryTestId="collector-pickup-apply"
        clearTestId="collector-pickup-clear"
      />
    </div>
  )
}
