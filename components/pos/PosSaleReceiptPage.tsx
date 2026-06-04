"use client"

import Link from "next/link"
import { useEffect } from "react"
import type { SaleReceiptView } from "@/lib/pos/load-sale-receipt"
import { PosSaleReceiptSlip } from "./PosSaleReceiptSlip"

type PosSaleReceiptPageProps = {
  receipt: SaleReceiptView
  autoPrint?: boolean
}

export function PosSaleReceiptPage({ receipt, autoPrint }: PosSaleReceiptPageProps) {
  useEffect(() => {
    if (!autoPrint) return
    const id = window.setTimeout(() => window.print(), 300)
    return () => window.clearTimeout(id)
  }, [autoPrint])

  return (
    <main className="pos-receipt-print min-h-screen bg-zinc-100 p-4">
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

      <div className="mx-auto max-w-[80mm] rounded border border-zinc-300 bg-white p-3 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <PosSaleReceiptSlip receipt={receipt} />
      </div>
    </main>
  )
}
