import { RECEIPT_SETUP_PREVIEW_MONO_COLUMNS } from "@/lib/admin/receipt-setup-preview"

export type TicketSetupTextPreviewLine =
  | { kind: "blank" }
  | { kind: "dashed-divider" }
  | { kind: "dotted-divider" }
  | { kind: "mono-amount"; left: string; right: string }
  | { kind: "mono-text"; text: string }
  | { kind: "proportional-centered"; text: string }
  | { kind: "proportional"; text: string }
  | { kind: "proportional-label-value"; label: string; value: string; stacked: boolean }

const MONEY_RE = /^-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/
const INTEGER_RE = /^\d+$/

function isRepeatedCharLine(line: string, char: string): boolean {
  const trimmed = line.trim()
  return trimmed.length >= 3 && [...trimmed].every((c) => c === char)
}

function parseSpacedColumns(line: string): { left: string; right: string } | null {
  const match = line.match(/^(.+?)\s{2,}(\S+)\s*$/)
  if (!match) return null
  return { left: match[1].trim(), right: match[2].trim() }
}

function looksLikeAmount(value: string): boolean {
  return MONEY_RE.test(value) || INTEGER_RE.test(value)
}

function looksLikeDetailRow(left: string, right: string): boolean {
  if (!looksLikeAmount(right)) return false
  if (left.includes("=")) return true
  const qtyAmount = right.match(/^(\d+)\s+(\S+)$/)
  if (qtyAmount && looksLikeAmount(qtyAmount[2])) return true
  return false
}

function shouldStackLabelValue(label: string, value: string): boolean {
  return value.length > RECEIPT_SETUP_PREVIEW_MONO_COLUMNS - label.length - 1
}

function classifyLine(line: string): TicketSetupTextPreviewLine {
  if (!line.trim()) return { kind: "blank" }
  if (isRepeatedCharLine(line, "-")) return { kind: "dashed-divider" }
  if (isRepeatedCharLine(line, ".")) return { kind: "dotted-divider" }

  const columns = parseSpacedColumns(line)
  if (columns) {
    const { left, right } = columns
    if (looksLikeDetailRow(left, right)) {
      const detail = right.match(/^(\d+)\s+(\S+)$/)
      if (detail) {
        return { kind: "mono-amount", left, right: detail[2] }
      }
      return { kind: "mono-amount", left, right }
    }
    if (looksLikeAmount(right)) {
      return { kind: "mono-amount", left, right }
    }
    return {
      kind: "proportional-label-value",
      label: left,
      value: right,
      stacked: shouldStackLabelValue(left, right),
    }
  }

  const trimmed = line.trim()
  if (trimmed.length <= RECEIPT_SETUP_PREVIEW_MONO_COLUMNS && trimmed === line.trim()) {
    const centeredCandidate =
      line.length === trimmed.length &&
      (line.startsWith(" ") || trimmed.length < RECEIPT_SETUP_PREVIEW_MONO_COLUMNS - 4)
    if (centeredCandidate && !line.includes("  ")) {
      return { kind: "proportional-centered", text: trimmed }
    }
  }

  if (line.includes("=") || /^\d+\.\s/.test(line)) {
    return { kind: "mono-text", text: line.trim() }
  }

  return { kind: "proportional", text: line.trim() }
}

export function parseTicketSetupTextPreviewLines(text: string): TicketSetupTextPreviewLine[] {
  return text.split("\n").map(classifyLine)
}
