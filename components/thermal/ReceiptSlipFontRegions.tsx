"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { TicketSetupDivider } from "@/components/admin/TicketSetupPreviewPrimitives"
import type { ThermalSlipInfoBlockRow } from "@/lib/thermal/thermal-slip-info-block"
import {
  RECEIPT_SLIP_PROPORTIONAL_CLASS,
  RECEIPT_SLIP_TAX_TITLE_CLASS,
} from "@/lib/thermal/receipt-slip-fonts"
import type { ReceiptBlockFontPx } from "@/lib/thermal/receipt-block-font-size"
import type { ReceiptSlipRefStaff } from "@/lib/thermal/build-receipt-slip"
import {
  RECEIPT_MACHINE_LINE_MAX_PX,
  RECEIPT_MACHINE_LINE_MIN_PX,
  formatReceiptMachineLine,
} from "@/lib/thermal/receipt-machine-line"

/** Full receipt width — do not size centered blocks in `ch` (font-dependent). */
const receiptSlipFullWidthStyle = {
  width: "100%",
} as const

type ReceiptSlipInfoTypography = {
  fontSizePx?: ReceiptBlockFontPx
  bold?: boolean
}

type ReceiptSlipProportionalBlockProps = {
  lines: string[]
  fontSizePx: ReceiptBlockFontPx
  bold?: boolean
  className?: string
  testId?: string
  ariaHidden?: boolean
}

export function ReceiptSlipProportionalBlock({
  lines,
  fontSizePx,
  bold = true,
  className = "",
  testId,
  ariaHidden,
}: ReceiptSlipProportionalBlockProps) {
  if (lines.length === 0) return null

  return (
    <div
      className={`${RECEIPT_SLIP_PROPORTIONAL_CLASS} receipt-slip-block receipt-slip-block-centered ${className}`}
      style={{
        ...receiptSlipFullWidthStyle,
        fontSize: `${fontSizePx}px`,
        fontWeight: bold ? 700 : 400,
      }}
      data-testid={testId}
      aria-hidden={ariaHidden ?? undefined}
    >
      <div className="receipt-slip-block-text w-full whitespace-pre-wrap text-center leading-tight">
        {lines.join("\n")}
      </div>
    </div>
  )
}

type ReceiptSlipIdentityBlockProps = {
  beforeMachineLines: string[]
  machineTaxId?: string | null
  afterMachineLines: string[]
  fontSizePx?: ReceiptBlockFontPx
  bold?: boolean
}

function ReceiptSlipIdentityTextLines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null

  return (
    <div className="receipt-slip-block-text w-full whitespace-pre-wrap text-center leading-tight">
      {lines.join("\n")}
    </div>
  )
}

export function ReceiptSlipMachineLine({
  machineId,
  maxFontSizePx = RECEIPT_MACHINE_LINE_MAX_PX,
}: {
  machineId: string
  maxFontSizePx?: number
}) {
  const text = formatReceiptMachineLine(machineId)
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const [fontSizePx, setFontSizePx] = useState(maxFontSizePx)
  const [truncate, setTruncate] = useState(false)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    let size = maxFontSizePx
    inner.style.fontSize = `${size}px`
    setTruncate(false)

    while (size > RECEIPT_MACHINE_LINE_MIN_PX && inner.scrollWidth > outer.clientWidth) {
      size -= 1
      inner.style.fontSize = `${size}px`
    }

    const needsTruncate = inner.scrollWidth > outer.clientWidth
    setFontSizePx(size)
    setTruncate(needsTruncate)
  }, [text, maxFontSizePx])

  return (
    <div
      ref={outerRef}
      className={`${RECEIPT_SLIP_PROPORTIONAL_CLASS} receipt-slip-machine-line receipt-slip-block-centered w-full max-w-full overflow-hidden`}
      data-testid="receipt-slip-machine-line"
    >
      <div className="receipt-slip-block-text w-full text-center leading-tight">
        <span
          ref={innerRef}
          className={`inline-block max-w-full whitespace-nowrap ${truncate ? "truncate" : ""}`}
          style={{ fontSize: `${fontSizePx}px` }}
        >
          {text}
        </span>
      </div>
    </div>
  )
}

export function ReceiptSlipIdentityBlock({
  beforeMachineLines,
  machineTaxId,
  afterMachineLines,
  fontSizePx,
  bold = true,
}: ReceiptSlipIdentityBlockProps) {
  const hasMachine = Boolean(machineTaxId?.trim())
  if (
    beforeMachineLines.length === 0 &&
    !hasMachine &&
    afterMachineLines.length === 0
  ) {
    return null
  }

  const infoStyle = {
    ...receiptSlipFullWidthStyle,
    ...(fontSizePx != null
      ? { fontSize: `${fontSizePx}px`, fontWeight: bold ? 700 : 400 }
      : {}),
  }

  return (
    <div
      className={`${RECEIPT_SLIP_PROPORTIONAL_CLASS} receipt-slip-identity receipt-slip-identity-block receipt-slip-block-centered leading-tight`}
      style={infoStyle}
      data-testid="receipt-slip-identity"
    >
      <ReceiptSlipIdentityTextLines lines={beforeMachineLines} />
      {hasMachine ? (
        <ReceiptSlipMachineLine
          machineId={machineTaxId!.trim()}
          maxFontSizePx={fontSizePx ?? RECEIPT_MACHINE_LINE_MAX_PX}
        />
      ) : null}
      <ReceiptSlipIdentityTextLines lines={afterMachineLines} />
    </div>
  )
}

type ReceiptSlipRefStaffBlockProps = ReceiptSlipRefStaff & ReceiptSlipInfoTypography

export type ReceiptSlipInfoBlockRowProps = {
  label: string
  value: string
}

type ReceiptSlipInfoBlockProps = ReceiptSlipInfoTypography & {
  rows: ReceiptSlipInfoBlockRowProps[]
}

function ReceiptSlipInfoLabelValueRow({
  label,
  value,
  valueClassName = "min-w-0 truncate text-right tabular-nums",
}: ReceiptSlipInfoBlockRowProps & { valueClassName?: string }) {
  if (!value.trim()) return null

  return (
    <div className="receipt-slip-ref-staff-row flex w-full items-baseline justify-between gap-1">
      <span className="shrink-0 text-left">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  )
}

export function ReceiptSlipInfoBlock({
  rows,
  fontSizePx,
  bold = true,
}: ReceiptSlipInfoBlockProps) {
  if (rows.length === 0) return null

  const infoStyle = {
    ...receiptSlipFullWidthStyle,
    ...(fontSizePx != null
      ? { fontSize: `${fontSizePx}px`, fontWeight: bold ? 700 : 400 }
      : {}),
  }

  return (
    <div
      className={`${RECEIPT_SLIP_PROPORTIONAL_CLASS} receipt-slip-ref-staff w-full space-y-0.5 leading-tight`}
      style={infoStyle}
      data-testid="receipt-slip-info-block"
    >
      {rows.map((row, index) => (
        <ReceiptSlipInfoLabelValueRow key={`${row.label}-${index}`} {...row} />
      ))}
    </div>
  )
}

type ReceiptSlipStructuredInfoBlockProps = ReceiptSlipInfoTypography & {
  rows: ThermalSlipInfoBlockRow[]
}

export function ReceiptSlipStructuredInfoBlock({
  rows,
  fontSizePx,
  bold = true,
}: ReceiptSlipStructuredInfoBlockProps) {
  if (rows.length === 0) return null

  const infoStyle = {
    ...receiptSlipFullWidthStyle,
    ...(fontSizePx != null
      ? { fontSize: `${fontSizePx}px`, fontWeight: bold ? 700 : 400 }
      : {}),
  }

  return (
    <div
      className={`${RECEIPT_SLIP_PROPORTIONAL_CLASS} receipt-slip-ref-staff w-full space-y-0.5 leading-tight`}
      style={infoStyle}
      data-testid="receipt-slip-structured-info-block"
    >
      {rows.map((row, index) => {
        switch (row.kind) {
          case "label-value":
            return (
              <ReceiptSlipInfoLabelValueRow
                key={`${row.label}-${index}`}
                label={row.label}
                value={row.value}
              />
            )
          case "divider":
            return (
              <div key={`divider-${index}`} className="receipt-setup-mono-body">
                <TicketSetupDivider />
              </div>
            )
          case "blank":
            return <div key={`blank-${index}`} className="h-1" aria-hidden />
          default: {
            const _exhaustive: never = row
            return _exhaustive
          }
        }
      })}
    </div>
  )
}

export function ReceiptSlipRefStaffBlock({
  refLine,
  dateLine,
  staffLabel,
  staffValue,
  fontSizePx,
  bold = true,
}: ReceiptSlipRefStaffBlockProps) {
  const infoStyle = {
    ...receiptSlipFullWidthStyle,
    ...(fontSizePx != null
      ? { fontSize: `${fontSizePx}px`, fontWeight: bold ? 700 : 400 }
      : {}),
  }

  return (
    <div
      className={`${RECEIPT_SLIP_PROPORTIONAL_CLASS} receipt-slip-ref-staff w-full space-y-0.5 leading-tight`}
      style={infoStyle}
      data-testid="receipt-slip-ref-staff"
    >
      <div className="receipt-slip-ref-staff-row flex w-full items-baseline justify-between gap-1">
        <span className="min-w-0 shrink text-left">{refLine}</span>
        <span className="shrink-0 text-right tabular-nums">{dateLine}</span>
      </div>
      {staffValue ? (
        <div className="receipt-slip-ref-staff-row flex w-full items-baseline justify-between gap-1">
          <span className="shrink-0 text-left">{staffLabel}</span>
          <span className="min-w-0 truncate text-right">{staffValue}</span>
        </div>
      ) : null}
    </div>
  )
}

type ReceiptSlipTaxTitleProps = {
  line: string | null
}

export function ReceiptSlipTaxTitle({ line }: ReceiptSlipTaxTitleProps) {
  if (!line?.trim()) return null

  return (
    <div
      className={`${RECEIPT_SLIP_PROPORTIONAL_CLASS} ${RECEIPT_SLIP_TAX_TITLE_CLASS} receipt-slip-block-centered py-1 font-extrabold leading-tight`}
      style={receiptSlipFullWidthStyle}
      data-testid="receipt-slip-tax-title"
    >
      <div className="receipt-slip-block-text w-full text-center leading-tight">{line}</div>
    </div>
  )
}
