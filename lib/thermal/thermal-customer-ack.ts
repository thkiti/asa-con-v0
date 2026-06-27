import { repeatThermalChar, THERMAL_COLUMNS } from "./format"

/** Dotted writing lines under Phone No (~2× legacy single-line area). */
export const THERMAL_ACK_PHONE_WRITING_LINES = 2

/** Dotted writing lines under Sign (~3× legacy single-line area). */
export const THERMAL_ACK_SIGN_WRITING_LINES = 3

function appendStackedGuideAckField(
  lines: string[],
  label: string,
  blankLineCount: number,
  width: number,
  writingGuides: boolean
): void {
  lines.push(label)
  lines.push(writingGuides ? repeatThermalChar(".", width) : "")
  for (let i = 0; i < blankLineCount; i += 1) {
    lines.push("")
  }
}

function appendInlineGuideAckField(
  lines: string[],
  label: string,
  writingLineCount: number,
  width: number
): void {
  const dotCount = Math.max(3, width - label.length - 1)
  lines.push(`${label} ${repeatThermalChar(".", dotCount)}`.slice(0, width))
  for (let i = 0; i < writingLineCount; i += 1) {
    lines.push("")
  }
}

export type ThermalCustomerAckOptions = {
  /** Dotted writing guide lines; false keeps blank line height only. */
  writingGuides?: boolean
  phoneLabel?: string
  signLabel?: string
  /** When false, omit the dashed rule before the acknowledgement block. */
  leadingDivider?: boolean
  /** Blank line before Phone No (after footer). */
  leadingBlank?: boolean
  /** Label and dotted guide on one row; blank writing area below. */
  inlineGuides?: boolean
  /** Label row, one dotted guide, then blank writing area (refund ticket). */
  stackedGuides?: boolean
  /** Full-width dotted line after Sign blank area (paper cut guide). */
  cutLine?: boolean
  /** Dashed separator immediately before paper cut (refund ticket). */
  cutSeparator?: boolean
}

export function appendThermalCustomerAcknowledgement(
  lines: string[],
  width: number = THERMAL_COLUMNS,
  options?: ThermalCustomerAckOptions
): void {
  const writingGuides = options?.writingGuides !== false
  const phoneLabel = options?.phoneLabel ?? "Phone No"
  const signLabel = options?.signLabel ?? "Sign"

  if (options?.leadingDivider !== false) {
    lines.push(repeatThermalChar("-", width))
    lines.push("")
  }

  if (options?.leadingBlank === true) {
    lines.push("")
  }

  if (options?.stackedGuides === true) {
    appendStackedGuideAckField(
      lines,
      phoneLabel,
      THERMAL_ACK_PHONE_WRITING_LINES,
      width,
      writingGuides
    )
    lines.push("")
    appendStackedGuideAckField(
      lines,
      signLabel,
      THERMAL_ACK_SIGN_WRITING_LINES,
      width,
      writingGuides
    )
    if (options.cutSeparator === true) {
      lines.push("")
      lines.push(repeatThermalChar("-", width))
    } else if (options.cutLine === true && writingGuides) {
      lines.push(repeatThermalChar(".", width))
    }
    return
  }

  if (options?.inlineGuides === true) {
    appendInlineGuideAckField(lines, phoneLabel, THERMAL_ACK_PHONE_WRITING_LINES, width)
    lines.push("")
    appendInlineGuideAckField(lines, signLabel, THERMAL_ACK_SIGN_WRITING_LINES, width)
    if (options.cutSeparator === true) {
      lines.push("")
      lines.push(repeatThermalChar("-", width))
    } else if (options.cutLine === true && writingGuides) {
      lines.push(repeatThermalChar(".", width))
    }
    return
  }

  lines.push(phoneLabel)
  lines.push("")
  for (let i = 0; i < THERMAL_ACK_PHONE_WRITING_LINES; i += 1) {
    lines.push(writingGuides ? repeatThermalChar(".", width) : "")
  }
  lines.push("")
  lines.push(signLabel)
  lines.push("")
  for (let i = 0; i < THERMAL_ACK_SIGN_WRITING_LINES; i += 1) {
    lines.push(writingGuides ? repeatThermalChar(".", width) : "")
  }
}

export function buildThermalCustomerAcknowledgementText(
  width: number = THERMAL_COLUMNS,
  options?: ThermalCustomerAckOptions
): string {
  const lines: string[] = []
  appendThermalCustomerAcknowledgement(lines, width, options)
  return lines.join("\n")
}
