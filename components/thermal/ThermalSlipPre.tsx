import type { CSSProperties, ReactNode } from "react"
import { THERMAL_PAPER_CSS_VARS } from "@/lib/thermal/thermal-paper"

type ThermalSlipPreProps = {
  text: string
  ariaLabel: string
  className?: string
}

/** Legacy plain-text thermal slip — prefer ThermalTicketSlipView + buildTicketLayout. */
export function ThermalSlipPre({ text, ariaLabel, className }: ThermalSlipPreProps) {
  return (
    <pre
      className={`thermal-slip pos-receipt-slip whitespace-pre ${className ?? ""}`}
      style={THERMAL_PAPER_CSS_VARS as CSSProperties}
      aria-label={ariaLabel}
    >
      {text}
    </pre>
  )
}

type ThermalPrintSourceProps = {
  kind: string
  children: ReactNode
  className?: string
}

export function ThermalPrintSource({ kind, children, className }: ThermalPrintSourceProps) {
  return (
    <div
      data-thermal-print-source={kind}
      className={`thermal-print-area ${className ?? ""}`}
      style={THERMAL_PAPER_CSS_VARS as CSSProperties}
    >
      {children}
    </div>
  )
}
