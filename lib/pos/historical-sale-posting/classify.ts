import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { toMoney, ZERO } from "@/lib/finance/decimal"
import type {
  HistoricalPostingSkipReason,
} from "./types"

export type HistoricalSaleCandidateInput = {
  saleId: string
  total: Parameters<typeof toMoney>[0]
  createdAt: Date
  receiptCount: number
  receiptNo?: string | null
  hasPayment: boolean
  existingVoucher?: {
    refType: string
    refId: string
    refNo?: string | null
    hasJournal: boolean
  } | null
  periodStatus?: AccountingPeriodStatus | "MISSING"
}

export function classifyHistoricalSaleCandidate(
  input: HistoricalSaleCandidateInput
): HistoricalPostingSkipReason | null {
  if (input.existingVoucher?.hasJournal) {
    return "ALREADY_POSTED"
  }

  if (input.existingVoucher && !input.existingVoucher.hasJournal) {
    return "INCOMPLETE_VOUCHER"
  }

  if (input.receiptCount === 0) {
    return "NO_RECEIPT"
  }

  if (input.receiptCount > 1) {
    return "MULTIPLE_RECEIPTS"
  }

  if (!input.hasPayment) {
    return "MISSING_PAYMENT"
  }

  if (toMoney(input.total).lte(ZERO)) {
    return "MISSING_POSTING_DATA"
  }

  if (input.periodStatus === "MISSING") {
    return "PERIOD_NOT_OPENED"
  }

  if (input.periodStatus && input.periodStatus !== AccountingPeriodStatus.OPEN) {
    return "PERIOD_CLOSED"
  }

  if (!input.receiptNo) {
    return "NO_RECEIPT"
  }

  return null
}

export function isHistoricalSaleAlreadyPosted(input: {
  existingVoucher?: {
    refType: string
    refId: string
    hasJournal: boolean
  } | null
}): boolean {
  return Boolean(
    input.existingVoucher?.refType === FINANCE_REF_TYPES.POS_SALE &&
      input.existingVoucher.hasJournal
  )
}

export function createEmptySkipCounts(): Record<HistoricalPostingSkipReason, number> & {
  total: number
} {
  return {
    ALREADY_POSTED: 0,
    NO_RECEIPT: 0,
    MULTIPLE_RECEIPTS: 0,
    MISSING_PAYMENT: 0,
    MISSING_POSTING_DATA: 0,
    PERIOD_CLOSED: 0,
    PERIOD_NOT_OPENED: 0,
    INCOMPLETE_VOUCHER: 0,
    total: 0,
  }
}

export function incrementSkipCount(
  counts: ReturnType<typeof createEmptySkipCounts>,
  reason: HistoricalPostingSkipReason
): void {
  counts[reason] += 1
  counts.total += 1
}

export function isInstantInHistoricalRange(
  instant: Date,
  from: Date,
  before: Date
): boolean {
  const t = instant.getTime()
  return t >= from.getTime() && t < before.getTime()
}

export function isBeforeHistoricalJuneCutoff(instant: Date, before: Date): boolean {
  return instant.getTime() < before.getTime()
}

export function assertHistoricalRangeBeforeJune(before: Date): void {
  const juneCutoff = new Date("2026-06-01T00:00:00+07:00")
  if (!(before.getTime() <= juneCutoff.getTime())) {
    throw new Error("Historical POS posting is limited to dates before 2026-06-01")
  }
}
