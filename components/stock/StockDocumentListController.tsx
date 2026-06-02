"use client"

import { useCallback, useEffect, useState } from "react"
import type { DocStatus, DocType } from "@/lib/stock-ui/types"
import { toStockDocumentUiError } from "@/lib/stock-ui/document-errors"
import { currentPeriodMonth } from "@/lib/stock-ui/format"
import { fetchShopSession } from "@/lib/stock-ui/session"
import { loadStockDocumentListPage } from "@/lib/stock-ui/stock-document-list-loader"
import type {
  StockDocumentListFilter,
  StockDocumentListItemVM,
} from "@/lib/stock-ui/types"
import {
  StockDocumentListView,
  type StockDocumentListFiltersVM,
} from "./StockDocumentListView"

function filtersToQuery(
  branchId: string,
  filters: StockDocumentListFiltersVM
): StockDocumentListFilter {
  return {
    branchId,
    ...(filters.docType ? { docType: filters.docType } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.periodMonth.trim()
      ? { periodMonth: filters.periodMonth.trim() }
      : {}),
  }
}

const defaultFilters = (): StockDocumentListFiltersVM => ({
  docType: "" as "" | DocType,
  status: "" as "" | DocStatus,
  periodMonth: currentPeriodMonth(),
})

export function StockDocumentListController() {
  const [branchId, setBranchId] = useState<string | null>(null)
  const [filters, setFilters] = useState<StockDocumentListFiltersVM>(defaultFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<StockDocumentListFiltersVM>(defaultFilters)
  const [items, setItems] = useState<StockDocumentListItemVM[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadList = useCallback(
    async (opts: {
      branch: string
      cursor?: string | null
      append?: boolean
      filterState: StockDocumentListFiltersVM
    }) => {
      const isAppend = Boolean(opts.append && opts.cursor)
      if (isAppend) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        const result = await loadStockDocumentListPage(
          filtersToQuery(opts.branch, opts.filterState),
          opts.cursor
        )
        setItems((prev) =>
          isAppend ? [...prev, ...result.items] : result.items
        )
        setNextCursor(result.nextCursor)
        setHasMore(result.hasMore)
      } catch (err: unknown) {
        setError(toStockDocumentUiError(err).message)
        if (!isAppend) {
          setItems([])
          setNextCursor(null)
          setHasMore(false)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    []
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      try {
        const session = await fetchShopSession()
        if (cancelled) return
        const initial = defaultFilters()
        setBranchId(session.branchId)
        setFilters(initial)
        setAppliedFilters(initial)
        await loadList({ branch: session.branchId, filterState: initial })
      } catch (err: unknown) {
        if (!cancelled) {
          setError(toStockDocumentUiError(err).message)
          setLoading(false)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [loadList])

  const handleApplyFilters = () => {
    if (!branchId) return
    setAppliedFilters(filters)
    void loadList({ branch: branchId, filterState: filters })
  }

  const handleLoadMore = () => {
    if (!branchId || !nextCursor || loadingMore) return
    void loadList({
      branch: branchId,
      cursor: nextCursor,
      append: true,
      filterState: appliedFilters,
    })
  }

  return (
    <StockDocumentListView
      items={items}
      filters={filters}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      hasMore={hasMore}
      onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
      onApplyFilters={handleApplyFilters}
      onLoadMore={handleLoadMore}
    />
  )
}
