"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { RevenueVoucherStatusBadge } from "@/components/finance/RevenueVoucherStatusBadge"
import { formatFinanceDocumentDate } from "@/lib/finance-ui/finance-document-display"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import {
  formatRevenueVoucherDocumentNo,
  REVENUE_VOUCHER_STATUSES,
  type RevenueVoucherStatusCode,
} from "@/lib/finance-ui/revenue-voucher-display"
import {
  deleteDraftRevenueVoucher,
  fetchRevenueVouchers,
  type RevenueVoucherListFilterInput,
  type RevenueVoucherListItem,
} from "@/lib/finance-ui/revenue-vouchers"
import { formatEntityShort } from "@/lib/legal-entity"
import {
  LEGAL_ENTITY_CODES,
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

const ALL = ""

type FilterState = {
  legalEntityCode: string
  status: string
  search: string
  dateFrom: string
  dateTo: string
}

const defaultFilter: FilterState = {
  legalEntityCode: ALL,
  status: ALL,
  search: "",
  dateFrom: "",
  dateTo: "",
}

function toListFilter(filter: FilterState): RevenueVoucherListFilterInput {
  return {
    ...(filter.legalEntityCode
      ? { legalEntityCode: filter.legalEntityCode as DocumentEntityCode }
      : {}),
    ...(filter.status ? { status: filter.status as RevenueVoucherStatusCode } : {}),
    ...(filter.search.trim() ? { search: filter.search.trim() } : {}),
    ...(filter.dateFrom ? { dateFrom: filter.dateFrom } : {}),
    ...(filter.dateTo ? { dateTo: filter.dateTo } : {}),
    limit: 50,
    offset: 0,
  }
}

export function RevenueVoucherListPage() {
  const [filter, setFilter] = useState<FilterState>(defaultFilter)
  const [entries, setEntries] = useState<RevenueVoucherListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchRevenueVouchers(toListFilter(filter))
      setEntries(result.entries)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load revenue vouchers")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const filterSummary = useMemo(() => {
    if (filter.search.trim()) return ` matching “${filter.search.trim()}”`
    return ""
  }, [filter.search])

  async function handleDelete(row: RevenueVoucherListItem) {
    if (row.status !== "DRAFT") return
    if (!window.confirm(`Delete draft ${formatRevenueVoucherDocumentNo(row.entryNo)}?`)) {
      return
    }
    setDeletingId(row.id)
    setError(null)
    try {
      await deleteDraftRevenueVoucher(row.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4" data-testid="revenue-voucher-list">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-2">
          <span className="text-zinc-600">Search</span>
          <input
            type="search"
            className="rounded border border-zinc-300 px-2 py-1"
            placeholder="REV no, received from, reference…"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            data-testid="filter-search"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Legal entity</span>
          <select
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.legalEntityCode}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, legalEntityCode: e.target.value }))
            }
            data-testid="filter-legal-entity"
          >
            <option value={ALL}>All</option>
            {LEGAL_ENTITY_CODES.map((code) => (
              <option key={code} value={code}>
                {formatEntityShort(code)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Status</span>
          <select
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.status}
            onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value }))}
            data-testid="filter-status"
          >
            <option value={ALL}>All</option>
            {REVENUE_VOUCHER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Date from</span>
          <input
            type="date"
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.dateFrom}
            onChange={(e) => setFilter((prev) => ({ ...prev, dateFrom: e.target.value }))}
            data-testid="filter-date-from"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Date to</span>
          <input
            type="date"
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.dateTo}
            onChange={(e) => setFilter((prev) => ({ ...prev, dateTo: e.target.value }))}
            data-testid="filter-date-to"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/finance/revenue-vouchers/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
          data-testid="new-revenue-voucher"
        >
          New REV
        </Link>
        <button
          type="button"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading revenue vouchers…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <>
          <p className="text-sm text-zinc-600">
            {total} voucher{total === 1 ? "" : "s"}
            {filterSummary}
          </p>
          <div className={financeTableScroll}>
            <table className={financeTable}>
              <thead>
                <tr>
                  <th className={financeTh}>REV no</th>
                  <th className={financeTh}>Voucher date</th>
                  <th className={financeTh}>Received from</th>
                  <th className={financeThRight}>Total amount</th>
                  <th className={financeTh}>Status</th>
                  <th className={financeTh}>Created by</th>
                  <th className={financeTh}>Posted date</th>
                  <th className={financeTh}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/finance/revenue-vouchers/${row.id}`}
                        className={`font-mono text-xs ${themeLinkMuted}`}
                        data-testid={`entry-link-${row.id}`}
                      >
                        {formatRevenueVoucherDocumentNo(row.entryNo)}
                      </Link>
                    </td>
                    <td className={financeMemo}>
                      {formatFinanceDocumentDate(row.entryDate)}
                    </td>
                    <td className={financeMemo}>{row.receivedFromName}</td>
                    <td className={financeNumber}>{formatAmount(row.totalAmount)}</td>
                    <td className={financeMemo}>
                      <RevenueVoucherStatusBadge status={row.status} />
                    </td>
                    <td className={financeMemo}>{row.createdByStaffId}</td>
                    <td className={financeMemo}>
                      {row.postedAt ? formatDateTime(row.postedAt) : "—"}
                    </td>
                    <td className={financeMemo}>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link
                          href={`/finance/revenue-vouchers/${row.id}`}
                          className="underline"
                          data-testid={`action-open-${row.id}`}
                        >
                          Open
                        </Link>
                        {row.status === "DRAFT" ? (
                          <>
                            <Link
                              href={`/finance/revenue-vouchers/${row.id}`}
                              className="underline"
                              data-testid={`action-edit-${row.id}`}
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="text-red-700 underline disabled:opacity-50"
                              disabled={deletingId === row.id}
                              onClick={() => void handleDelete(row)}
                              data-testid={`action-delete-${row.id}`}
                            >
                              {deletingId === row.id ? "Deleting…" : "Delete"}
                            </button>
                          </>
                        ) : null}
                        {row.status === "POSTED" ? (
                          <Link
                            href={`/finance/revenue-vouchers/${row.id}`}
                            className="underline"
                            data-testid={`action-view-${row.id}`}
                          >
                            View
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}
