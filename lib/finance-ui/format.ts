export function formatAmount(value: string): string {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
