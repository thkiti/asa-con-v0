import { THERMAL_COLUMNS, padThermalLine, repeatThermalChar } from "./format"

export type ThermalSlipInfoLabelValueRow = {
  kind: "label-value"
  label: string
  value: string
}

export type ThermalSlipInfoDividerRow = {
  kind: "divider"
}

export type ThermalSlipInfoBlankRow = {
  kind: "blank"
}

export type ThermalSlipInfoBlockRow =
  | ThermalSlipInfoLabelValueRow
  | ThermalSlipInfoDividerRow
  | ThermalSlipInfoBlankRow

function serializeLabelValueRow(label: string, value: string, width: number): string[] {
  const trimmed = value.trim()
  if (!trimmed) {
    return [label.slice(0, width)]
  }

  if (trimmed.length <= width - label.length - 1) {
    return [padThermalLine(label, trimmed, width)]
  }

  return [label, trimmed.length > width ? trimmed.slice(0, width) : trimmed]
}

/** Plain-text serialization — mirrors ReceiptSlipInfoBlock flex rows. */
export function serializeInfoBlockPlainText(
  rows: ThermalSlipInfoBlockRow[],
  width: number = THERMAL_COLUMNS
): string {
  const lines: string[] = []

  for (const row of rows) {
    switch (row.kind) {
      case "label-value":
        lines.push(...serializeLabelValueRow(row.label, row.value, width))
        break
      case "divider":
        lines.push(repeatThermalChar("-", width))
        break
      case "blank":
        lines.push("")
        break
      default: {
        const _exhaustive: never = row
        return _exhaustive
      }
    }
  }

  return lines.join("\n")
}
