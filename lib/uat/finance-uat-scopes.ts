import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

/** Finance setup / manual workflow GL sources (safe UAT reset default). */
export const FINANCE_UAT_MANUAL_REF_TYPES: string[] = [
  FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
  FINANCE_REF_TYPES.MANUAL_JOURNAL,
  FINANCE_REF_TYPES.MANUAL_JOURNAL_REVERSAL,
  FINANCE_REF_TYPES.ADJUSTMENT_JOURNAL,
  FINANCE_REF_TYPES.RECLASS_JOURNAL,
  FINANCE_REF_TYPES.ACCRUAL_JOURNAL,
  FINANCE_REF_TYPES.AUDITOR_ADJUSTMENT_JOURNAL,
  FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY,
]

/** Operational GL from POS / stock — NOT removed unless scope=all-gl. */
export const FINANCE_UAT_OPERATIONAL_REF_TYPES: string[] = [
  FINANCE_REF_TYPES.POS_SALE,
  FINANCE_REF_TYPES.POS_REFUND,
  FINANCE_REF_TYPES.STOCK_DOC_POST,
]

export type FinanceUatResetScope = "manual-only" | "all-gl"

export function refTypesForScope(scope: FinanceUatResetScope): string[] {
  if (scope === "all-gl") {
    return [...FINANCE_UAT_MANUAL_REF_TYPES, ...FINANCE_UAT_OPERATIONAL_REF_TYPES]
  }
  return [...FINANCE_UAT_MANUAL_REF_TYPES]
}

export const FINANCE_UAT_RESET_CONFIRM_TOKEN = "FINANCE_UAT_RESET_CONFIRMED"
