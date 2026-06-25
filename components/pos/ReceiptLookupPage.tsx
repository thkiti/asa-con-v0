"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ReceiptLookupResult } from "@/components/pos/ReceiptLookupResult"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import {
  buildReceiptLookupNo,
  normalizeReceiptLookupRunningNo,
  RECEIPT_LOOKUP_MONTH_OPTIONS,
  RECEIPT_LOOKUP_YEAR_OPTIONS,
} from "@/lib/pos-ui/build-receipt-lookup-no"
import { fetchReceiptLookup } from "@/lib/pos-ui/receipt-lookup-client"
import type { ReceiptLookupRow } from "@/lib/pos/receipt-lookup-types"
import { pickDefaultShopBranchId } from "@/lib/shop/shop-branch-display"
import { fetchSalesTargetBranches } from "@/lib/shop-ui/sales-targets-client"
import type { SalesTargetBranchOption } from "@/lib/shop/sales-target-types"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"

type ReceiptLookupPageProps = {
  user: SessionUserApi
}

const POS_LOOKUP_SELECT_CLASS =
  "w-full rounded border border-white/40 bg-white/95 px-3 py-2.5 text-center text-base font-bold tabular-nums text-zinc-900 cursor-pointer"

const POS_LOOKUP_INPUT_CLASS =
  "w-full rounded border border-white/40 bg-white/95 px-3 py-2.5 text-center font-mono text-lg font-bold tabular-nums text-zinc-900"

export function ReceiptLookupPage({ user }: ReceiptLookupPageProps) {
  const hoUser = user.role !== "SH_STAFF"
  const backHref = hoUser ? "/main/operations" : "/shop"
  const backLabel = hoUser ? "Operations" : "POS"

  const nowParts = bangkokCalendarParts(new Date())

  const [branches, setBranches] = useState<SalesTargetBranchOption[]>([])
  const [branchesLoaded, setBranchesLoaded] = useState(false)
  const [branchId, setBranchId] = useState("")
  const [year, setYear] = useState(nowParts.y)
  const [month, setMonth] = useState(nowParts.m)
  const [runningNo, setRunningNo] = useState("")
  const [receipt, setReceipt] = useState<ReceiptLookupRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

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
      setBranchId((prev) =>
        prev && branchesResult.branches.some((branch) => branch.id === prev)
          ? prev
          : pickDefaultShopBranchId(branchesResult.branches, user.branchId)
      )
    })()
    return () => {
      cancelled = true
    }
  }, [user.branchId])

  const branchCode = useMemo(() => {
    if (hoUser) {
      return branches.find((branch) => branch.id === branchId)?.code ?? user.branchCode
    }
    return user.branchCode
  }, [hoUser, branches, branchId, user.branchCode])

  const previewReceiptNo = useMemo(
    () => buildReceiptLookupNo(branchCode, year, month, runningNo),
    [branchCode, year, month, runningNo]
  )

  const runSearch = useCallback(async () => {
    if (!branchId) return

    const receiptNo = buildReceiptLookupNo(branchCode, year, month, runningNo)
    if (!receiptNo) {
      setError("Enter a valid receipt running number")
      setReceipt(null)
      setSearched(true)
      return
    }

    setLoading(true)
    setError(null)
    const response = await fetchReceiptLookup({
      branchId,
      receiptNo,
    })
    if (!response.ok) {
      setError(response.error)
      setReceipt(null)
      setLoading(false)
      setSearched(true)
      return
    }

    setReceipt(response.result.receipts[0] ?? null)
    setLoading(false)
    setSearched(true)
  }, [branchId, branchCode, year, month, runningNo])

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-slate-200 to-slate-300"
      data-testid="receipt-lookup-page"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-orange-600/98 text-white">
          <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-8 pt-6">
            <Link
              href={backHref}
              className="mb-4 inline-flex text-sm font-semibold text-white/90 hover:text-white"
            >
              ← {backLabel}
            </Link>

            <header className="mb-6 text-center">
              <h1
                className="text-xl font-bold tracking-wide"
                data-testid="entity-context-page-title"
              >
                Receipt History
              </h1>
              <p className="mt-2 text-sm text-white/85">
                Look up a past receipt from this shop.
              </p>
            </header>

            <div
              className="mx-auto flex w-full max-w-sm flex-col gap-4"
              data-testid="receipt-lookup-filters"
            >
              {hoUser && branchesLoaded && branches.length > 0 ? (
                <label className="flex flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
                  Branch
                  <select
                    className={POS_LOOKUP_SELECT_CLASS}
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    disabled={loading}
                    data-testid="receipt-lookup-branch"
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.code} — {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
                  Year
                  <select
                    className={POS_LOOKUP_SELECT_CLASS}
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
                <label className="flex flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
                  Month
                  <select
                    className={POS_LOOKUP_SELECT_CLASS}
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
              </div>

              <label className="flex flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
                Receipt No
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={POS_LOOKUP_INPUT_CLASS}
                  value={runningNo}
                  onChange={(e) =>
                    setRunningNo(normalizeReceiptLookupRunningNo(e.target.value))
                  }
                  placeholder="0112"
                  maxLength={4}
                  disabled={loading}
                  data-testid="receipt-lookup-running-no"
                />
              </label>

              {previewReceiptNo ? (
                <p
                  className="text-center font-mono text-xs text-white/75"
                  data-testid="receipt-lookup-preview-no"
                >
                  {previewReceiptNo}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void runSearch()}
                disabled={loading || !branchId || runningNo.trim().length === 0}
                data-testid="receipt-lookup-search"
                className="mt-1 rounded-lg border-2 border-white bg-white px-8 py-4 text-lg font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Searching…" : "SEARCH"}
              </button>
            </div>

            {error ? (
              <p
                className="mx-auto mt-4 max-w-sm text-center text-sm font-medium text-red-100"
                role="alert"
                data-testid="receipt-lookup-error"
              >
                {error}
              </p>
            ) : null}

            {loading ? (
              <p
                className="mt-8 text-center text-sm text-white/85"
                data-testid="receipt-lookup-loading"
              >
                Searching…
              </p>
            ) : searched ? (
              <div className="mt-8 flex flex-1 flex-col items-center">
                <ReceiptLookupResult
                  receipt={receipt}
                  branchId={branchId}
                  notFound={!receipt}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
