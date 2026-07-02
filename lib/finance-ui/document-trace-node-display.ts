import { formatFinanceListDate } from "@/lib/finance-ui/format"

export function formatTraceNodeStatus(status: string): string {
  const normalized = status.trim()
  if (!normalized) return "—"

  return normalized
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function formatTraceNodeDate(value: string | null): string | null {
  if (!value) return null

  const formatted = formatFinanceListDate(value)
  if (formatted === "—") return null

  return formatted.replace(/\//g, ".")
}
