"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ReceiptLookupResult } from "@/components/pos/ReceiptLookupResult"
import { PosRecRefLookupFilterBar } from "@/components/pos/PosRecRefLookupFilterBar"
import { PosRecRefLookupResultsTable } from "@/components/pos/PosRecRefLookupResultsTable"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { useInquiryMoreFilterOpen } from "@/lib/finance-ui/inquiry-more-filter-state"
import {
  emptyPosRecRefLookupFilter,
  type PosRecRefLookupFilter,
} from "@/lib/pos-ui/pos-rec-ref-lookup-filter"
import { searchPosRecRefLookup, type PosRecRefLookupRow } from "@/lib/pos-ui/pos-rec-ref-lookup"
import { pickDefaultShopBranchId } from "@/lib/shop/shop-branch-display"
import { fetchSalesTargetBranches } from "@/lib/shop-ui/sales-targets-client"
import type { SalesTargetBranchOption } from "@/lib/shop/sales-target-types"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"

type ReceiptLookupPageProps = {
  user: SessionUserApi
}

export function ReceiptLookupPage({ user }: ReceiptLookupPageProps) {
  const hoUser = user.role !== "SH_STAFF"
  const backHref = hoUser ? "/main/operations" : "/shop"
  const backLabel = hoUser ? "Operations" : "POS"
  const nowParts = bangkokCalendarParts(new Date())
  const defaultPeriodKey = `${nowParts.y}-${String(nowParts.m).padStart(2, "0")}`

  const [branches, setBranches] = useState<SalesTargetBranchOption[]>([])
  const [branchesLoaded, setBranchesLoaded] = useState(false)
  const [filter, setFilter] = useState<PosRecRefLookupFilter>(() => ({
    periodKey: defaultPeriodKey,
  }))
  const [documentNo, setDocumentNo] = useState("")
  const [rows, setRows] = useState<PosRecRefLookupRow[]>([])
  const [selectedRow, setSelectedRow] = useState<PosRecRefLookupRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const { isMoreFilterOpen, setIsMoreFilterOpen } = useInquiryMoreFilterOpen("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const branchesResult = await fetchSalesTargetBranches()
      if (cancelled) return
      setBranchesLoaded(true)
      if (!branchesResult.ok) {
        setError(branchesResult.error)
        return
      }
      setBranches(branchesResult.branches)
      setFilter((prev) => ({
        ...prev,
        branchId:
          prev.branchId && branchesResult.branches.some((branch) => branch.id === prev.branchId)
            ? prev.branchId
            : pickDefaultShopBranchId(branchesResult.branches, user.branchId),
      }))
    })()
    return () => {
      cancelled = true
    }
  }, [user.branchId])

  const branchId = useMemo(() => {
    if (hoUser) {
      return filter.branchId ?? ""
    }
    return user.branchId
  }, [hoUser, filter.branchId, user.branchId])

  const applySearch = useCallback(async () => {
    if (!branchId) return

    setIsMoreFilterOpen(false)
    setLoading(true)
    setError(null)
    setSelectedRow(null)

    const result = await searchPosRecRefLookup(branchId, {
      ...filter,
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
    setSelectedRow(result.rows[0] ?? null)
    setLoading(false)
    setSearched(true)
  }, [branchId, documentNo, filter, setIsMoreFilterOpen])

  const clearFilters = useCallback(() => {
    setIsMoreFilterOpen(false)
    setFilter({
      ...emptyPosRecRefLookupFilter(),
      periodKey: defaultPeriodKey,
      branchId: branchId || undefined,
    })
    setDocumentNo("")
    setRows([])
    setSelectedRow(null)
    setError(null)
    setSearched(false)
  }, [branchId, defaultPeriodKey, setIsMoreFilterOpen])

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-slate-200 to-slate-300"
      data-testid="receipt-lookup-page"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6">
        <Link
          href={backHref}
          className="mb-4 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          ← {backLabel}
        </Link>

        <header className="mb-4">
          <h1
            className="text-xl font-bold tracking-wide text-slate-900"
            data-testid="entity-context-page-title"
          >
            Receipt &amp; Refund Lookup
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Search posted REC and REF documents by period, branch, and document number.
          </p>
        </header>

        <div className="theme-panel rounded-lg border border-slate-200 bg-[var(--panel-bg)] p-4 shadow-sm">
          {hoUser && branchesLoaded && branches.length > 0 ? (
            <PosRecRefLookupFilterBar
              filter={filter}
              onFilterChange={setFilter}
              documentNo={documentNo}
              onDocumentNoChange={setDocumentNo}
              branches={branches}
              showBranch
              isMoreFilterOpen={isMoreFilterOpen}
              setIsMoreFilterOpen={setIsMoreFilterOpen}
              onSearch={() => void applySearch()}
              onClear={clearFilters}
              loading={loading}
              testIdPrefix="receipt-lookup"
            />
          ) : (
            <PosRecRefLookupFilterBar
              filter={filter}
              onFilterChange={setFilter}
              documentNo={documentNo}
              onDocumentNoChange={setDocumentNo}
              isMoreFilterOpen={isMoreFilterOpen}
              setIsMoreFilterOpen={setIsMoreFilterOpen}
              onSearch={() => void applySearch()}
              onClear={clearFilters}
              loading={loading}
              testIdPrefix="receipt-lookup"
            />
          )}

          {error ? (
            <p className="mt-3 text-sm text-red-600" role="alert" data-testid="receipt-lookup-error">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-4 text-sm text-slate-600" data-testid="receipt-lookup-loading">
              Searching…
            </p>
          ) : searched ? (
            <div className="mt-4 space-y-4">
              <PosRecRefLookupResultsTable
                rows={rows}
                total={rows.length}
                selectedId={selectedRow?.id ?? null}
                onSelect={setSelectedRow}
                testIdPrefix="receipt-lookup"
              />
              {selectedRow?.receipt ? (
                <ReceiptLookupResult
                  receipt={selectedRow.receipt}
                  branchId={branchId}
                  notFound={false}
                />
              ) : selectedRow?.refund ? (
                <p className="text-sm text-slate-600" data-testid="receipt-lookup-refund-selected">
                  Selected refund {selectedRow.documentNo}. Open from Actions to view the slip.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
