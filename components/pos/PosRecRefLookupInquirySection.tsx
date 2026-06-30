"use client"

import { forwardRef, useCallback, useImperativeHandle, useState } from "react"
import { PosRecRefLookupFilterBar } from "@/components/pos/PosRecRefLookupFilterBar"
import { PosRecRefLookupResultsTable } from "@/components/pos/PosRecRefLookupResultsTable"
import { useInquiryMoreFilterOpen } from "@/lib/finance-ui/inquiry-more-filter-state"
import {
  emptyPosRecRefLookupFilter,
  type PosRecRefLookupFilter,
  type PosRecRefLookupDocType,
} from "@/lib/pos-ui/pos-rec-ref-lookup-filter"
import { searchPosRecRefLookup, type PosRecRefLookupRow } from "@/lib/pos-ui/pos-rec-ref-lookup"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import { themeInlineError } from "@/lib/theme/theme-classes"

type PosRecRefLookupInquirySectionProps = {
  branchId: string
  docType: "REC" | "REF"
  loading?: boolean
  onLoadingChange?: (loading: boolean) => void
  onSelectRow: (row: PosRecRefLookupRow | null) => void
  testIdPrefix?: string
}

export type PosRecRefLookupInquirySectionHandle = {
  search: () => void
}

export const PosRecRefLookupInquirySection = forwardRef<
  PosRecRefLookupInquirySectionHandle,
  PosRecRefLookupInquirySectionProps
>(function PosRecRefLookupInquirySection(
  {
    branchId,
    docType,
    loading: externalLoading = false,
    onLoadingChange,
    onSelectRow,
    testIdPrefix = "pos-rec-ref-lookup",
  },
  ref
) {
  const nowParts = bangkokCalendarParts(new Date())
  const defaultPeriodKey = `${nowParts.y}-${String(nowParts.m).padStart(2, "0")}`
  const mappedDocType: PosRecRefLookupDocType = docType

  const [filter, setFilter] = useState<PosRecRefLookupFilter>(() => ({
    periodKey: defaultPeriodKey,
    docType: mappedDocType,
  }))
  const [documentNo, setDocumentNo] = useState("")
  const [rows, setRows] = useState<PosRecRefLookupRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [internalLoading, setInternalLoading] = useState(false)
  const { isMoreFilterOpen, setIsMoreFilterOpen } = useInquiryMoreFilterOpen("")

  const loading = externalLoading || internalLoading

  const setLoading = useCallback(
    (value: boolean) => {
      setInternalLoading(value)
      onLoadingChange?.(value)
    },
    [onLoadingChange]
  )

  const applySearch = useCallback(async () => {
    if (!branchId.trim()) return

    setIsMoreFilterOpen(false)
    setLoading(true)
    setError(null)
    onSelectRow(null)

    const result = await searchPosRecRefLookup(branchId, {
      ...filter,
      docType: mappedDocType,
      documentNo: documentNo || undefined,
    })

    if (!result.ok) {
      setError(result.error)
      setRows([])
      setLoading(false)
      setSearched(true)
      return
    }

    setRows(result.rows)
    onSelectRow(result.rows[0] ?? null)
    setLoading(false)
    setSearched(true)
  }, [
    branchId,
    documentNo,
    filter,
    mappedDocType,
    onSelectRow,
    setIsMoreFilterOpen,
    setLoading,
  ])

  const clearFilters = useCallback(() => {
    setIsMoreFilterOpen(false)
    setFilter({
      ...emptyPosRecRefLookupFilter(),
      periodKey: defaultPeriodKey,
      docType: mappedDocType,
    })
    setDocumentNo("")
    setRows([])
    setError(null)
    setSearched(false)
    onSelectRow(null)
  }, [defaultPeriodKey, mappedDocType, onSelectRow, setIsMoreFilterOpen])

  useImperativeHandle(
    ref,
    () => ({
      search: () => {
        void applySearch()
      },
    }),
    [applySearch]
  )

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-inquiry-section`}>
      <PosRecRefLookupFilterBar
        filter={filter}
        onFilterChange={(next) => setFilter({ ...next, docType: mappedDocType })}
        documentNo={documentNo}
        onDocumentNoChange={setDocumentNo}
        isMoreFilterOpen={isMoreFilterOpen}
        setIsMoreFilterOpen={setIsMoreFilterOpen}
        onSearch={() => void applySearch()}
        onClear={clearFilters}
        loading={loading}
        showDocType={false}
        testIdPrefix={testIdPrefix}
      />

      {error ? (
        <p className={themeInlineError} role="alert" data-testid={`${testIdPrefix}-error`}>
          {error}
        </p>
      ) : null}

      {searched ? (
        <PosRecRefLookupResultsTable
          rows={rows}
          total={rows.length}
          onSelect={onSelectRow}
          testIdPrefix={testIdPrefix}
        />
      ) : null}
    </div>
  )
})
