"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react"
import {
  DocumentTraceMoreFilterDateField,
  documentTraceDateFieldDisplayFromIso,
  documentTraceDateFieldIsoValue,
} from "@/components/finance/DocumentTraceMoreFilterDateField"
import { BranchSelect } from "@/components/ui/BranchSelect"
import { MoreFilterPopover } from "@/components/ui/MoreFilterPopover"
import { voucherInquiryFilterInput } from "@/lib/finance-ui/finance-visual-classes"
import {
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import type { DocumentTraceFilters } from "@/lib/finance/audit/document-trace-filters"
import {
  buildDocumentTraceCommittedDatePatch,
  documentTracePeriodToIsoRange,
  formatDocumentTraceDisplayDate,
  parseDocumentTraceDisplayDate,
  resolveDocumentTraceDateDrafts,
} from "@/lib/finance-ui/document-trace-date-range"
import { themeLabel } from "@/lib/theme/theme-classes"

export type DocumentTraceMoreFilterHandle = {
  commitDateRange: () => Pick<DocumentTraceFilters, "dateFrom" | "dateTo">
}

type DocumentTraceMoreFilterProps = {
  filters: DocumentTraceFilters
  onChange: (patch: Partial<DocumentTraceFilters>) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  isActive: boolean
  showShopField: boolean
  shopMode: "select" | "locked"
  shopLabel: string
  branches: PosSettlementBranchOption[]
}

export const DocumentTraceMoreFilter = forwardRef<
  DocumentTraceMoreFilterHandle,
  DocumentTraceMoreFilterProps
>(function DocumentTraceMoreFilter(
  {
    filters,
    onChange,
    isOpen,
    onOpenChange,
    isActive,
    showShopField,
    shopMode,
    shopLabel,
    branches,
  },
  ref
) {
  const [dateFromDraft, setDateFromDraft] = useState("")
  const [dateToDraft, setDateToDraft] = useState("")

  const periodRange = documentTracePeriodToIsoRange(filters.period)

  const resetDraftsFromFilters = () => {
    const drafts = resolveDocumentTraceDateDrafts({
      period: filters.period,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    })
    setDateFromDraft(drafts.dateFrom)
    setDateToDraft(drafts.dateTo)
  }

  useEffect(() => {
    if (!isOpen) return
    resetDraftsFromFilters()
  }, [isOpen, filters.period, filters.dateFrom, filters.dateTo])

  const commitDateRange = (): Pick<DocumentTraceFilters, "dateFrom" | "dateTo"> => {
    return buildDocumentTraceCommittedDatePatch({
      period: filters.period,
      dateFromDisplay: dateFromDraft,
      dateToDisplay: dateToDraft,
    })
  }

  useImperativeHandle(ref, () => ({ commitDateRange }), [
    dateFromDraft,
    dateToDraft,
    filters.period,
  ])

  const revertDraft = (field: "from" | "to") => {
    const drafts = resolveDocumentTraceDateDrafts({
      period: filters.period,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    })
    if (field === "from") {
      setDateFromDraft(drafts.dateFrom)
      return
    }
    setDateToDraft(drafts.dateTo)
  }

  const normalizedDisplay = (field: "from" | "to", patch: Pick<DocumentTraceFilters, "dateFrom" | "dateTo">) => {
    if (field === "from") {
      return patch.dateFrom
        ? formatDocumentTraceDisplayDate(patch.dateFrom)
        : resolveDocumentTraceDateDrafts({
            period: filters.period,
            dateFrom: "",
            dateTo: filters.dateTo,
          }).dateFrom
    }

    return patch.dateTo
      ? formatDocumentTraceDisplayDate(patch.dateTo)
      : resolveDocumentTraceDateDrafts({
          period: filters.period,
          dateFrom: filters.dateFrom,
          dateTo: "",
        }).dateTo
  }

  const handleBlur = (field: "from" | "to") => {
    const display = field === "from" ? dateFromDraft : dateToDraft
    if (display.trim() && !parseDocumentTraceDisplayDate(display)) {
      revertDraft(field)
      return
    }

    const patch = commitDateRange()
    onChange(patch)
    if (field === "from") {
      setDateFromDraft(normalizedDisplay("from", patch))
      return
    }
    setDateToDraft(normalizedDisplay("to", patch))
  }

  const handleCalendarPick = (field: "from" | "to", iso: string) => {
    const display = documentTraceDateFieldDisplayFromIso(iso)
    const nextFrom = field === "from" ? display : dateFromDraft
    const nextTo = field === "to" ? display : dateToDraft

    if (field === "from") {
      setDateFromDraft(display)
    } else {
      setDateToDraft(display)
    }

    onChange(
      buildDocumentTraceCommittedDatePatch({
        period: filters.period,
        dateFromDisplay: nextFrom,
        dateToDisplay: nextTo,
      })
    )
  }

  return (
    <MoreFilterPopover
      open={isOpen}
      onOpenChange={onOpenChange}
      active={isActive}
      testId="document-trace-more-filter"
      panelTestId="document-trace-more-filter-panel"
      panelAriaLabel="Date range filter"
    >
      {showShopField ? (
        <label className="flex min-w-[10rem] flex-col gap-1">
          <span className={themeLabel}>{shopLabel}</span>
          {shopMode === "locked" ? (
            <input
              type="text"
              value={shopLabel}
              disabled
              className={voucherInquiryFilterInput}
              data-testid="document-trace-more-branch-locked"
            />
          ) : (
            <BranchSelect
              value={filters.branchCode}
              onChange={(branchCode) => onChange({ branchCode })}
              options={branches}
              valueKey="code"
              emptyOption={{ label: "All shops" }}
              selectClassName={voucherInquiryFilterInput}
              formatOptionLabel={formatPosSettlementBranchLabel}
              data-testid="document-trace-more-branch-select"
            />
          )}
        </label>
      ) : null}
      <DocumentTraceMoreFilterDateField
        displayValue={dateFromDraft}
        isoValue={documentTraceDateFieldIsoValue(
          dateFromDraft,
          periodRange?.dateFrom ?? ""
        )}
        minIso={periodRange?.dateFrom}
        maxIso={periodRange?.dateTo}
        ariaLabel="From date"
        testId="document-trace-more-date-from"
        onDisplayChange={setDateFromDraft}
        onBlur={() => handleBlur("from")}
        onCalendarPick={(iso) => handleCalendarPick("from", iso)}
      />
      <DocumentTraceMoreFilterDateField
        displayValue={dateToDraft}
        isoValue={documentTraceDateFieldIsoValue(
          dateToDraft,
          periodRange?.dateTo ?? ""
        )}
        minIso={periodRange?.dateFrom}
        maxIso={periodRange?.dateTo}
        ariaLabel="To date"
        testId="document-trace-more-date-to"
        onDisplayChange={setDateToDraft}
        onBlur={() => handleBlur("to")}
        onCalendarPick={(iso) => handleCalendarPick("to", iso)}
      />
    </MoreFilterPopover>
  )
})
