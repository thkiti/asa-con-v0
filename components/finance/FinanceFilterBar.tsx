"use client"

import { useEffect, useState } from "react"
import { BranchSelect } from "@/components/ui/BranchSelect"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import type { FinanceFilterValues } from "@/lib/finance-ui/types"
import {
  voucherInquiryFilterBar,
  voucherInquiryFilterField,
  voucherInquiryFilterInput,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLabel } from "@/lib/theme/theme-classes"

type FinanceFilterBarProps = {
  values: FinanceFilterValues
  onChange: (values: FinanceFilterValues) => void
  onApply: () => void
  loading?: boolean
}

export function FinanceFilterBar({
  values,
  onChange,
  onApply,
  loading = false,
}: FinanceFilterBarProps) {
  const [branches, setBranches] = useState<PosSettlementBranchOption[]>([])

  useEffect(() => {
    void fetchPosSettlementBranches()
      .then((result) => setBranches(result.items))
      .catch(() => setBranches([]))
  }, [])

  return (
    <form
      className={voucherInquiryFilterBar}
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      <BranchSelect
        label="Branch ID"
        labelClassName={themeLabel}
        wrapperClassName={voucherInquiryFilterField}
        selectClassName={voucherInquiryFilterSelect}
        value={values.branchId ?? ""}
        onChange={(branchId) =>
          onChange({ ...values, branchId: branchId || undefined })
        }
        options={branches}
        emptyOption={{ label: "Optional" }}
        formatOptionLabel={formatPosSettlementBranchLabel}
      />
      <label className={voucherInquiryFilterField}>
        <span className={themeLabel}>From</span>
        <input
          type="date"
          value={values.from ?? ""}
          onChange={(event) =>
            onChange({ ...values, from: event.target.value })
          }
          className={voucherInquiryFilterInput}
        />
      </label>
      <label className={voucherInquiryFilterField}>
        <span className={themeLabel}>To</span>
        <input
          type="date"
          value={values.to ?? ""}
          onChange={(event) =>
            onChange({ ...values, to: event.target.value })
          }
          className={voucherInquiryFilterInput}
        />
      </label>
      <InquiryFilterActions
        mode="apply-only"
        onPrimary={onApply}
        loading={loading}
        loadingPrimaryLabel="Loading…"
        primaryType="submit"
      />
    </form>
  )
}
