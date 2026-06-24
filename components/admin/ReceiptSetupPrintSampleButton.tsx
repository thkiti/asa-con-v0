"use client"

import type { ReactNode } from "react"
import { ThermalPrintSource } from "@/components/thermal/ThermalSlipPre"
import { printThermalSlipClone, thermalPrintSourceSelector } from "@/lib/thermal/print-dom"
import { THERMAL_PRINT_SOURCE_HOST_CLASS } from "@/lib/thermal/print-css"
import { themeBtnSecondary } from "@/lib/theme/theme-classes"

type ReceiptSetupPrintSampleButtonProps = {
  kind: string
  sampleSlip: ReactNode
  disabled?: boolean
}

export function ReceiptSetupPrintSampleButton({
  kind,
  sampleSlip,
  disabled,
}: ReceiptSetupPrintSampleButtonProps) {
  const handlePrint = () => {
    printThermalSlipClone(thermalPrintSourceSelector(kind))
  }

  return (
    <>
      <button
        type="button"
        className={themeBtnSecondary}
        onClick={handlePrint}
        disabled={disabled || !sampleSlip}
        data-testid={`receipt-setup-print-sample-${kind}`}
      >
        Print Sample
      </button>
      <div className={THERMAL_PRINT_SOURCE_HOST_CLASS} aria-hidden="true">
        <ThermalPrintSource kind={kind}>{sampleSlip}</ThermalPrintSource>
      </div>
    </>
  )
}
