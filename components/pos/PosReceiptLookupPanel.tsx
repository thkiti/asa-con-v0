"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { PosReceiptPrintPreview } from "@/components/pos/PosReceiptPrintPreview"
import { PosRefundPrintPreview } from "@/components/pos/PosRefundPrintPreview"
import { PosCollectorPrintPreview } from "@/components/pos/PosCollectorPrintPreview"
import { PosReadZPrintPreview } from "@/components/pos/PosReadZPrintPreview"
import {
  buildReceiptLookupNo,
  normalizeReceiptLookupRunningNo,
  parseReceiptYearMonthFromNo,
  runningNumbersFromReceiptLookupRows,
  RECEIPT_LOOKUP_MONTH_OPTIONS,
  RECEIPT_LOOKUP_YEAR_OPTIONS,
} from "@/lib/pos-ui/build-receipt-lookup-no"
import {
  buildRefundLookupNo,
  normalizeRefundLookupRunningNo,
} from "@/lib/pos-ui/build-refund-lookup-no"
import {
  buildCollectorLookupNo,
  normalizeCollectorLookupRunningNo,
} from "@/lib/pos-ui/build-collector-lookup-no"
import { buildReceiptLookupSlipContext } from "@/lib/pos-ui/build-receipt-lookup-slip-context"
import { buildRefundLookupSlipContext } from "@/lib/pos-ui/build-refund-lookup-slip-context"
import {
  fetchReceiptLookup,
  openReceiptArchivePdf,
  printReceiptArchivePdf,
} from "@/lib/pos-ui/receipt-lookup-client"
import { fetchRefundLookup } from "@/lib/pos-ui/refund-lookup-client"
import {
  fetchCollectorLookup,
  openCollectorArchivePdf,
  printCollectorArchivePdf,
} from "@/lib/pos-ui/collector-lookup-client"
import { fetchDocumentLookupRunningNumbers } from "@/lib/pos-ui/document-lookup-running-client"
import { fetchPosReadZReviewReport } from "@/lib/pos-ui/read-report-client"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ReceiptLookupRow } from "@/lib/pos/receipt-lookup-types"
import type { RefundLookupRow } from "@/lib/pos/refund-lookup-types"
import type { CollectorLookupRow } from "@/lib/pos/collector-lookup-types"
import {
  documentLookupUsesReadZLookup,
  documentLookupUsesReceiptDateFilter,
  isPosDocumentLookupDocTypeAvailable,
  POS_DOCUMENT_LOOKUP_DOC_TYPES,
  type PosDocumentLookupDocType,
} from "@/lib/pos-ui/document-lookup-doc-types"
import {
  READ_Z_LOOKUP_EMPTY_MESSAGE,
  readZLookupDailyHasTicket,
  type ReadZLookupMode,
} from "@/lib/pos-ui/read-z-lookup-display"
import { bangkokCalendarParts, bangkokDateKey } from "@/lib/reporting/bangkok-calendar"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"
import type { PosTerminalSession } from "@/lib/pos-ui/types"
import {
  posDocumentLookupButton,
  posDocumentLookupClose,
  posDocumentLookupInput,
  posDocumentLookupLabel,
  posDocumentLookupMessage,
  posDocumentLookupMuted,
  posDocumentLookupPanel,
  posDocumentLookupPdfPrimary,
  posDocumentLookupPdfSecondary,
  posDocumentLookupSelect,
  posDocumentLookupTitle,
} from "@/lib/pos-ui/pos-document-lookup-classes"

export type PosReceiptLookupPanelHandle = {
  search: () => void
}

type PosReceiptLookupPanelProps = {
  session: PosTerminalSession
  receiptThermalLayout: ResolvedThermalLayout
  refundThermalLayout: ResolvedThermalLayout
  collectorThermalLayout: ResolvedThermalLayout
  readZThermalLayout: ResolvedThermalLayout
  /** Optional — defaults to Receipt. */
  initialDocType?: PosDocumentLookupDocType
  runningNo: string
  onRunningNoChange: (value: string) => void
  focusRequestId?: number
  onKeypadRunningInputEnabledChange?: (enabled: boolean) => void
  onClose: () => void
}

function ReceiptLookupSlipPreview({
  receipt,
  receiptThermalLayout,
}: {
  receipt: ReceiptLookupRow
  receiptThermalLayout: ResolvedThermalLayout
}) {
  const slipContext = useMemo(
    () => buildReceiptLookupSlipContext(receipt, receiptThermalLayout),
    [receipt, receiptThermalLayout]
  )

  return (
    <PosReceiptPrintPreview
      receipt={slipContext}
      copyWatermark
      testId="receipt-lookup-print-preview"
      compact
    />
  )
}

function RefundLookupSlipPreview({
  refund,
  receiptThermalLayout,
  refundThermalLayout,
}: {
  refund: RefundLookupRow
  receiptThermalLayout: ResolvedThermalLayout
  refundThermalLayout: ResolvedThermalLayout
}) {
  const slipContext = useMemo(
    () => buildRefundLookupSlipContext(refund, receiptThermalLayout, refundThermalLayout),
    [refund, receiptThermalLayout, refundThermalLayout]
  )

  return (
    <PosRefundPrintPreview
      receipt={slipContext}
      copyWatermark
      testId="refund-lookup-print-preview"
      compact
    />
  )
}

function CollectorLookupSlipPreview({
  collector,
  collectorThermalLayout,
}: {
  collector: CollectorLookupRow
  collectorThermalLayout: ResolvedThermalLayout
}) {
  return (
    <PosCollectorPrintPreview
      report={collector.report}
      layout={collectorThermalLayout}
      copyWatermark
      testId="collector-lookup-print-preview"
      compact
    />
  )
}

function PreviewPlaceholder({ children }: { children: ReactNode }) {
  return (
    <p
      className={`flex flex-1 items-center justify-center px-2 text-center ${posDocumentLookupMuted}`}
    >
      {children}
    </p>
  )
}

export const PosReceiptLookupPanel = forwardRef<
  PosReceiptLookupPanelHandle,
  PosReceiptLookupPanelProps
>(function PosReceiptLookupPanel(
  {
    session,
    receiptThermalLayout,
    refundThermalLayout,
    collectorThermalLayout,
    readZThermalLayout,
    initialDocType = "receipt",
    runningNo,
    onRunningNoChange,
    focusRequestId: _focusRequestId = 0,
    onKeypadRunningInputEnabledChange,
    onClose,
  },
  ref
) {
  const nowParts = bangkokCalendarParts(new Date())
  const branchId = session.branchId.trim()
  const branchCode = session.branchCode.trim()
  const searchControlsRef = useRef<HTMLDivElement>(null)

  const [docType, setDocType] = useState<PosDocumentLookupDocType>(initialDocType)
  const lookupEnabled = isPosDocumentLookupDocTypeAvailable(docType, session.role)
  const usesReceiptDate = documentLookupUsesReceiptDateFilter(docType)
  const isReadZLookup = documentLookupUsesReadZLookup(docType)
  const isReceiptLookup = docType === "receipt"
  const isRefundLookup = docType === "refund"
  const isCollectorLookup = docType === "collector"
  const usesYearMonthRunningLookup = isRefundLookup || isCollectorLookup

  const [year, setYear] = useState(nowParts.y)
  const [month, setMonth] = useState(nowParts.m)
  const [receiptDate, setReceiptDate] = useState(() => bangkokDateKey(new Date()))
  const [readZLookupMode, setReadZLookupMode] = useState<ReadZLookupMode>("daily")
  const [readZReport, setReadZReport] = useState<ReadReportPayload | null>(null)
  const [readZLoading, setReadZLoading] = useState(false)
  const readZLookupRequestIdRef = useRef(0)
  const [runningOptions, setRunningOptions] = useState<string[]>([])
  const [runningOptionsLoading, setRunningOptionsLoading] = useState(false)

  const [receipt, setReceipt] = useState<ReceiptLookupRow | null>(null)
  const [refund, setRefund] = useState<RefundLookupRow | null>(null)
  const [collector, setCollector] = useState<CollectorLookupRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateLookupLoading, setDateLookupLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null)
  const [dateLookupMessage, setDateLookupMessage] = useState<string | null>(null)

  const clearResults = useCallback(() => {
    setReceipt(null)
    setRefund(null)
    setCollector(null)
    setReadZReport(null)
    setNotFoundMessage(null)
  }, [])

  const loadReadZReview = useCallback(
    async (scope: "daily" | "cumulative-to-date", bangkokDate: string) => {
      const requestId = ++readZLookupRequestIdRef.current
      setReadZLoading(true)
      setNotFoundMessage(null)
      clearResults()
      setSearched(true)
      try {
        const result = await fetchPosReadZReviewReport({
          scope,
          bangkokDate,
        })
        if (requestId !== readZLookupRequestIdRef.current) return
        if (!result.ok) {
          setNotFoundMessage(result.error)
          return
        }
        setReadZReport(result.report)
      } finally {
        if (requestId === readZLookupRequestIdRef.current) {
          setReadZLoading(false)
        }
      }
    },
    [clearResults]
  )

  const loadReadZCumulative = useCallback(() => {
    if (!receiptDate.trim()) return
    setReadZLookupMode("cumulative")
    void loadReadZReview("cumulative-to-date", receiptDate)
  }, [loadReadZReview, receiptDate])

  useEffect(() => {
    onKeypadRunningInputEnabledChange?.(false)
  }, [lookupEnabled, onKeypadRunningInputEnabledChange])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [loading, onClose])

  useEffect(() => {
    if (!usesYearMonthRunningLookup || !branchId) {
      return
    }

    let cancelled = false
    setRunningOptionsLoading(true)

    void fetchDocumentLookupRunningNumbers({
      branchId,
      docType,
      year,
      month,
    }).then((response) => {
      if (cancelled) return
      setRunningOptions(response.ok ? response.runningNumbers : [])
      setRunningOptionsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [usesYearMonthRunningLookup, branchId, docType, year, month])

  const handleDocTypeChange = useCallback(
    (next: PosDocumentLookupDocType) => {
      setDocType(next)
      clearResults()
      onRunningNoChange("")
      setRunningOptions([])
      setSearched(false)
      setLoading(false)
      setDateLookupLoading(false)
      setDateLookupMessage(null)
      setReadZLoading(false)
      setReadZLookupMode("daily")
    },
    [clearResults, onRunningNoChange]
  )

  const handleYearChange = useCallback(
    (nextYear: number) => {
      setYear(nextYear)
      clearResults()
      onRunningNoChange("")
      setSearched(false)
    },
    [clearResults, onRunningNoChange]
  )

  const handleMonthChange = useCallback(
    (nextMonth: number) => {
      setMonth(nextMonth)
      clearResults()
      onRunningNoChange("")
      setSearched(false)
    },
    [clearResults, onRunningNoChange]
  )

  useEffect(() => {
    if (!isReceiptLookup || !branchId) {
      setDateLookupMessage(null)
      return
    }

    let cancelled = false

    void (async () => {
      if (!receiptDate.trim()) return

      setDateLookupLoading(true)
      setDateLookupMessage(null)
      clearResults()
      setSearched(false)

      const response = await fetchReceiptLookup({
        branchId,
        dateFrom: receiptDate,
        dateTo: receiptDate,
      })

      if (cancelled) return

      if (!response.ok || response.result.receipts.length === 0) {
        setRunningOptions([])
        onRunningNoChange("")
        setDateLookupMessage("No receipt found for selected date.")
        setDateLookupLoading(false)
        return
      }

      const runningNumbers = runningNumbersFromReceiptLookupRows(response.result.receipts)
      setRunningOptions(runningNumbers)
      setDateLookupMessage(null)

      const latest = response.result.receipts[0]
      const ym = parseReceiptYearMonthFromNo(latest.receiptNo)
      if (ym) {
        setYear(ym.year)
        setMonth(ym.month)
      }
      onRunningNoChange(runningNumbers[0] ?? "")
      setDateLookupLoading(false)
    })()

    return () => {
      cancelled = true
      setDateLookupLoading(false)
    }
  }, [isReceiptLookup, branchId, receiptDate, clearResults, onRunningNoChange])

  useEffect(() => {
    if (!isReadZLookup || !lookupEnabled) return
    if (readZLookupMode !== "daily") return
    if (!receiptDate.trim()) return
    void loadReadZReview("daily", receiptDate)
  }, [
    isReadZLookup,
    lookupEnabled,
    readZLookupMode,
    receiptDate,
    loadReadZReview,
  ])

  const handleReceiptDateChange = useCallback(
    (nextDate: string) => {
      setReceiptDate(nextDate)
      if (isReadZLookup) {
        setReadZLookupMode("daily")
        setSearched(false)
      }
    },
    [isReadZLookup]
  )

  const canSearch = useMemo(() => {
    if (!lookupEnabled) return true
    if (loading || dateLookupLoading || readZLoading) return false
    if (isReadZLookup) {
      return receiptDate.trim().length > 0
    }
    if (isReceiptLookup) {
      return runningNo.trim().length > 0
    }
    return runningNo.trim().length > 0
  }, [
    lookupEnabled,
    loading,
    dateLookupLoading,
    readZLoading,
    isReadZLookup,
    receiptDate,
    isReceiptLookup,
    runningNo,
  ])

  const runSearch = useCallback(async () => {
    if (!branchId) return

    if (!lookupEnabled) {
      clearResults()
      setSearched(true)
      return
    }

    setLoading(true)
    setNotFoundMessage(null)
    clearResults()

    if (isReceiptLookup) {
      const normalizedRunning = normalizeReceiptLookupRunningNo(runningNo)
      if (!normalizedRunning) {
        setNotFoundMessage("Select a running number")
        setLoading(false)
        setSearched(true)
        return
      }

      const receiptNo = buildReceiptLookupNo(branchCode, year, month, normalizedRunning)
      if (!receiptNo) {
        setNotFoundMessage(`Receipt not found: ${normalizedRunning}`)
        setLoading(false)
        setSearched(true)
        return
      }

      const response = await fetchReceiptLookup({ branchId, receiptNo })
      if (!response.ok) {
        setNotFoundMessage(`Receipt not found: ${normalizedRunning}`)
        setLoading(false)
        setSearched(true)
        return
      }

      const found = response.result.receipts[0] ?? null
      setReceipt(found)
      setNotFoundMessage(found ? null : `Receipt not found: ${normalizedRunning}`)
    } else if (isRefundLookup) {
      const normalizedRunning = normalizeRefundLookupRunningNo(runningNo)
      const refundNo = buildRefundLookupNo(branchCode, year, month, normalizedRunning)
      if (!refundNo) {
        setNotFoundMessage(
          normalizedRunning ? `Refund not found: ${normalizedRunning}` : "Select a running number"
        )
        setLoading(false)
        setSearched(true)
        return
      }

      const response = await fetchRefundLookup({ branchId, refundNo })
      if (!response.ok) {
        setNotFoundMessage(`Refund not found: ${normalizedRunning}`)
        setLoading(false)
        setSearched(true)
        return
      }

      const found = response.result.refunds[0] ?? null
      setRefund(found)
      setNotFoundMessage(found ? null : `Refund not found: ${normalizedRunning}`)
    } else if (isCollectorLookup) {
      const normalizedRunning = normalizeCollectorLookupRunningNo(runningNo)
      const collectNo = buildCollectorLookupNo(branchCode, year, month, normalizedRunning)
      if (!collectNo) {
        setNotFoundMessage(
          normalizedRunning
            ? `Collector not found: ${normalizedRunning}`
            : "Select a running number"
        )
        setLoading(false)
        setSearched(true)
        return
      }

      const response = await fetchCollectorLookup({ branchId, collectNo })
      if (!response.ok) {
        setNotFoundMessage(`Collector not found: ${normalizedRunning}`)
        setLoading(false)
        setSearched(true)
        return
      }

      const found = response.result.collectors[0] ?? null
      setCollector(found)
      setNotFoundMessage(found ? null : `Collector not found: ${normalizedRunning}`)
    }

    setLoading(false)
    setSearched(true)
  }, [
    branchId,
    branchCode,
    year,
    month,
    runningNo,
    lookupEnabled,
    isReceiptLookup,
    isRefundLookup,
    isCollectorLookup,
    clearResults,
  ])

  useImperativeHandle(
    ref,
    () => ({
      search: () => {
        if (isReadZLookup) {
          loadReadZCumulative()
          return
        }
        void runSearch()
      },
    }),
    [isReadZLookup, loadReadZCumulative, runSearch]
  )

  const activeArchiveStatus = isCollectorLookup
    ? collector?.archiveStatus
    : isRefundLookup
      ? refund?.archiveStatus
      : receipt?.archiveStatus
  const pdfReady =
    activeArchiveStatus === "ready" &&
    Boolean(
      isCollectorLookup ? collector?.pdfUrl : isRefundLookup ? refund?.pdfUrl : receipt?.pdfUrl
    )
  const showLegacyMessage = activeArchiveStatus === "legacy"

  const previewAriaLabel = isReadZLookup
    ? "READ Z preview"
    : isCollectorLookup
      ? "Collector preview"
      : isRefundLookup
        ? "Refund preview"
        : "Receipt preview"

  const readZShowDailyEmpty =
    isReadZLookup &&
    readZLookupMode === "daily" &&
    readZReport !== null &&
    !readZLoading &&
    !readZLookupDailyHasTicket(readZReport)

  const readZShowTicket =
    isReadZLookup &&
    readZReport !== null &&
    !readZLoading &&
    !readZShowDailyEmpty

  const searchButtonLabel =
    loading || readZLoading
      ? isReadZLookup
        ? "Loading…"
        : "Searching…"
      : isReadZLookup
        ? "Cumulative To-Date"
        : "SEARCH"

  return (
    <div
      className={`${posDocumentLookupPanel} absolute inset-0 z-50 flex flex-col`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-document-lookup-title"
      data-testid="pos-receipt-lookup-panel"
    >
      <button
        type="button"
        aria-label="Close document lookup"
        onClick={onClose}
        disabled={loading}
        data-testid="pos-receipt-lookup-close"
        className={`${posDocumentLookupClose} absolute right-2 top-2 z-10`}
      >
        ×
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 pb-2 pt-11">
        <h2
          id="pos-document-lookup-title"
          className={`${posDocumentLookupTitle} shrink-0 text-center text-lg font-bold tracking-wide`}
        >
          Document Lookup
        </h2>

        <div ref={searchControlsRef} className="shrink-0 space-y-1.5">
            <div
              className="grid grid-cols-4 gap-1.5"
              data-testid="receipt-lookup-filters"
            >
              <label className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className={posDocumentLookupLabel}>Doc Type</span>
                <select
                  className={posDocumentLookupSelect}
                  value={docType}
                  onChange={(e) =>
                    handleDocTypeChange(e.target.value as PosDocumentLookupDocType)
                  }
                  disabled={loading}
                  data-testid="document-lookup-doc-type"
                  aria-label="Document type"
                >
                  {POS_DOCUMENT_LOOKUP_DOC_TYPES.map((option) => {
                    const available = isPosDocumentLookupDocTypeAvailable(
                      option.id,
                      session.role
                    )
                    return (
                      <option key={option.id} value={option.id}>
                        {option.label}
                        {!available ? " (Coming soon)" : ""}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className={posDocumentLookupLabel}>Year</span>
                <select
                  className={posDocumentLookupSelect}
                  value={year}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  disabled={loading}
                  data-testid="receipt-lookup-year"
                >
                  {RECEIPT_LOOKUP_YEAR_OPTIONS.map((optionYear) => (
                    <option key={optionYear} value={optionYear}>
                      {optionYear}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className={posDocumentLookupLabel}>Month</span>
                <select
                  className={posDocumentLookupSelect}
                  value={month}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  disabled={loading}
                  data-testid="receipt-lookup-month"
                >
                  {RECEIPT_LOOKUP_MONTH_OPTIONS.map((optionMonth) => (
                    <option key={optionMonth} value={optionMonth}>
                      {String(optionMonth).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className={posDocumentLookupLabel}>Running</span>
                <select
                  className={posDocumentLookupSelect}
                  value={runningNo}
                  onChange={(e) =>
                    onRunningNoChange(
                      isReceiptLookup
                        ? normalizeReceiptLookupRunningNo(e.target.value)
                        : isCollectorLookup
                          ? normalizeCollectorLookupRunningNo(e.target.value)
                          : normalizeRefundLookupRunningNo(e.target.value)
                    )
                  }
                  disabled={
                    loading ||
                    runningOptionsLoading ||
                    dateLookupLoading ||
                    !lookupEnabled
                  }
                  data-testid="document-lookup-running-select"
                  aria-label="Running number"
                >
                  <option value="">
                    {runningOptionsLoading || dateLookupLoading ? "Loading…" : "Select…"}
                  </option>
                  {runningOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div
              className="grid grid-cols-2 items-stretch gap-1.5"
              data-testid="receipt-lookup-search-row"
            >
              {usesReceiptDate ? (
                <input
                  type="date"
                  className={posDocumentLookupInput}
                  value={receiptDate}
                  onChange={(e) => handleReceiptDateChange(e.target.value)}
                  disabled={loading || (isReceiptLookup && dateLookupLoading)}
                  data-testid="receipt-lookup-date"
                  aria-label="Receipt date"
                />
              ) : (
                <div aria-hidden />
              )}
              <button
                type="button"
                onClick={() => {
                  if (isReadZLookup) {
                    loadReadZCumulative()
                    return
                  }
                  void runSearch()
                }}
                disabled={!canSearch}
                data-testid="receipt-lookup-search"
                className={posDocumentLookupButton}
              >
                {searchButtonLabel}
              </button>
            </div>

            {dateLookupMessage ? (
              <p
                className={posDocumentLookupMessage}
                data-testid="receipt-lookup-date-empty-message"
              >
                {dateLookupMessage}
              </p>
            ) : null}
          </div>

          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden"
            data-testid="receipt-lookup-preview-panel"
            data-archive-status={activeArchiveStatus}
            title={
              isCollectorLookup
                ? collector?.archiveError
                : isRefundLookup
                  ? refund?.archiveError
                  : receipt?.archiveError
            }
            aria-label={lookupEnabled ? previewAriaLabel : "Document preview"}
          >
            {!lookupEnabled ? (
              <PreviewPlaceholder>
                <span data-testid="document-lookup-coming-soon">Coming soon</span>
              </PreviewPlaceholder>
            ) : isReadZLookup && readZLoading ? (
              <PreviewPlaceholder>Loading…</PreviewPlaceholder>
            ) : readZShowDailyEmpty ? (
              <PreviewPlaceholder>
                <span data-testid="document-lookup-read-z-empty">
                  {READ_Z_LOOKUP_EMPTY_MESSAGE}
                </span>
              </PreviewPlaceholder>
            ) : readZShowTicket && readZReport ? (
              <div
                className="readZDocumentLookupPreview flex min-h-0 w-full max-w-full flex-1 flex-col items-center py-1"
                data-testid="document-lookup-read-z-preview"
              >
                <div className="readZReportColumn min-h-0 w-full max-w-full flex-1">
                  <div className="readZTicketCard" data-testid="pos-read-z-preview">
                    <PosReadZPrintPreview
                      report={readZReport}
                      layout={readZThermalLayout}
                      copyWatermark
                      compact
                      testId="document-lookup-read-z-print-preview"
                    />
                  </div>
                </div>
              </div>
            ) : loading ? (
              <PreviewPlaceholder>Searching…</PreviewPlaceholder>
            ) : notFoundMessage ? (
              <PreviewPlaceholder>
                <span data-testid="receipt-lookup-empty">{notFoundMessage}</span>
              </PreviewPlaceholder>
            ) : receipt ? (
              <ReceiptLookupSlipPreview
                receipt={receipt}
                receiptThermalLayout={receiptThermalLayout}
              />
            ) : refund ? (
              <RefundLookupSlipPreview
                refund={refund}
                receiptThermalLayout={receiptThermalLayout}
                refundThermalLayout={refundThermalLayout}
              />
            ) : collector ? (
              <CollectorLookupSlipPreview
                collector={collector}
                collectorThermalLayout={collectorThermalLayout}
              />
            ) : (
              <PreviewPlaceholder>
                {searched
                  ? "No document selected."
                  : isReadZLookup || isReceiptLookup
                    ? "Select date and running number, then search."
                    : "Select year, month, and running number to search."}
              </PreviewPlaceholder>
            )}
          </div>

          {(showLegacyMessage || pdfReady) && (receipt || refund || collector) ? (
            <div className="shrink-0 space-y-1.5">
              {showLegacyMessage ? (
                <p
                  className={`text-center ${posDocumentLookupMessage} font-medium leading-snug`}
                  data-testid={
                    isCollectorLookup
                      ? "collector-lookup-legacy-message"
                      : isRefundLookup
                        ? "refund-lookup-legacy-message"
                        : "receipt-lookup-legacy-message"
                  }
                >
                  {isCollectorLookup
                    ? "Legacy collector ticket — PDF archive not available"
                    : isRefundLookup
                      ? "Legacy refund — PDF archive not available"
                      : "Legacy receipt — PDF archive not available"}
                </p>
              ) : null}

              {pdfReady && receipt ? (
                <div className="flex flex-col gap-1.5 sm:flex-row">
                  <button
                    type="button"
                    data-testid="receipt-lookup-view-pdf"
                    onClick={() => openReceiptArchivePdf(receipt.receiptId, branchId)}
                    className={posDocumentLookupPdfPrimary}
                  >
                    View PDF
                  </button>
                  <button
                    type="button"
                    data-testid="receipt-lookup-print-pdf"
                    onClick={() => printReceiptArchivePdf(receipt.receiptId, branchId)}
                    className={posDocumentLookupPdfSecondary}
                  >
                    Print PDF
                  </button>
                </div>
              ) : null}

              {pdfReady && collector ? (
                <div className="flex flex-col gap-1.5 sm:flex-row">
                  <button
                    type="button"
                    data-testid="collector-lookup-view-pdf"
                    onClick={() =>
                      openCollectorArchivePdf(collector.collectorReportId, branchId)
                    }
                    className={posDocumentLookupPdfPrimary}
                  >
                    View PDF
                  </button>
                  <button
                    type="button"
                    data-testid="collector-lookup-print-pdf"
                    onClick={() =>
                      printCollectorArchivePdf(collector.collectorReportId, branchId)
                    }
                    className={posDocumentLookupPdfSecondary}
                  >
                    Print PDF
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
      </div>
    </div>
  )
})
