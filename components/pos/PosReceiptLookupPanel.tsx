"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { ReceiptLookupResult } from "@/components/pos/ReceiptLookupResult"
import {
  buildReceiptLookupNo,
  normalizeReceiptLookupRunningNo,
  RECEIPT_LOOKUP_MONTH_OPTIONS,
  RECEIPT_LOOKUP_YEAR_OPTIONS,
} from "@/lib/pos-ui/build-receipt-lookup-no"
import { fetchReceiptLookup } from "@/lib/pos-ui/receipt-lookup-client"
import type { ReceiptLookupRow } from "@/lib/pos/receipt-lookup-types"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import type { PosTerminalSession } from "@/lib/pos-ui/types"

export type PosReceiptLookupPanelHandle = {
  search: () => void
}

type PosReceiptLookupPanelProps = {
  session: PosTerminalSession
  runningNo: string
  onRunningNoChange: (value: string) => void
  focusRequestId?: number
  onBack: () => void
}

const PANEL_SELECT_CLASS =
  "mt-0.5 w-full min-w-0 rounded border border-white/40 bg-white/95 px-1 py-1 text-center text-xs font-bold tabular-nums text-zinc-900"

const PANEL_INPUT_CLASS =
  "mt-0.5 w-full min-w-0 rounded border border-white/40 bg-white/95 px-1 py-1 text-center font-mono text-xs font-bold tabular-nums text-zinc-900"

export const PosReceiptLookupPanel = forwardRef<
  PosReceiptLookupPanelHandle,
  PosReceiptLookupPanelProps
>(function PosReceiptLookupPanel(
  { session, runningNo, onRunningNoChange, focusRequestId = 0, onBack },
  ref
) {
  const nowParts = bangkokCalendarParts(new Date())
  const branchId = session.branchId.trim()
  const branchCode = session.branchCode.trim()
  const runningInputRef = useRef<HTMLInputElement>(null)

  const [year, setYear] = useState(nowParts.y)
  const [month, setMonth] = useState(nowParts.m)
  const [receipt, setReceipt] = useState<ReceiptLookupRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [notFoundRunningNo, setNotFoundRunningNo] = useState<string | null>(null)

  useEffect(() => {
    if (focusRequestId === 0) return
    runningInputRef.current?.focus()
    runningInputRef.current?.select()
  }, [focusRequestId])

  const runSearch = useCallback(async () => {
    if (!branchId) return

    const normalizedRunning = normalizeReceiptLookupRunningNo(runningNo)
    const receiptNo = buildReceiptLookupNo(branchCode, year, month, normalizedRunning)
    if (!receiptNo) {
      setReceipt(null)
      setNotFoundRunningNo(normalizedRunning || null)
      setSearched(true)
      return
    }

    setLoading(true)
    setNotFoundRunningNo(null)
    const response = await fetchReceiptLookup({ branchId, receiptNo })
    if (!response.ok) {
      setReceipt(null)
      setNotFoundRunningNo(normalizedRunning)
      setLoading(false)
      setSearched(true)
      return
    }

    const found = response.result.receipts[0] ?? null
    setReceipt(found)
    setNotFoundRunningNo(found ? null : normalizedRunning)
    setLoading(false)
    setSearched(true)
  }, [branchId, branchCode, year, month, runningNo])

  useImperativeHandle(ref, () => ({ search: () => void runSearch() }), [runSearch])

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-testid="pos-receipt-lookup-panel"
    >
      <div className="shrink-0 border-b border-white/30 p-2">
        <button
          type="button"
          onClick={onBack}
          data-testid="pos-receipt-lookup-back"
          className="mb-2 cursor-pointer text-xs font-semibold text-white/90 underline-offset-2 hover:text-white hover:underline"
        >
          BACK
        </button>

        <div
          className="flex items-end gap-1.5"
          data-testid="receipt-lookup-filters"
        >
          <label className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-white/85">
            Year
            <select
              className={PANEL_SELECT_CLASS}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
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
          <label className="w-[3.25rem] shrink-0 text-[10px] font-semibold uppercase tracking-wide text-white/85">
            Month
            <select
              className={PANEL_SELECT_CLASS}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
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
          <label className="min-w-0 flex-[1.1] text-[10px] font-semibold uppercase tracking-wide text-white/85">
            Receipt No
            <input
              ref={runningInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className={PANEL_INPUT_CLASS}
              value={runningNo}
              onChange={(e) =>
                onRunningNoChange(normalizeReceiptLookupRunningNo(e.target.value))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void runSearch()
                }
              }}
              placeholder="0113"
              maxLength={4}
              disabled={loading}
              data-testid="receipt-lookup-running-no"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={loading || runningNo.trim().length === 0}
          data-testid="receipt-lookup-search"
          className="mt-2 w-full rounded border-2 border-white bg-white py-2 text-sm font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Searching…" : "SEARCH"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {loading ? (
          <p
            className="text-center text-sm text-white/85"
            data-testid="receipt-lookup-loading"
          >
            Searching…
          </p>
        ) : searched ? (
          notFoundRunningNo ? (
            <p
              className="text-center text-sm font-medium text-white/90"
              data-testid="receipt-lookup-empty"
            >
              Receipt not found: {notFoundRunningNo}
            </p>
          ) : receipt ? (
            <ReceiptLookupResult
              variant="panel"
              receipt={receipt}
              branchId={branchId}
            />
          ) : null
        ) : (
          <p className="text-center text-xs text-white/75">
            Enter year, month, and receipt number to search.
          </p>
        )}
      </div>
    </div>
  )
})
