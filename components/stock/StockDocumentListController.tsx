"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  HO_BRANCH_CODE,
} from "@/lib/legal-entity/constants"
import {
  filterBranchesForEntityScope,
  getStockDocumentLocationMode,
  getStockDocumentWorkflowContextLabel,
  normalizeFiltersForEntity,
  requiresSpecificShopForEnd,
} from "@/lib/stock/document-read/stock-document-entity-policy"
import { toStockDocumentUiError } from "@/lib/stock-ui/document-errors"
import {
  fetchShopBranchOptions,
  type ShopBranchOption,
} from "@/lib/stock-ui/fetch-shop-branches"
import { formatStaffFacingDocumentTitle } from "@/lib/stock-ui/format"
import { fetchShopSession } from "@/lib/stock-ui/session"
import { isHoStockDocumentViewer } from "@/lib/stock-ui/stock-document-viewer"
import {
  matchesStockDocumentKindFilter,
  stockDocumentKindToListQuery,
} from "@/lib/stock-ui/stock-document-kind-filter"
import { getOrCreateEndDocument } from "@/lib/stock-ui/end-fetchers"
import { canViewEnd } from "@/lib/stock-ui/end-permissions"
import { SHOP_STOCK_DOC_TYPES } from "@/lib/stock-ui/constants"
import { loadStockDocumentListPage } from "@/lib/stock-ui/stock-document-list-loader"
import {
  clearStockDocumentListFilters,
  defaultStockDocumentListFilters,
  resolveStockDocumentPeriodKey,
} from "@/lib/stock-ui/stock-document-list-filters"
import type {
  StockDocumentListFilter,
  StockDocumentListItemVM,
} from "@/lib/stock-ui/types"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"
import {
  StockDocumentListView,
  type StockDocumentListFiltersVM,
} from "./StockDocumentListView"

function filtersToQuery(
  branchId: string | null,
  filters: StockDocumentListFiltersVM
): StockDocumentListFilter {
  const kindQuery = stockDocumentKindToListQuery(filters.docKind, filters.status)
  const periodKey = resolveStockDocumentPeriodKey(filters.periodMonth)
  return {
    ...(branchId ? { branchId } : {}),
    ...kindQuery,
    periodKey,
  }
}

function defaultFilters(): StockDocumentListFiltersVM {
  return defaultStockDocumentListFilters()
}

function resolveHoOption(
  session: { branchId: string; branchCode: string; branchName: string },
  shops: readonly ShopBranchOption[]
): ShopBranchOption | null {
  if (session.branchCode.trim().toUpperCase() === HO_BRANCH_CODE) {
    return {
      id: session.branchId,
      code: session.branchCode,
      name: session.branchName || "Head Office",
    }
  }
  const fromList = shops.find(
    (b) => b.code.trim().toUpperCase() === HO_BRANCH_CODE
  )
  return fromList ?? null
}

export function StockDocumentListController() {
  const router = useRouter()
  const [sessionBranchId, setSessionBranchId] = useState<string | null>(null)
  const [viewerEntityCode, setViewerEntityCode] =
    useState<DocumentEntityCode>(DEFAULT_DOCUMENT_ENTITY_CODE)
  const [isHoViewer, setIsHoViewer] = useState(false)
  const [canOpenEnd, setCanOpenEnd] = useState(false)
  const [locationOptions, setLocationOptions] = useState<ShopBranchOption[]>([])
  const [hoBranchId, setHoBranchId] = useState<string | null>(null)
  const [filters, setFilters] = useState<StockDocumentListFiltersVM>(defaultFilters())
  const [items, setItems] = useState<StockDocumentListItemVM[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [openEndBusy, setOpenEndBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const prevEntityRef = useRef<DocumentEntityCode | null>(null)

  const locationMode = getStockDocumentLocationMode(viewerEntityCode)

  const listBranchId = useMemo((): string | null => {
    if (!ready) return null
    if (viewerEntityCode === "AD") {
      return hoBranchId
    }
    if (isHoViewer) {
      return filters.shopBranchId.trim() || null
    }
    return sessionBranchId
  }, [
    ready,
    viewerEntityCode,
    hoBranchId,
    isHoViewer,
    filters.shopBranchId,
    sessionBranchId,
  ])

  const canQueryList = ready && (viewerEntityCode === "AD" ? Boolean(hoBranchId) : true)

  const loadList = useCallback(
    async (opts: {
      branch: string | null
      cursor?: string | null
      append?: boolean
      filterState: StockDocumentListFiltersVM
    }) => {
      const isAppend = Boolean(opts.append && opts.cursor)
      if (isAppend) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setItems([])
        setNextCursor(null)
        setHasMore(false)
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
        const entity = session.documentEntityCode
        const initial = defaultFilters()
        let shops: ShopBranchOption[] = []

        if (hoViewer) {
          try {
            shops = await fetchShopBranchOptions()
          } catch {
            shops = []
          }
        } else {
          shops = [
            {
              id: session.branchId,
              code: session.branchCode,
              name: session.branchName,
            },
          ]
          initial.shopBranchId = session.branchId
        }

        const ho = resolveHoOption(session, shops)
        const scoped = filterBranchesForEntityScope(entity, shops, ho)
        if (entity === "AD" && ho) {
          initial.shopBranchId = ho.id
        }

        setSessionBranchId(session.branchId)
        setViewerEntityCode(entity)
        setIsHoViewer(hoViewer)
        setCanOpenEnd(hoViewer && canViewEnd(session.role))
        setHoBranchId(ho?.id ?? null)
        setLocationOptions(scoped)
        setFilters(initial)
        prevEntityRef.current = entity
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
    if (!ready) return

    async function refreshEntityFromSession() {
      try {
        const session = await fetchShopSession()
        setViewerEntityCode((prev) =>
          prev === session.documentEntityCode ? prev : session.documentEntityCode
        )
      } catch {
        // keep current scope on transient session errors
      }
    }

    const onFocus = () => {
      void refreshEntityFromSession()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [ready])

  // Entity switch: rebuild location options and clear invalid filters/results.
  // Preserve a valid selected period across entity switches.
  useEffect(() => {
    if (!ready) return
    const prev = prevEntityRef.current
    if (prev === viewerEntityCode) return
    prevEntityRef.current = viewerEntityCode

    let cancelled = false
    async function onEntityChange() {
      setItems([])
      setNextCursor(null)
      setHasMore(false)
      setError(null)

      let shops: ShopBranchOption[] = []
      if (isHoViewer) {
        try {
          shops = await fetchShopBranchOptions()
        } catch {
          shops = []
        }
      } else if (sessionBranchId) {
        shops = locationOptions
      }

      const ho =
        hoBranchId && locationOptions.find((b) => b.id === hoBranchId)
          ? {
              id: hoBranchId,
              code: HO_BRANCH_CODE,
              name:
                locationOptions.find((b) => b.id === hoBranchId)?.name ??
                "Head Office",
            }
          : null

      const hoFresh =
        shops.find((b) => b.code.trim().toUpperCase() === HO_BRANCH_CODE) ?? ho

      const scoped = filterBranchesForEntityScope(
        viewerEntityCode,
        shops,
        hoFresh
      )
      const shopIds = new Set(scoped.map((b) => b.id))
      const normalized = normalizeFiltersForEntity(
        viewerEntityCode,
        {
          shopBranchId: filters.shopBranchId,
          docKind: filters.docKind,
        },
        {
          hoBranchId: hoFresh?.id ?? hoBranchId,
          shopOptionIds: shopIds,
        }
      )

      if (cancelled) return
      setLocationOptions(scoped)
      if (hoFresh?.id) setHoBranchId(hoFresh.id)
      setFilters((prevFilters) => ({
        ...prevFilters,
        shopBranchId: normalized.shopBranchId,
        docKind: normalized.docKind,
        periodMonth: resolveStockDocumentPeriodKey(prevFilters.periodMonth),
      }))
    }

    void onEntityChange()
    return () => {
      cancelled = true
    }
    // Intentionally keyed on entity; other deps read at switch time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerEntityCode, ready])

  useEffect(() => {
    if (!canQueryList) return
    if (viewerEntityCode === "AD" && !listBranchId) return
    const timer = window.setTimeout(() => {
      void loadList({ branch: listBranchId, filterState: filters })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [canQueryList, listBranchId, filters, loadList, viewerEntityCode])

  const handleLoadMore = () => {
    if (!canQueryList || !nextCursor || loadingMore) return
    if (viewerEntityCode === "AD" && !listBranchId) return
    void loadList({
      branch: listBranchId,
      cursor: nextCursor,
      append: true,
      filterState: filters,
    })
  }

  const handleSearch = () => {
    if (!canQueryList) return
    if (viewerEntityCode === "AD" && !listBranchId) return
    void loadList({ branch: listBranchId, filterState: filters })
  }

  const handleClear = () => {
    const cleared = clearStockDocumentListFilters({
      entityCode: viewerEntityCode,
      hoBranchId,
      sessionShopBranchId: sessionBranchId,
      isHoViewer,
    })
    setFilters(cleared)
  }

  const endNeedsShop =
    requiresSpecificShopForEnd(viewerEntityCode) && !filters.shopBranchId.trim()
  const openCreateEndDisabledReason = endNeedsShop
    ? "Select a Shop before opening END"
    : null

  const createBranchId =
    viewerEntityCode === "AD"
      ? hoBranchId
      : isHoViewer
        ? filters.shopBranchId.trim() || null
        : sessionBranchId

  const createCntDisabledReason =
    viewerEntityCode === "AS" && isHoViewer && !filters.shopBranchId.trim()
      ? "Select a Shop before creating CNT"
      : !createBranchId
        ? "Location/Shop is required to create CNT"
        : null

  const createCntHref =
    createCntDisabledReason || !createBranchId
      ? null
      : `/shop/stock-documents/new?type=ADJUSTMENT&branchId=${encodeURIComponent(createBranchId)}&periodKey=${encodeURIComponent(resolveStockDocumentPeriodKey(filters.periodMonth))}`

  const handleOpenCreateEnd = async () => {
    if (openEndBusy || endNeedsShop) return
    const periodMonth = resolveStockDocumentPeriodKey(filters.periodMonth)
    const branchId =
      viewerEntityCode === "AD"
        ? hoBranchId
        : filters.shopBranchId.trim() || listBranchId
    if (!branchId) return

    setOpenEndBusy(true)
    setError(null)
    try {
      const result = await getOrCreateEndDocument({
        legalEntityCode: viewerEntityCode,
        branchId,
        periodMonth,
      })
      router.push(`/shop/stock-documents/end/${result.id}`)
    } catch (err: unknown) {
      setError(toStockDocumentUiError(err).message)
      setOpenEndBusy(false)
    }
  }

  const showCreateActions =
    ready && !isHoViewer && viewerEntityCode === "AS"
  const showOpenCreateEnd = ready && canOpenEnd
  const showCreateCnt = ready

  return (
    <MasterPageShell
      title="Stock Document"
      documentEntityCode={viewerEntityCode}
      description={getStockDocumentWorkflowContextLabel(viewerEntityCode)}
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
        shopOptions={locationOptions}
        shopFilterDisabled={!isHoViewer || locationMode === "ho_location"}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        onFilterChange={(patch) => {
          setFilters((prev) => {
            const next = { ...prev, ...patch }
            if (viewerEntityCode === "AD" && hoBranchId) {
              next.shopBranchId = hoBranchId
            }
            if (patch.periodMonth != null) {
              next.periodMonth = resolveStockDocumentPeriodKey(patch.periodMonth)
            }
            return next
          })
        }}
        onSearch={handleSearch}
        onClear={handleClear}
        onLoadMore={handleLoadMore}
        viewerEntityCode={viewerEntityCode}
        showOpenCreateEnd={showOpenCreateEnd}
        openCreateEndBusy={openEndBusy}
        onOpenCreateEnd={() => void handleOpenCreateEnd()}
        openCreateEndDisabledReason={openCreateEndDisabledReason}
        createCntHref={showCreateCnt ? createCntHref : null}
        createCntDisabledReason={showCreateCnt ? createCntDisabledReason : null}
      />
    </MasterPageShell>
  )
}
