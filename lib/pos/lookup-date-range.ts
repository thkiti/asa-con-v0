import { ReceiptLookupError, ReceiptLookupErrorCodes } from "@/lib/pos/receipt-lookup-errors"

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseBangkokDateBoundary(
  value: string,
  boundary: "start" | "end"
): Date {
  const trimmed = value.trim()
  if (!DATE_ONLY_PATTERN.test(trimmed)) {
    throw new ReceiptLookupError(
      "Invalid date filter (use YYYY-MM-DD)",
      ReceiptLookupErrorCodes.INVALID_DATE,
      400
    )
  }
  const suffix =
    boundary === "start" ? "T00:00:00+07:00" : "T23:59:59.999+07:00"
  const date = new Date(`${trimmed}${suffix}`)
  if (Number.isNaN(date.getTime())) {
    throw new ReceiptLookupError(
      "Invalid date filter",
      ReceiptLookupErrorCodes.INVALID_DATE,
      400
    )
  }
  return date
}

export function parseLookupDateRangeFilter(input: {
  dateFrom?: string | null
  dateTo?: string | null
}): {
  gte?: Date
  lte?: Date
} {
  const fromRaw = input.dateFrom?.trim() ?? ""
  const toRaw = input.dateTo?.trim() ?? ""
  if (!fromRaw && !toRaw) return {}

  const gte = fromRaw ? parseBangkokDateBoundary(fromRaw, "start") : undefined
  const lte = toRaw ? parseBangkokDateBoundary(toRaw, "end") : undefined

  if (gte && lte && gte.getTime() > lte.getTime()) {
    throw new ReceiptLookupError(
      "dateFrom must be on or before dateTo",
      ReceiptLookupErrorCodes.INVALID_DATE_RANGE,
      400
    )
  }

  return { gte, lte }
}
