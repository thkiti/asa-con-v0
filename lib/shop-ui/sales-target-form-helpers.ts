/**
 * Sales-target form helpers — re-exports compact primitives + target-specific logic.
 * Prefer @/lib/shop-ui/compact-form-helpers for new shop forms.
 */

export {
  compactHeaderControlClass as salesTargetHeaderControlClass,
  compactHeaderFieldClass as salesTargetHeaderFieldClass,
  compactHeaderRowGridClass,
  compactNumericInputClass as salesTargetNumericInputClass,
  editableFinancialValue,
  focusNextFieldInSequence as focusNextWeekPatternField,
  formatFinancialCellValue as formatDailyTargetAmount,
  formatFinancialNumber,
  handleEnterFocusNext as handleTargetEnterKey,
  handleEnterFocusNextInSequence as handleWeekPatternEnterKey,
  isAllowedDecimalDraft as isAllowedWeightDraft,
  isAllowedFinancialDraft,
  isIncompleteDecimalDraft,
  normalizeFinancialForApi,
  parseFinancialInput,
  selectAllOnFocus,
} from "@/lib/shop-ui/compact-form-helpers"

import { isIncompleteDecimalDraft } from "@/lib/shop-ui/compact-form-helpers"

export function normalizeWeightDraft(raw: string): number | null {
  const t = raw.trim()
  if (isIncompleteDecimalDraft(t)) return null
  if (t === "") return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function formatWeightDraft(n: number): string {
  if (!Number.isFinite(n)) return "0"
  return String(n)
}

export function weightNumbersToDrafts(values: number[]): string[] {
  return values.map((n) => formatWeightDraft(n))
}

export function draftsToWeightPattern(
  drafts: string[],
  fallback: number[]
): { pattern: number[]; invalidIndexes: number[] } {
  const invalidIndexes: number[] = []
  const pattern = drafts.map((draft, i) => {
    const n = normalizeWeightDraft(draft)
    if (n === null) {
      invalidIndexes.push(i)
      return fallback[i] ?? 1
    }
    return n
  })
  return { pattern, invalidIndexes }
}

/** Pattern sum — max one decimal place; hide trailing .0 */
export function formatPatternSum(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Math.round(value * 10) / 10
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return String(Math.round(rounded))
  }
  return rounded.toFixed(1)
}

/** @deprecated use normalizeWeightDraft */
export function parseWeekPatternInput(raw: string): number {
  return normalizeWeightDraft(raw) ?? 0
}
