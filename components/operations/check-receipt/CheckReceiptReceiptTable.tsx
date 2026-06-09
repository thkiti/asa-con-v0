"use client"

import { useState } from "react"
import { SlipImageHoverPreview } from "@/components/operations/check-receipt/SlipImageHoverPreview"
import type { CheckReceiptRow } from "@/lib/operations/check-receipt-types"
import { formatFinancialNumber } from "@/lib/shop-ui/compact-form-helpers"
import { themeCard, themeMuted } from "@/lib/theme/theme-classes"

type CheckReceiptReceiptTableProps = {
  receipts: CheckReceiptRow[]
}

type HoverState = {
  imageUrl: string
  receiptNo: string
}

function formatIssuedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function CheckReceiptReceiptTable({
  receipts,
}: CheckReceiptReceiptTableProps) {
  const [hover, setHover] = useState<HoverState | null>(null)

  if (receipts.length === 0) {
    return (
      <p className={`text-sm ${themeMuted}`} data-testid="check-receipt-empty">
        No receipts for this shop and month.
      </p>
    )
  }

  return (
    <>
      <div
        className={`overflow-x-auto rounded border border-border ${themeCard}`}
        data-testid="check-receipt-table"
      >
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Receipt No</th>
              <th className="px-3 py-2 font-semibold">Issued At</th>
              <th className="px-3 py-2 font-semibold">Staff</th>
              <th className="px-3 py-2 text-right font-semibold">Total</th>
              <th className="px-3 py-2 font-semibold">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {receipts.map((row) => {
              const hasPreview = Boolean(row.slipImageUrl)
              return (
                <tr
                  key={row.saleId}
                  data-testid="check-receipt-row"
                  data-receipt-no={row.receiptNo}
                  data-has-slip-preview={hasPreview ? "true" : "false"}
                  className={hasPreview ? "cursor-default" : undefined}
                  onMouseEnter={
                    hasPreview && row.slipImageUrl
                      ? () =>
                          setHover({
                            imageUrl: row.slipImageUrl!,
                            receiptNo: row.receiptNo,
                          })
                      : undefined
                  }
                  onMouseLeave={hasPreview ? () => setHover(null) : undefined}
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.receiptNo}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatIssuedAt(row.issuedAt)}
                  </td>
                  <td className="px-3 py-2">{row.staff ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatFinancialNumber(row.total)}
                  </td>
                  <td
                    className="px-3 py-2"
                    data-testid="check-receipt-payment-method"
                  >
                    {row.paymentMethod}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hover ? (
        <SlipImageHoverPreview
          imageUrl={hover.imageUrl}
          receiptNo={hover.receiptNo}
        />
      ) : null}
    </>
  )
}
