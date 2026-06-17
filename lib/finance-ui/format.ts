export function formatAmount(value: string): string {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Journal line debit/credit display — blank when zero (not 0.00). */
export function formatJournalLineSideAmount(value: string): string {
  const num = Number(String(value ?? "").trim() || "0")
  if (Number.isNaN(num) || num === 0) return ""
  return formatAmount(String(num))
}

/** Locale-aware date/time for ISO timestamps in finance UI. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getVarianceTone(
  variance: string
): "zero" | "positive" | "negative" {
  const num = Number(variance)
  if (Number.isNaN(num) || num === 0) return "zero"
  return num > 0 ? "positive" : "negative"
}

export function formatVarianceLabel(variance: string): string {
  const num = Number(variance)
  if (Number.isNaN(num)) return variance
  if (num === 0) return formatAmount("0")
  const formatted = formatAmount(String(Math.abs(num)))
  return num > 0 ? `+${formatted}` : `-${formatted}`
}
