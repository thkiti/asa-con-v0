"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { formatFinanceListDate } from "@/lib/finance-ui/format"
import {
  financeMemo,
  financeTable,
  financeTh,
  voucherInquiryFilterActions,
  voucherInquiryFilterBar,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterButtonSecondary,
  voucherInquiryFilterDate,
  voucherInquiryFilterPeriod,
  voucherInquiryFilterRefType,
  voucherInquiryFilterVoucherNo,
} from "@/lib/finance-ui/finance-visual-classes"
import { buildFinanceVoucherDetailPath } from "@/lib/finance-ui/finance-navigation"
import { formatVoucherInquiryRefTypeLabel } from "@/lib/finance/inquiry/voucher-inquiry-labels"
import { VOUCHER_INQUIRY_REF_TYPE_OPTIONS } from "@/lib/finance/inquiry/voucher-document-types"
import {
  buildVoucherInquiryReturnPath,
  buildVoucherInquirySearchParams,
  fetchFinanceVouchers,
  parseVoucherInquiryFilterFromSearchParams,
} from "@/lib/finance-ui/voucher-inquiry"
import type {
  FinanceVoucherInquiryFilter,
  FinanceVoucherListRow,
} from "@/lib/finance-ui/types"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

const emptyFilter = (): FinanceVoucherInquiryFilter => ({})

type VoucherInquiryResultsTableProps = {
  vouchers: FinanceVoucherListRow[]
  total: number
  rowOffset: number
  listReturnPath: string
}

export function VoucherInquiryResultsTable({
  vouchers,
  total,
  rowOffset,
  listReturnPath,
}: VoucherInquiryResultsTableProps) {
  return (
    <>
      <p className="text-sm text-zinc-600">
        {total} voucher{total === 1 ? "" : "s"}
      </p>
      <table className={financeTable} data-testid="voucher-inquiry-table">
        <thead>
          <tr>
            <th className={financeTh}>No.</th>
            <th className={financeTh}>Voucher No</th>
            <th className={financeTh}>Date</th>
            <th className={financeTh}>Type</th>
            <th className={financeTh}>Ref No</th>
            <th className={financeTh}>Status</th>
            <th className={financeTh}>View</th>
          </tr>
        </thead>
        <tbody>
          {vouchers.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-center text-sm text-zinc-500">
                No vouchers match the current filters.
              </td>
            </tr>
          ) : (
            vouchers.map((row, index) => (
              <tr key={row.id} data-testid={`voucher-inquiry-row-${row.id}`}>
                <td className="text-zinc-600">{rowOffset + index + 1}</td>
                <td className="font-mono text-xs">{row.voucherNo}</td>
                <td>{formatFinanceListDate(row.date)}</td>
                <td>{formatVoucherInquiryRefTypeLabel(row.refType)}</td>
                <td className={financeMemo}>{row.refNo ?? "—"}</td>
                <td>{row.status}</td>
                <td>
                  <Link
                    href={buildFinanceVoucherDetailPath(row.id, listReturnPath)}
                    className={themeLinkMuted}
                    data-testid={`voucher-inquiry-view-${row.id}`}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  )
}

export function VoucherInquiryListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const appliedFilter = useMemo(
    () => parseVoucherInquiryFilterFromSearchParams(searchParams),
    [searchParams]
  )

  const [draft, setDraft] = useState<FinanceVoucherInquiryFilter>(appliedFilter)
  const [vouchers, setVouchers] = useState<FinanceVoucherListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const listReturnPath = useMemo(
    () => buildVoucherInquiryReturnPath(appliedFilter),
    [appliedFilter]
  )

  const rowOffset = appliedFilter.offset ?? 0

  useEffect(() => {
    setDraft(appliedFilter)
  }, [appliedFilter])

  const load = useCallback(async (filter: FinanceVoucherInquiryFilter) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFinanceVouchers(filter)
      setVouchers(result.vouchers)
      setTotal(result.total)
    } catch (err) {
      setVouchers([])
      setTotal(0)
      setError(err instanceof Error ? err.message : "Failed to load vouchers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(appliedFilter)
  }, [appliedFilter, load])

  const applyFilters = () => {
    const params = buildVoucherInquirySearchParams(draft)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const clearFilters = () => {
    setDraft(emptyFilter())
    router.replace(pathname)
  }

  return (
    <div className="space-y-4" data-testid="voucher-inquiry-list-page">
      <div className={voucherInquiryFilterBar} data-testid="voucher-inquiry-filters">
        <label className={voucherInquiryFilterPeriod}>
          <span className="text-zinc-600">Period</span>
          <input
            className="rounded border border-zinc-300 px-2 py-1"
            value={draft.periodKey ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, periodKey: e.target.value || undefined }))
            }
            placeholder="2026-06"
            data-testid="voucher-inquiry-filter-period"
          />
        </label>
        <label className={voucherInquiryFilterDate}>
          <span className="text-zinc-600">From</span>
          <input
            type="date"
            className="rounded border border-zinc-300 px-2 py-1"
            value={draft.from ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, from: e.target.value || undefined }))
            }
            data-testid="voucher-inquiry-filter-from"
          />
        </label>
        <label className={voucherInquiryFilterDate}>
          <span className="text-zinc-600">To</span>
          <input
            type="date"
            className="rounded border border-zinc-300 px-2 py-1"
            value={draft.to ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, to: e.target.value || undefined }))
            }
            data-testid="voucher-inquiry-filter-to"
          />
        </label>
        <label className={voucherInquiryFilterRefType}>
          <span className="text-zinc-600">Ref Type</span>
          <select
            className="rounded border border-zinc-300 px-2 py-1"
            value={draft.refType ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, refType: e.target.value || undefined }))
            }
            data-testid="voucher-inquiry-filter-ref-type"
          >
            {VOUCHER_INQUIRY_REF_TYPE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={voucherInquiryFilterVoucherNo}>
          <span className="text-zinc-600">Voucher No</span>
          <input
            className="rounded border border-zinc-300 px-2 py-1"
            value={draft.voucherNo ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, voucherNo: e.target.value || undefined }))
            }
            placeholder="V-2026-"
            data-testid="voucher-inquiry-filter-voucher-no"
          />
        </label>
        <div className={voucherInquiryFilterActions}>
          <button
            type="button"
            className={voucherInquiryFilterButtonPrimary}
            onClick={applyFilters}
            data-testid="voucher-inquiry-search"
          >
            Search
          </button>
          <button
            type="button"
            className={voucherInquiryFilterButtonSecondary}
            onClick={clearFilters}
            data-testid="voucher-inquiry-clear"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <VoucherInquiryResultsTable
          vouchers={vouchers}
          total={total}
          rowOffset={rowOffset}
          listReturnPath={listReturnPath}
        />
      ) : null}
    </div>
  )
}
