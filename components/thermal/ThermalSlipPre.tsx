import type { CSSProperties, ReactNode } from "react"
import {
  THERMAL_SLIP_CH_VAR,
  THERMAL_SLIP_CH_VAR_LEGACY,
  THERMAL_SLIP_CLASS,
  THERMAL_SLIP_LEGACY_CLASS,
  thermalSlipChWidth,
} from "@/lib/thermal/print-css"

type ThermalSlipPreProps = {
  text: string
  ariaLabel: string
  className?: string
}

export function ThermalSlipPre({ text, ariaLabel, className }: ThermalSlipPreProps) {
  const slipWidth = thermalSlipChWidth()

  return (
    <pre
      className={`${THERMAL_SLIP_CLASS} ${THERMAL_SLIP_LEGACY_CLASS} whitespace-pre ${className ?? ""}`}
      style={
        {
          [THERMAL_SLIP_CH_VAR]: slipWidth,
          [THERMAL_SLIP_CH_VAR_LEGACY]: slipWidth,
          width: slipWidth,
          maxWidth: slipWidth,
        } as CSSProperties
      }
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
  const slipWidth = thermalSlipChWidth()

  return (
    <div
      data-thermal-print-source={kind}
      className={`thermal-print-area ${className ?? ""}`}
      style={
        {
          [THERMAL_SLIP_CH_VAR]: slipWidth,
          [THERMAL_SLIP_CH_VAR_LEGACY]: slipWidth,
          width: slipWidth,
          maxWidth: slipWidth,
        } as CSSProperties
      }
    >
      {children}
    </div>
  )
}
