"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { SlipImageHoverPreview } from "@/components/operations/check-receipt/SlipImageHoverPreview"
import type { CheckReceiptRow } from "@/lib/operations/check-receipt-types"
import { computeSlipPreviewPosition } from "@/lib/operations-ui/slip-hover-preview-layout"
import { formatFinancialNumber } from "@/lib/shop-ui/compact-form-helpers"
import { themeCard, themeMuted } from "@/lib/theme/theme-classes"

type CheckReceiptReceiptTableProps = {
  receipts: CheckReceiptRow[]
}

type PreviewPosition = {
  top: number
  left: number
  maxWidth: number
  maxHeight: number
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

function CheckReceiptTableRow({ row }: { row: CheckReceiptRow }) {
  const receiptRef = useRef<HTMLTableCellElement>(null)
  const paymentRef = useRef<HTMLTableCellElement>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [position, setPosition] = useState<PreviewPosition>({
    top: 0,
    left: 0,
    maxWidth: 480,
    maxHeight: 560,
  })

  const hasPreview = Boolean(row.slipImageUrl)

  const updatePosition = useCallback(() => {
    const receiptEl = receiptRef.current
    if (!receiptEl) return
    setPosition(
      computeSlipPreviewPosition({
        anchorRect: receiptEl.getBoundingClientRect(),
        paymentRect: paymentRef.current?.getBoundingClientRect() ?? null,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
    )
  }, [])

  const openPreview = useCallback(() => {
    updatePosition()
    setPreviewOpen(true)
  }, [updatePosition])

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
  }, [])

  useEffect(() => {
    if (!previewOpen) return
    const onReposition = () => updatePosition()
    window.addEventListener("scroll", onReposition, true)
    window.addEventListener("resize", onReposition)
    return () => {
      window.removeEventListener("scroll", onReposition, true)
      window.removeEventListener("resize", onReposition)
    }
  }, [previewOpen, updatePosition])

  return (
    <tr
      data-testid="check-receipt-row"
      data-receipt-no={row.receiptNo}
      data-has-slip-preview={hasPreview ? "true" : "false"}
    >
      <td
        ref={receiptRef}
        className={`px-3 py-2 font-mono text-xs ${hasPreview ? "cursor-default underline decoration-dotted underline-offset-2" : ""}`}
        data-testid={hasPreview ? "check-receipt-slip-trigger" : undefined}
        onMouseEnter={hasPreview ? openPreview : undefined}
        onMouseLeave={hasPreview ? closePreview : undefined}
      >
        {row.receiptNo}
      </td>
      <td className="px-3 py-2 tabular-nums">{formatIssuedAt(row.issuedAt)}</td>
      <td className="px-3 py-2">{row.staff ?? "—"}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatFinancialNumber(row.total)}
      </td>
      <td
        ref={paymentRef}
        className="px-3 py-2"
        data-testid="check-receipt-payment-method"
      >
        {row.paymentMethod}
      </td>
      {previewOpen && row.slipImageUrl && typeof document !== "undefined"
        ? createPortal(
            <SlipImageHoverPreview
              imageUrl={row.slipImageUrl}
              receiptNo={row.receiptNo}
              {...position}
            />,
            document.body
          )
        : null}
    </tr>
  )
}

export function CheckReceiptReceiptTable({
  receipts,
}: CheckReceiptReceiptTableProps) {
  if (receipts.length === 0) {
    return (
      <p className={`text-sm ${themeMuted}`} data-testid="check-receipt-empty">
        No receipts for this shop and month.
      </p>
    )
  }

  return (
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
          {receipts.map((row) => (
            <CheckReceiptTableRow key={row.saleId} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
