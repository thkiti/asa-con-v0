"use client"

import { useCallback, useEffect, useState } from "react"
import type {
  SalesDashboardDayDetail,
  SalesDashboardReceiptPreview,
} from "@/lib/shop/sales-dashboard-types"
import { fetchSalesDashboardDayDetail } from "@/lib/shop-ui/sales-dashboard-client"
import { formatFinancialNumber } from "@/lib/shop-ui/compact-form-helpers"
import { themeBtnSecondary, themeCard, themeMuted } from "@/lib/theme/theme-classes"

type DaySalesSlideInPanelProps = {
  open: boolean
  dateKey: string
  scopeBranchId: string | null
  onClose: () => void
}

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-")
  return `${d}/${m}/${y}`
}

function ReceiptPreviewBody({ preview }: { preview: SalesDashboardReceiptPreview }) {
  return (
    <div className="space-y-4" data-testid="day-sales-receipt-preview">
      <div className="space-y-1 text-sm">
        <p>
          <span className={themeMuted}>Receipt</span>{" "}
          <span className="font-semibold">{preview.receiptNo}</span>
          <span className={themeMuted}> · {preview.time}</span>
        </p>
        <p>
          <span className={themeMuted}>Sale total</span>{" "}
          {formatFinancialNumber(preview.saleTotal)}
        </p>
        <p>
          <span className={themeMuted}>Refunded</span>{" "}
          {formatFinancialNumber(preview.refundedTotal)}
        </p>
        <p>
          <span className={themeMuted}>Remaining</span>{" "}
          {formatFinancialNumber(preview.remainingRefundable)}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Items
        </h3>
        <ul className="divide-y divide-border rounded border border-border text-sm">
          {preview.items.map((item, idx) => (
            <li
              key={`${item.name}-${idx}`}
              className="flex items-start justify-between gap-2 px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                {item.name}{" "}
                <span className={themeMuted}>×{item.qty}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatFinancialNumber(item.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {preview.linkedRefunds.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Refunds
          </h3>
          <ul className="divide-y divide-border rounded border border-border text-sm">
            {preview.linkedRefunds.map((refund) => (
              <li
                key={refund.refundId}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <span>{refund.refundNo}</span>
                <span className="tabular-nums">
                  {formatFinancialNumber(refund.amount)}
                </span>
                <a
                  href={refund.printUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  Print
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <a
        href={preview.salePrintUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex ${themeBtnSecondary} text-sm`}
        data-testid="day-sales-print-receipt"
      >
        Print receipt
      </a>
    </div>
  )
}

export function DaySalesSlideInPanel({
  open,
  dateKey,
  scopeBranchId,
  onClose,
}: DaySalesSlideInPanelProps) {
  const [detail, setDetail] = useState<SalesDashboardDayDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)

  const loadDetail = useCallback(
    async (input: { branchId?: string; saleId?: string }) => {
      setLoading(true)
      setError(null)
      const result = await fetchSalesDashboardDayDetail({
        dateKey,
        branchId: input.branchId,
        saleId: input.saleId,
      })
      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }
      setDetail(result.detail)
      if (result.detail.mode === "receipt-list") {
        setActiveBranchId(result.detail.branchId)
      }
      setLoading(false)
    },
    [dateKey]
  )

  useEffect(() => {
    if (!open) {
      setDetail(null)
      setError(null)
      setActiveBranchId(null)
      return
    }

    void loadDetail({
      branchId: scopeBranchId ?? undefined,
    })
  }, [open, scopeBranchId, loadDetail])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const title = `Sales · ${formatDateLabel(dateKey)}`

  function handleBack() {
    if (detail?.mode === "receipt-preview") {
      void loadDetail({ branchId: activeBranchId ?? scopeBranchId ?? undefined })
      return
    }
    if (detail?.mode === "receipt-list" && !scopeBranchId) {
      setActiveBranchId(null)
      void loadDetail({})
    }
  }

  const showBack =
    detail?.mode === "receipt-preview" ||
    (detail?.mode === "receipt-list" && !scopeBranchId)

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      data-testid="day-sales-slide-in-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="day-sales-slide-in-panel"
        className="flex h-full w-full max-w-none flex-col bg-card shadow-xl sm:max-w-[min(520px,100vw)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className={`shrink-0 ${themeBtnSecondary} px-2 py-1 text-xs`}
              data-testid="day-sales-back"
            >
              ← Back
            </button>
          ) : null}
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 ${themeBtnSecondary} px-2 py-1 text-xs`}
            aria-label="Close"
            data-testid="day-sales-close"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className={`text-sm ${themeMuted}`} data-testid="day-sales-loading">
              Loading…
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" data-testid="day-sales-error">
              {error}
            </p>
          ) : null}

          {!loading && !error && detail?.mode === "branch-summary" ? (
            <div data-testid="day-sales-branch-summary">
              <p className={`mb-3 text-sm ${themeMuted}`}>
                Gross sales by branch (Bangkok date)
              </p>
              <ul className={`divide-y divide-border rounded border border-border ${themeCard}`}>
                {detail.branches.map((row) => {
                  const clickable = row.receiptCount > 0
                  return (
                    <li key={row.branchId}>
                      {clickable ? (
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/40"
                          onClick={() => {
                            setActiveBranchId(row.branchId)
                            void loadDetail({ branchId: row.branchId })
                          }}
                          data-testid={`day-sales-branch-${row.code}`}
                        >
                          <span>
                            <span className="font-medium">{row.code}</span>
                            <span className={themeMuted}> · {row.name}</span>
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatFinancialNumber(row.grossSales)} · {row.receiptCount}{" "}
                            rcpt
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-muted-foreground">
                          <span>
                            {row.code} · {row.name}
                          </span>
                          <span>—</span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {!loading && !error && detail?.mode === "receipt-list" ? (
            <div data-testid="day-sales-receipt-list">
              <p className={`mb-3 text-sm ${themeMuted}`}>
                Branch {detail.branchCode} · receipts
              </p>
              {detail.receipts.length === 0 ? (
                <p className={`text-sm ${themeMuted}`}>No receipts for this day.</p>
              ) : (
                <ul className={`divide-y divide-border rounded border border-border ${themeCard}`}>
                  {detail.receipts.map((row) => (
                    <li key={row.saleId}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/40"
                        onClick={() =>
                          void loadDetail({
                            branchId: detail.branchId,
                            saleId: row.saleId,
                          })
                        }
                        data-testid={`day-sales-receipt-${row.receiptNo}`}
                      >
                        <span>
                          <span className="font-medium">{row.receiptNo}</span>
                          <span className={themeMuted}> · {row.time}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatFinancialNumber(row.total)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {!loading && !error && detail?.mode === "receipt-preview" ? (
            <ReceiptPreviewBody preview={detail.preview} />
          ) : null}
        </div>
      </aside>
    </div>
  )
}
