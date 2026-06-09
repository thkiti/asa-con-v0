/** Reusable compact shop form helpers — numeric entry, focus, financial formatting. */

export const compactNumericInputClass =
  "[appearance:textfield] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

/** Equal-height top-row control shell (Branch / Year / Month / Target). */
export const compactHeaderControlClass =
  "h-9 w-full rounded border border-border bg-card px-3 text-sm leading-none text-foreground"

export const compactHeaderFieldClass = `${compactHeaderControlClass} mt-0 ${compactNumericInputClass}`

/** Borderless input inside CompactFieldBox. */
export const compactEmbeddedInputClass =
  "min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-foreground tabular-nums focus:outline-none"

/** Default desktop grid: Branch | Year | Month | Target on one row. */
export const compactHeaderRowGridClass =
  "grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_4.25rem_3rem_minmax(10rem,14rem)] sm:items-center"

export function selectAllOnFocus(event: {
  currentTarget: HTMLInputElement
}): void {
  event.currentTarget.select()
}

export function focusNextFieldInSequence(
  index: number,
  refs: ReadonlyArray<HTMLElement | null>,
  terminalRef: HTMLElement | null
): void {
  if (index < refs.length - 1) {
    refs[index + 1]?.focus()
    return
  }
  terminalRef?.focus()
}

export function handleEnterFocusNext(
  event: { key: string; preventDefault: () => void },
  nextRef: HTMLElement | null
): void {
  if (event.key !== "Enter") return
  event.preventDefault()
  nextRef?.focus()
}

export function handleEnterFocusNextInSequence(
  event: { key: string; preventDefault: () => void },
  index: number,
  refs: ReadonlyArray<HTMLElement | null>,
  terminalRef: HTMLElement | null
): void {
  if (event.key !== "Enter") return
  event.preventDefault()
  focusNextFieldInSequence(index, refs, terminalRef)
}

const DECIMAL_DRAFT_RE = /^\d*\.?\d*$/
const FINANCIAL_DRAFT_RE = /^[\d,]*\.?\d*$/

export function isIncompleteDecimalDraft(raw: string): boolean {
  const t = raw.trim().replace(/,/g, "")
  return t === "" || t === "." || t.endsWith(".")
}

export function isAllowedDecimalDraft(raw: string): boolean {
  return DECIMAL_DRAFT_RE.test(raw)
}

export function isAllowedFinancialDraft(raw: string): boolean {
  return FINANCIAL_DRAFT_RE.test(raw)
}

export function parseFinancialInput(raw: string): string | null {
  const t = raw.trim().replace(/,/g, "")
  if (isIncompleteDecimalDraft(t)) return null
  if (t === "") return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return null
  if (!t.includes(".")) return String(n)
  const trimmed = t.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
  return trimmed === "" ? String(n) : trimmed
}

export function normalizeFinancialForApi(raw: string): string {
  const parsed = parseFinancialInput(raw)
  if (parsed === null) return "0"
  const n = Number(parsed)
  if (!Number.isFinite(n) || n < 0) return "0"
  return parsed
}

export function formatFinancialNumber(
  value: string | number,
  options?: { maxFractionDigits?: number }
): string {
  const maxFractionDigits = options?.maxFractionDigits ?? 2
  const normalized = String(value).replace(/,/g, "").trim()
  if (normalized === "" || normalized === ".") return ""
  const n = Number(normalized)
  if (!Number.isFinite(n)) return String(value)

  if (!normalized.includes(".")) {
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
  }

  const frac = normalized.split(".")[1] ?? ""
  const trimmedFrac = frac.replace(/0+$/, "")
  const intFormatted = Math.trunc(n).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })
  if (trimmedFrac === "") return intFormatted
  const displayFrac = trimmedFrac.slice(0, maxFractionDigits)
  return `${intFormatted}.${displayFrac}`
}

export function editableFinancialValue(displayOrDraft: string): string {
  return displayOrDraft.replace(/,/g, "")
}

/** Format cell value — financial format or em dash when zero/missing. */
export function formatFinancialCellValue(
  value: string | null | undefined
): string {
  if (value == null || value === "") return "—"
  const n = Number(String(value).replace(/,/g, ""))
  if (!Number.isFinite(n) || n === 0) return "—"
  return formatFinancialNumber(value)
}

export const SUNDAY_FIRST_WEEKDAY_HEADERS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const
