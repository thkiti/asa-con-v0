"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DocumentTraceListTable } from "@/components/finance/DocumentTraceListTable"
import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import { DocumentTraceMoreFilter, type DocumentTraceMoreFilterHandle } from "@/components/finance/DocumentTraceMoreFilter"
import {
  formatTraceNodeDate,
  formatTraceNodeStatus,
} from "@/lib/finance-ui/document-trace-node-display"
import { fetchDocumentTrace, fetchDocumentTraceList } from "@/lib/finance-ui/document-trace"
import {
  buildDocumentTraceReturnPath,
  buildDocumentTraceSearchParams,
  clearDocumentTraceFilters,
  parseDocumentTraceFiltersFromSearchParams,
} from "@/lib/finance-ui/document-trace-filters"
import { useInquiryMoreFilterOpen } from "@/lib/finance-ui/inquiry-more-filter-state"
import { useAccountingPeriodOptions } from "@/lib/finance-ui/use-accounting-period-options"
import { fetchManualJournalSessionContext } from "@/lib/finance-ui/manual-journal-entry-session"
import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import type { TraceEdge, TraceNode, TraceResult } from "@/lib/finance/audit/document-trace"
import type { DocumentTraceListRow } from "@/lib/finance/audit/document-trace-list"
import {
  areDocumentTraceFiltersEqual,
  buildDocumentTraceListFetchKey,
  canDocumentTraceSearch,
  canListDocumentTraceDocuments,
  createDefaultDocumentTraceFilters,
  getDocumentTraceShopFieldState,
  isDocumentTraceMoreFilterActive,
  listDocumentTraceDocTypeSelectOptions,
  resolveDocumentTraceSearchError,
  showDocumentTraceShopInMoreFilter,
  showDocumentTraceShopOnMainRow,
  type DocumentTraceFilters,
} from "@/lib/finance/audit/document-trace-filters"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { BranchSelect } from "@/components/ui/BranchSelect"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import {
  themeEmptyState,
  themeInlineError,
  themeLinkMuted,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"

export type DocumentTraceViewMode = "list" | "trace"

function TraceEdgeDivider({ edge }: { edge: TraceEdge }) {
  return (
    <div
      className="flex flex-col items-center gap-1 py-2 text-xs text-zinc-500"
      data-testid="document-trace-edge"
    >
      <span aria-hidden="true">↓</span>
      <span className="font-mono uppercase tracking-wide">{edge.label}</span>
      <span className="text-zinc-400">{edge.reason}</span>
    </div>
  )
}

function TraceNodeCard({ node }: { node: TraceNode }) {
  const dateLabel = formatTraceNodeDate(node.date)
  const statusLabel = formatTraceNodeStatus(node.status)
  const description = node.description?.trim() ?? null

  const documentNo = node.href ? (
    <Link
      href={node.href}
      className={`font-mono font-semibold ${themeLinkMuted}`}
      data-testid="document-trace-node-link"
    >
      {node.documentNo}
    </Link>
  ) : (
    <span className="font-mono font-semibold text-zinc-900">{node.documentNo}</span>
  )

  return (
    <article
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      data-testid="document-trace-node"
      data-node-type={node.type}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{node.label}</p>
      <p className="mt-1 text-sm text-zinc-900" data-testid="document-trace-node-summary">
        {documentNo}
        <span aria-hidden="true"> • </span>
        {statusLabel}
        {dateLabel ? (
          <>
            <span aria-hidden="true"> • </span>
            {dateLabel}
          </>
        ) : null}
        {description ? (
          <>
            <span aria-hidden="true"> • </span>
            {description}
          </>
        ) : null}
      </p>
    </article>
  )
}

function TraceTimeline({ result }: { result: TraceResult }) {
  if (result.nodes.length === 0) {
    return (
      <p className={themeEmptyState} data-testid="document-trace-empty">
        No trace results.
      </p>
    )
  }

  const edgeByFrom = new Map<string, TraceEdge>()
  for (const edge of result.edges) {
    if (!edgeByFrom.has(edge.from)) {
      edgeByFrom.set(edge.from, edge)
    }
  }

  return (
    <div className="space-y-0" data-testid="document-trace-timeline">
      {result.nodes.map((node, index) => {
        const edge = edgeByFrom.get(node.id)
        return (
          <div key={node.id}>
            <TraceNodeCard node={node} />
            {edge && index < result.nodes.length - 1 ? <TraceEdgeDivider edge={edge} /> : null}
          </div>
        )
      })}
    </div>
  )
}

function TraceWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null

  return (
    <aside
      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
      data-testid="document-trace-warnings"
    >
      <h2 className="text-sm font-semibold text-amber-900">Warnings</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </aside>
  )
}

export function DocumentTracePage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { periods, loading: periodsLoading } = useAccountingPeriodOptions()

  const [legalEntityCode, setLegalEntityCode] = useState<DocumentEntityCode>("AS")
  const [filters, setFilters] = useState<DocumentTraceFilters>(() =>
    createDefaultDocumentTraceFilters("AS")
  )
  const [branches, setBranches] = useState<PosSettlementBranchOption[]>([])
  const [listRows, setListRows] = useState<DocumentTraceListRow[]>([])
  const [listWarnings, setListWarnings] = useState<string[]>([])
  const [listTotalCount, setListTotalCount] = useState<number | null>(null)
  const [listHasMore, setListHasMore] = useState(false)
  const [listNextOffset, setListNextOffset] = useState<number | null>(null)
  const [listLoadingMore, setListLoadingMore] = useState(false)
  const [result, setResult] = useState<TraceResult | null>(null)
  const [selectedTraceQuery, setSelectedTraceQuery] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(false)
  const [traceLoading, setTraceLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listLoaded, setListLoaded] = useState(false)
  const [viewMode, setViewMode] = useState<DocumentTraceViewMode>("list")
  const [initialized, setInitialized] = useState(false)
  const autoSearchDoneRef = useRef(false)
  const lastFetchedListKeyRef = useRef<string | null>(null)
  const listScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const savedListScrollTopRef = useRef(0)
  const moreFilterRef = useRef<DocumentTraceMoreFilterHandle>(null)

  const appliedFilterQuery = useMemo(
    () => buildDocumentTraceSearchParams(filters).toString(),
    [filters]
  )
  const { isMoreFilterOpen, setIsMoreFilterOpen, closeMoreFilter } =
    useInquiryMoreFilterOpen(appliedFilterQuery)

  const listFetchKey = useMemo(() => buildDocumentTraceListFetchKey(filters), [filters])
  const docTypeOptions = useMemo(
    () => listDocumentTraceDocTypeSelectOptions(legalEntityCode),
    [legalEntityCode]
  )
  const shopField = useMemo(
    () => getDocumentTraceShopFieldState(legalEntityCode),
    [legalEntityCode]
  )
  const showShopOnMainRow = useMemo(
    () => showDocumentTraceShopOnMainRow(legalEntityCode),
    [legalEntityCode]
  )
  const showShopInMoreFilter = useMemo(
    () => showDocumentTraceShopInMoreFilter(legalEntityCode, filters.docType),
    [legalEntityCode, filters.docType]
  )
  const moreFilterActive = useMemo(() => isDocumentTraceMoreFilterActive(filters), [filters])
  const searchEnabled = useMemo(() => canDocumentTraceSearch(filters), [filters])

  useEffect(() => {
    void fetchManualJournalSessionContext().then((session) => {
      if (!session) return
      setLegalEntityCode(session.documentEntityCode)
      setFilters((current) => ({
        ...current,
        legalEntityCode: session.documentEntityCode,
        branchCode:
          current.branchCode ||
          (session.documentEntityCode === "AS" && session.branchCode
            ? session.branchCode
            : ""),
      }))
    })
  }, [])

  useEffect(() => {
    if (shopField.mode !== "select") return
    if (!showShopOnMainRow && !showShopInMoreFilter) return

    void fetchPosSettlementBranches()
      .then((response) => setBranches(response.items))
      .catch(() => setBranches([]))
  }, [shopField.mode, showShopInMoreFilter, showShopOnMainRow])

  useEffect(() => {
    if (!legalEntityCode) return

    const parsed = parseDocumentTraceFiltersFromSearchParams(searchParams, legalEntityCode)
    setFilters((current) =>
      areDocumentTraceFiltersEqual(current, parsed) ? current : parsed
    )
    setInitialized(true)
  }, [legalEntityCode, searchParams])

  const syncUrl = useCallback(
    (nextFilters: DocumentTraceFilters, query?: string | null) => {
      const params = buildDocumentTraceSearchParams(nextFilters, query)
      const queryString = params.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    },
    [pathname, router]
  )

  const runTrace = useCallback(
    async (traceQuery: string, nextFilters: DocumentTraceFilters) => {
      const trimmed = traceQuery.trim()
      if (!trimmed) return

      setViewMode("trace")
      setTraceLoading(true)
      setError(null)
      setSelectedTraceQuery(trimmed)
      syncUrl(nextFilters, trimmed)

      try {
        const trace = await fetchDocumentTrace(trimmed)
        setResult(trace)
      } catch (err) {
        setResult(null)
        setError(err instanceof Error ? err.message : "Request failed")
      } finally {
        setTraceLoading(false)
      }
    },
    [syncUrl]
  )

  const runList = useCallback(
    async (
      nextFilters: DocumentTraceFilters,
      options?: { syncUrl?: boolean; fetchKey?: string | null }
    ) => {
      if (!canListDocumentTraceDocuments(nextFilters)) {
        setListRows([])
        setListWarnings([])
        setListTotalCount(null)
        setListHasMore(false)
        setListNextOffset(null)
        setListLoaded(false)
        setViewMode("list")
        return
      }

      setViewMode("list")
      setListLoading(true)
      setError(null)
      if (options?.syncUrl !== false) {
        syncUrl(nextFilters)
      }

      try {
        const listResult = await fetchDocumentTraceList(nextFilters, { offset: 0 })
        setListRows(listResult.rows)
        setListWarnings(listResult.warnings)
        setListTotalCount(listResult.totalCount)
        setListHasMore(listResult.hasMore)
        setListNextOffset(listResult.nextOffset)
        setListLoaded(true)
        setResult(null)
        setSelectedTraceQuery(null)
        if (options?.fetchKey) {
          lastFetchedListKeyRef.current = options.fetchKey
        }
      } catch (err) {
        setListRows([])
        setListWarnings([])
        setListTotalCount(null)
        setListHasMore(false)
        setListNextOffset(null)
        setListLoaded(false)
        if (options?.fetchKey) {
          lastFetchedListKeyRef.current = null
        }
        setError(err instanceof Error ? err.message : "Request failed")
      } finally {
        setListLoading(false)
      }
    },
    [syncUrl]
  )

  const handleLoadMore = useCallback(async () => {
    if (!listHasMore || listLoadingMore || listLoading) return

    const offset = listNextOffset ?? listRows.length
    setListLoadingMore(true)
    setError(null)

    try {
      const listResult = await fetchDocumentTraceList(filters, { offset })
      setListRows((current) => [...current, ...listResult.rows])
      setListTotalCount(listResult.totalCount)
      setListHasMore(listResult.hasMore)
      setListNextOffset(listResult.nextOffset)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setListLoadingMore(false)
    }
  }, [filters, listHasMore, listLoading, listLoadingMore, listNextOffset, listRows.length])

  const runSearch = useCallback(
    async (nextFilters: DocumentTraceFilters) => {
      closeMoreFilter()
      setIsMoreFilterOpen(false)

      const listKey = buildDocumentTraceListFetchKey(nextFilters)
      if (listKey) {
        await runList(nextFilters, { syncUrl: true, fetchKey: listKey })
        return
      }

      setError(resolveDocumentTraceSearchError(nextFilters))
    },
    [closeMoreFilter, runList, setIsMoreFilterOpen]
  )

  useEffect(() => {
    if (!initialized || autoSearchDoneRef.current) return

    const legacyQuery = searchParams.get("query")?.trim()
    const hasStructuredParams =
      Boolean(searchParams.get("docType")?.trim()) ||
      Boolean(searchParams.get("period")?.trim()) ||
      Boolean(searchParams.get("branch")?.trim()) ||
      Boolean(searchParams.get("dateFrom")?.trim()) ||
      Boolean(searchParams.get("dateTo")?.trim()) ||
      Boolean(searchParams.get("from")?.trim()) ||
      Boolean(searchParams.get("to")?.trim())

    if (!legacyQuery && !hasStructuredParams) {
      autoSearchDoneRef.current = true
      return
    }

    const parsed = parseDocumentTraceFiltersFromSearchParams(searchParams, legalEntityCode)
    autoSearchDoneRef.current = true

    if (legacyQuery) {
      void runTrace(legacyQuery, parsed)
      return
    }

    const listKey = buildDocumentTraceListFetchKey(parsed)
    if (listKey) {
      lastFetchedListKeyRef.current = listKey
      void runList(parsed, { syncUrl: false, fetchKey: listKey })
    }
  }, [initialized, legalEntityCode, runList, runTrace, searchParams])

  useEffect(() => {
    if (!initialized || !listFetchKey) return
    if (listFetchKey === lastFetchedListKeyRef.current) return

    const fetchKey = listFetchKey
    const handle = window.setTimeout(() => {
      if (fetchKey === lastFetchedListKeyRef.current) return
      lastFetchedListKeyRef.current = fetchKey
      void runList(filters, { syncUrl: false, fetchKey })
    }, 300)

    return () => window.clearTimeout(handle)
  }, [filters, initialized, listFetchKey, runList])

  const updateFilters = useCallback((patch: Partial<DocumentTraceFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch }
      if (patch.period !== undefined && patch.period !== current.period) {
        next.dateFrom = ""
        next.dateTo = ""
      }
      return next
    })
    setError(null)
  }, [])

  const handleSearch = useCallback(() => {
    lastFetchedListKeyRef.current = null
    const datePatch = moreFilterRef.current?.commitDateRange() ?? {}
    const nextFilters = { ...filters, ...datePatch }
    setFilters(nextFilters)
    void runSearch(nextFilters)
  }, [filters, runSearch])

  const handleClear = useCallback(() => {
    const cleared = clearDocumentTraceFilters(legalEntityCode)
    setFilters(cleared)
    setListRows([])
    setListWarnings([])
    setListTotalCount(null)
    setListHasMore(false)
    setListNextOffset(null)
    setListLoadingMore(false)
    setResult(null)
    setSelectedTraceQuery(null)
    setError(null)
    setListLoaded(false)
    setViewMode("list")
    autoSearchDoneRef.current = false
    lastFetchedListKeyRef.current = null
    closeMoreFilter()
    setIsMoreFilterOpen(false)
    router.replace(pathname, { scroll: false })
  }, [closeMoreFilter, legalEntityCode, pathname, router, setIsMoreFilterOpen])

  const handleBackToList = useCallback(() => {
    setViewMode("list")
    requestAnimationFrame(() => {
      if (listScrollContainerRef.current) {
        listScrollContainerRef.current.scrollTop = savedListScrollTopRef.current
      }
    })
  }, [])

  const handleTraceRow = useCallback(
    (row: DocumentTraceListRow) => {
      if (listScrollContainerRef.current) {
        savedListScrollTopRef.current = listScrollContainerRef.current.scrollTop
      }
      void runTrace(row.traceQuery, filters)
    },
    [filters, runTrace]
  )

  const loading = listLoading || traceLoading

  return (
    <div className="space-y-6" data-testid="document-trace-page">
      <p className="sr-only" data-testid="document-trace-view-mode">
        {viewMode}
      </p>
      <div className="finance-filter-row">
        {showShopOnMainRow ? (
          <div className="finance-filter-field">
            <BranchSelect
              label="Shop"
              labelClassName="finance-filter-label"
              value={filters.branchCode}
              onChange={(branchCode) => updateFilters({ branchCode })}
              options={branches}
              valueKey="code"
              emptyOption={{ label: "All shops" }}
              selectClassName="finance-filter-control finance-filter-select"
              formatOptionLabel={formatPosSettlementBranchLabel}
              data-testid="document-trace-main-branch-select"
            />
          </div>
        ) : null}

        <div className="finance-filter-field">
          <label htmlFor="document-trace-doc-type" className="finance-filter-label">
            Doc Type
          </label>
          <select
            id="document-trace-doc-type"
            value={filters.docType}
            onChange={(event) =>
              updateFilters({
                docType: event.target.value as DocumentTraceFilters["docType"],
              })
            }
            className="finance-filter-control finance-filter-select"
            data-testid="document-trace-doc-type-select"
          >
            <option value="">Select type</option>
            {docTypeOptions.map((item) =>
              item.kind === "group" ? (
                <option key={item.label} value="" disabled>
                  {item.label}
                </option>
              ) : (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="finance-filter-field finance-filter-field--period-key">
          <label htmlFor="document-trace-period" className="finance-filter-label">
            Period
          </label>
          <AccountingPeriodSelect
            id="document-trace-period"
            periods={periods}
            value={filters.period.trim() || null}
            onChange={(value) => updateFilters({ period: value })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchEnabled) {
                event.preventDefault()
                handleSearch()
              }
            }}
            loading={periodsLoading}
            showEmptyHint={false}
            className="finance-filter-control finance-filter-control--mono"
            data-testid="document-trace-period-input"
          />
        </div>

        <DocumentTraceMoreFilter
          ref={moreFilterRef}
          filters={filters}
          onChange={updateFilters}
          isOpen={isMoreFilterOpen}
          onOpenChange={setIsMoreFilterOpen}
          isActive={moreFilterActive}
          showShopField={showShopInMoreFilter}
          shopMode={shopField.mode}
          shopLabel={shopField.label}
          branches={branches}
        />

        <div className="finance-filter-field">
          <span className="finance-filter-label" aria-hidden="true">
            &nbsp;
          </span>
          <InquiryFilterActions
            className="flex flex-wrap items-center gap-2"
            onPrimary={handleSearch}
            onClear={handleClear}
            loading={loading}
            loadingPrimaryLabel="Searching…"
            primaryDisabled={!searchEnabled}
            primaryTestId="document-trace-search-button"
            clearTestId="document-trace-clear-button"
          />
        </div>
      </div>

      {error ? (
        <p className={themeInlineError} data-testid="document-trace-error">
          {error}
        </p>
      ) : null}

      {viewMode === "list" && (listLoaded || listLoading) ? (
        <div data-testid="document-trace-view-list">
          <DocumentTraceListTable
            rows={listRows}
            selectedTraceQuery={selectedTraceQuery}
            onTrace={handleTraceRow}
            loading={listLoading}
            loadingMore={listLoadingMore}
            totalCount={listTotalCount}
            hasMore={listHasMore}
            onLoadMore={handleLoadMore}
            scrollContainerRef={listScrollContainerRef}
          />
          <TraceWarnings warnings={listWarnings} />
        </div>
      ) : null}

      {viewMode === "trace" ? (
        <section className="space-y-4" data-testid="document-trace-view-trace">
          {listLoaded ? (
            <button
              type="button"
              onClick={handleBackToList}
              className={`text-sm ${themeLinkMuted}`}
              data-testid="document-trace-back-to-list"
            >
              ← Back to Results
            </button>
          ) : null}
          {traceLoading && !result ? (
            <p className={`text-sm ${themeTextSecondary}`} data-testid="document-trace-trace-loading">
              Tracing document…
            </p>
          ) : null}
          {result ? (
            <div data-testid="document-trace-result">
              <h2 className="text-sm font-semibold text-zinc-900">Trace</h2>
              <TraceTimeline result={result} />
              <TraceWarnings warnings={result.warnings} />
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="sr-only" data-testid="document-trace-return-path">
        {buildDocumentTraceReturnPath(filters)}
      </p>
    </div>
  )
}
