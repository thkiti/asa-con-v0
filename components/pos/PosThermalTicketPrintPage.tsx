"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { ThermalPrintSource } from "@/components/thermal/ThermalSlipPre"
import { THERMAL_CLONE_PRINT_STYLES } from "@/lib/thermal/print-css"
import { printThermalSlipClone, thermalPrintSourceSelector } from "@/lib/thermal/print-dom"
import { POS_RECEIPT_CLOSE_HINT } from "@/lib/pos-ui/pos-receipt-autoprint"
import { setupThermalTicketAutoprint } from "@/lib/pos-ui/pos-thermal-ticket-autoprint"

type PosThermalTicketPrintPageProps = {
  printSourceKind: string
  autoPrint?: boolean
  printButtonLabel: string
  children: ReactNode
}

/**
 * POS thermal ticket print tab — preview matches print via ThermalPrintSource
 * + printThermalSlipClone (80mm paper, 72mm content, 0.91 print scale).
 */
export function PosThermalTicketPrintPage({
  printSourceKind,
  autoPrint,
  printButtonLabel,
  children,
}: PosThermalTicketPrintPageProps) {
  const [showCloseHint, setShowCloseHint] = useState(false)

  const handlePrint = useCallback(() => {
    printThermalSlipClone(thermalPrintSourceSelector(printSourceKind))
  }, [printSourceKind])

  useEffect(() => {
    return setupThermalTicketAutoprint({
      autoPrint: Boolean(autoPrint),
      printSourceKind,
      onShowCloseHint: () => setShowCloseHint(true),
    })
  }, [autoPrint, printSourceKind])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: THERMAL_CLONE_PRINT_STYLES }} />
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
              onClick={handlePrint}
              className="rounded border border-zinc-400 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
            >
              {printButtonLabel}
            </button>
          </div>
        ) : null}

        {showCloseHint ? (
          <p className="no-print mx-auto mb-3 max-w-md text-center text-sm text-zinc-600">
            {POS_RECEIPT_CLOSE_HINT}
          </p>
        ) : null}

        <div className="receipt-setup-preview !mt-0 !p-0">
          <ThermalPrintSource kind={printSourceKind}>{children}</ThermalPrintSource>
        </div>
      </main>
    </>
  )
}
