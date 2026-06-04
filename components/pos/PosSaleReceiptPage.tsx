"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import {
  POS_RECEIPT_CLOSE_HINT,
  setupReceiptAutoprint,
} from "@/lib/pos-ui/pos-receipt-autoprint"
import { PosSaleReceiptSlip } from "./PosSaleReceiptSlip"

type PosSaleReceiptPageProps = {
  receipt: ReceiptPrintContext
  autoPrint?: boolean
}

export function PosSaleReceiptPage({ receipt, autoPrint }: PosSaleReceiptPageProps) {
  const [showCloseHint, setShowCloseHint] = useState(false)

  useEffect(() => {
    return setupReceiptAutoprint({
      autoPrint: Boolean(autoPrint),
      onShowCloseHint: () => setShowCloseHint(true),
    })
  }, [autoPrint])

  return (
    <main className="pos-receipt-print min-h-screen bg-zinc-100 p-4 print:p-0">
      {!autoPrint ? (
        <div className="no-print mx-auto mb-4 flex max-w-md flex-wrap items-center gap-3">
          <Link
            href="/shop"
            className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
          >
            ← Back to POS
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-zinc-400 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            Print receipt
          </button>
        </div>
      ) : null}

      {showCloseHint ? (
        <p className="no-print mx-auto mb-3 max-w-md text-center text-sm text-zinc-600">
          {POS_RECEIPT_CLOSE_HINT}
        </p>
      ) : null}

      <div className="pos-receipt-print-frame w-fit rounded border border-zinc-300 bg-white p-3 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <PosSaleReceiptSlip receipt={receipt} />
      </div>
    </main>
  )
}
