"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import type { DocStatus } from "@/lib/stock-ui/types"
import { toStockDocumentUiError } from "@/lib/stock-ui/document-errors"
import { fetchShopBranchOptions, type ShopBranchOption } from "@/lib/stock-ui/fetch-shop-branches"
import { currentPeriodMonth, formatStaffFacingDocumentTitle } from "@/lib/stock-ui/format"
import { buildFiscalPeriodOptions } from "@/lib/stock-ui/fiscal-period-options"
import { fetchShopSession } from "@/lib/stock-ui/session"
import { isHoStockDocumentViewer } from "@/lib/stock-ui/stock-document-viewer"
import {
  matchesStockDocumentKindFilter,
  stockDocumentKindToListQuery,
} from "@/lib/stock-ui/stock-document-kind-filter"
import { SHOP_STOCK_DOC_TYPES } from "@/lib/stock-ui/constants"
import { loadStockDocumentListPage } from "@/lib/stock-ui/stock-document-list-loader"
import type {
  StockDocumentListFilter,
  StockDocumentListItemVM,
} from "@/lib/stock-ui/types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"
import {
  StockDocumentListView,
  type StockDocumentListFiltersVM,
} from "./StockDocumentListView"

function filtersToQuery(
  branchId: string,
  filters: StockDocumentListFiltersVM
): StockDocumentListFilter {
  const kindQuery = stockDocumentKindToListQuery(filters.docKind, filters.status)
  return {
    branchId,
    ...kindQuery,
    ...(filters.periodMonth.trim() ? { periodMonth: filters.periodMonth.trim() } : {}),
  }
}

function defaultFilters(periodMonth = currentPeriodMonth()): StockDocumentListFiltersVM {
  return {
    shopBranchId: "",
    docKind: "",
    status: "" as "" | DocStatus,
    periodMonth,
  }
}

function resolveListBranchId(
  sessionBranchId: string,
  shopBranchId: string,
  isHoViewer: boolean
): string {
  if (isHoViewer && shopBranchId.trim()) {
    return shopBranchId.trim()
  }
  return sessionBranchId
}

export function StockDocumentListController() {
  const [sessionBranchId, setSessionBranchId] = useState<string | null>(null)
  const [viewerEntityCode, setViewerEntityCode] =
    useState<DocumentEntityCode>(DEFAULT_DOCUMENT_ENTITY_CODE)
  const [isHoViewer, setIsHoViewer] = useState(false)
  const [shopOptions, setShopOptions] = useState<ShopBranchOption[]>([])
  const [filters, setFilters] = useState<StockDocumentListFiltersVM>(defaultFilters())
  const [items, setItems] = useState<StockDocumentListItemVM[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const periodOptions = useMemo(() => buildFiscalPeriodOptions(), [])

  const listBranchId = useMemo(() => {
    if (!sessionBranchId) return null
    return resolveListBranchId(sessionBranchId, filters.shopBranchId, isHoViewer)
  }, [sessionBranchId, filters.shopBranchId, isHoViewer])

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
        const refinedItems = result.items.filter((row) =>
          matchesStockDocumentKindFilter(
            opts.filterState.docKind,
            opts.filterState.status,
            row
          )
        )
        setItems((prev) => (isAppend ? [...prev, ...refinedItems] : refinedItems))
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

        const hoViewer = isHoStockDocumentViewer(session.role)
        const initial = defaultFilters()
        let branches: ShopBranchOption[] = [
          {
            id: session.branchId,
            code: session.branchCode,
            name: session.branchName,
          },
        ]

        if (hoViewer) {
          try {
            branches = await fetchShopBranchOptions()
          } catch {
            branches = []
          }
        } else {
          initial.shopBranchId = session.branchId
        }

        setSessionBranchId(session.branchId)
        setViewerEntityCode(session.documentEntityCode)
        setIsHoViewer(hoViewer)
        setShopOptions(branches)
        setFilters(initial)
        setReady(true)
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
  }, [])

  useEffect(() => {
    if (!ready || !listBranchId) return
    void loadList({ branch: listBranchId, filterState: filters })
  }, [ready, listBranchId, filters, loadList])

  const handleLoadMore = () => {
    if (!listBranchId || !nextCursor || loadingMore) return
    void loadList({
      branch: listBranchId,
      cursor: nextCursor,
      append: true,
      filterState: filters,
    })
  }

  const showCreateActions = ready && !isHoViewer

  return (
    <MasterPageShell
      title="Stock Document"
      documentEntityCode={viewerEntityCode}
      description="Shop transfer, performance, and adjustment documents."
      backHref="/shop"
      backLabel="← Shop"
      headerActions={
        showCreateActions ? (
          <div className="flex flex-wrap justify-end gap-1">
            {SHOP_STOCK_DOC_TYPES.map((type) => (
              <Link
                key={type}
                href={`/shop/stock-documents/new?type=${type}`}
                className={themeBtnPrimary}
              >
                New {formatStaffFacingDocumentTitle(type, "DRAFT", viewerEntityCode)}
              </Link>
            ))}
          </div>
        ) : undefined
      }
    >
      <StockDocumentListView
        items={items}
        filters={filters}
        periodOptions={periodOptions}
        shopOptions={shopOptions}
        shopFilterDisabled={!isHoViewer}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onLoadMore={handleLoadMore}
        viewerEntityCode={viewerEntityCode}
      />
    </MasterPageShell>
  )
}
