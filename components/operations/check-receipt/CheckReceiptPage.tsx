"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { CheckReceiptReceiptTable } from "@/components/operations/check-receipt/CheckReceiptReceiptTable"
import { BranchSelect } from "@/components/ui/BranchSelect"
import { CompactControlRow } from "@/components/shop-ui/CompactControlRow"
import { CompactFieldBox } from "@/components/shop-ui/CompactFieldBox"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { formatEntityContextTitle } from "@/lib/legal-entity"
import type { CheckReceiptResult } from "@/lib/operations/check-receipt-types"
import { fetchCheckReceipt } from "@/lib/operations-ui/check-receipt-client"
import { pickDefaultShopBranchId } from "@/lib/shop/shop-branch-display"
import { fetchSalesTargetBranches } from "@/lib/shop-ui/sales-targets-client"
import type { SalesTargetBranchOption } from "@/lib/shop/sales-target-types"
import {
  themeCard,
  themeLinkMuted,
  themeMuted,
  themePage,
  themePageTitle,
} from "@/lib/theme/theme-classes"

const CHECK_RECEIPT_HEADER_GRID =
  "grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_7.5rem_6.5rem] sm:gap-x-2.5 sm:items-center"

const CHECK_RECEIPT_PERIOD_SELECT_CLASS =
  "compact-theme-select min-w-0 flex-1 pl-2 pr-7 text-center text-sm"

const CHECK_RECEIPT_YEAR_OPTIONS = Array.from(
  { length: 101 },
  (_, index) => 2100 - index
)

type CheckReceiptPageProps = {
  user: SessionUserApi
}

export function CheckReceiptPage({ user }: CheckReceiptPageProps) {
  const now = new Date()
  const [branches, setBranches] = useState<SalesTargetBranchOption[]>([])
  const [branchesLoaded, setBranchesLoaded] = useState(false)
  const [branchId, setBranchId] = useState("")
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [result, setResult] = useState<CheckReceiptResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const loadReceipts = useCallback(async () => {
    if (!branchId) {
      setResult(null)
      return
    }

    setLoading(true)
    setError(null)
    const response = await fetchCheckReceipt({ branchId, year, month })
    if (!response.ok) {
      setError(response.error)
      setResult(null)
      setLoading(false)
      return
    }
    setResult(response.result)
    setLoading(false)
  }, [branchId, year, month])

  useEffect(() => {
    if (!branchesLoaded) return
    void loadReceipts()
  }, [branchesLoaded, loadReceipts])

  return (
    <main className={`mx-auto max-w-5xl p-6 ${themePage}`}>
      <header className="border-b border-border pb-4">
        <Link href="/main/operations" className={`text-sm ${themeLinkMuted}`}>
          ← Operations
        </Link>
        <h1
          className={`mt-3 ${themePageTitle}`}
          data-testid="entity-context-page-title"
        >
          {formatEntityContextTitle(user.documentEntityCode, "Check Receipt")}
        </h1>
        <p className={`mt-2 max-w-3xl text-sm ${themeMuted}`}>
          Review receipts by shop and month. Hover bank-transfer rows to preview
          uploaded slips.
        </p>
      </header>

      <div className="mt-6 space-y-4" data-testid="check-receipt-page">
        <div className={`${themeCard} p-3`}>
          <CompactControlRow
            gridClassName={CHECK_RECEIPT_HEADER_GRID}
            testId="check-receipt-filters"
          >
            <CompactFieldBox label="Shop">
              {branchesLoaded && branches.length === 0 ? (
                <span className="px-2 text-sm text-amber-700">
                  No active shop branches
                </span>
              ) : (
                <BranchSelect
                  value={branchId}
                  onChange={setBranchId}
                  options={branches}
                  selectClassName="compact-theme-select min-w-0 flex-1 px-2 text-sm"
                  disabled={loading || branches.length === 0}
                  aria-label="Shop"
                  formatOptionLabel={(branch) => `${branch.code} — ${branch.name}`}
                  data-testid="check-receipt-shop"
                />
              )}
            </CompactFieldBox>

            <CompactFieldBox label="Year">
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className={CHECK_RECEIPT_PERIOD_SELECT_CLASS}
                disabled={loading || !branchId}
                aria-label="Year"
                data-testid="check-receipt-year"
              >
                {CHECK_RECEIPT_YEAR_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </CompactFieldBox>

            <CompactFieldBox label="Month">
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className={CHECK_RECEIPT_PERIOD_SELECT_CLASS}
                disabled={loading || !branchId}
                aria-label="Month"
                data-testid="check-receipt-month"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  )
                )}
              </select>
            </CompactFieldBox>
          </CompactControlRow>
        </div>

        {error ? (
          <p className="text-sm text-destructive" data-testid="check-receipt-error">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className={`text-sm ${themeMuted}`} data-testid="check-receipt-loading">
            Loading receipts…
          </p>
        ) : null}

        {!loading && result ? (
          <CheckReceiptReceiptTable receipts={result.receipts} />
        ) : null}
      </div>
    </main>
  )
}
