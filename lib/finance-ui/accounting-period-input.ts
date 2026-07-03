import {
  normalizeAccountingPeriodKey,
  shouldNormalizeAccountingPeriodKeyImmediately,
} from "@/lib/finance/period-key"

export const ACCOUNTING_PERIOD_INPUT_PLACEHOLDER = "202601"

export function applyAccountingPeriodInputChange(
  value: string,
  onChange: (next: string) => void
): void {
  onChange(value)
  if (shouldNormalizeAccountingPeriodKeyImmediately(value)) {
    const normalized = normalizeAccountingPeriodKey(value)
    if (normalized) {
      onChange(normalized)
    }
  }
}

export function applyAccountingPeriodInputBlur(
  value: string,
  onChange: (next: string) => void
): void {
  const normalized = normalizeAccountingPeriodKey(value)
  if (normalized) {
    onChange(normalized)
  }
}

export { resolveAccountingPeriodKeyFilter } from "@/lib/finance/period-key"
