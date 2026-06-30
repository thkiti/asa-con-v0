import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { buildOperationalVoucherEditorPath } from "@/lib/finance-ui/finance-voucher-print-path"
import type { ManualJournalEntryTypeCode } from "@/lib/finance-ui/manual-journal-entry-display"

export const FINANCE_RETURN_TO_QUERY = "returnTo"

const MANUAL_JOURNAL_ENTRY_REF_TYPES = new Set<string>([
  FINANCE_REF_TYPES.MANUAL_JOURNAL,
  FINANCE_REF_TYPES.ADJUSTMENT_JOURNAL,
  FINANCE_REF_TYPES.RECLASS_JOURNAL,
  FINANCE_REF_TYPES.ACCRUAL_JOURNAL,
  FINANCE_REF_TYPES.AUDITOR_ADJUSTMENT_JOURNAL,
])

const ENTRY_TYPE_BACK_FALLBACK: Record<ManualJournalEntryTypeCode, string> = {
  OPENING_BALANCE: "← Opening Balance",
  MANUAL: "← Journal Entry",
  ADJUSTMENT: "← Journal Entry",
  RECLASS: "← Journal Entry",
  ACCRUAL: "← Journal Entry",
  AUDITOR_ADJUSTMENT: "← Journal Entry",
}

export type FinanceDocumentBackContext = {
  returnTo?: string | null
  refType: string
  refId: string
  documentNo?: string | null
  entryType?: ManualJournalEntryTypeCode | string | null
  moduleDefaultHref: string
  moduleDefaultLabel: string
}

export type FinanceDocumentBackLink = {
  href: string
  label: string
}

/** Reject external and non-finance return targets. */
export function resolveSafeFinanceReturnTo(returnTo: unknown): string | null {
  const raw = String(returnTo ?? "").trim()
  if (!raw.startsWith("/finance") || raw.startsWith("//")) {
    return null
  }
  if (raw.includes("://")) {
    return null
  }

  const queryIndex = raw.indexOf("?")
  const pathname = queryIndex === -1 ? raw : raw.slice(0, queryIndex)
  const search = queryIndex === -1 ? "" : raw.slice(queryIndex)

  if (!pathname.startsWith("/finance")) {
    return null
  }

  return `${pathname}${search}`
}

export function buildFinanceCurrentReturnPath(pathname: string, search: string): string {
  const path = pathname.trim() || "/"
  const query = search.replace(/^\?/, "").trim()
  return query ? `${path}?${query}` : path
}

export function appendFinanceReturnTo(
  targetPath: string,
  returnTo?: string | null
): string {
  const safeReturnTo = resolveSafeFinanceReturnTo(returnTo)
  if (!safeReturnTo) {
    return targetPath
  }

  const separator = targetPath.includes("?") ? "&" : "?"
  return `${targetPath}${separator}${FINANCE_RETURN_TO_QUERY}=${encodeURIComponent(safeReturnTo)}`
}

export function buildFinanceJournalInquiryPath(
  journalEntryId: string,
  returnTo?: string | null
): string {
  return appendFinanceReturnTo(
    `/finance/journal-entries/${encodeURIComponent(journalEntryId)}`,
    returnTo
  )
}

export function buildFinanceVoucherDetailPath(
  voucherId: string,
  returnTo?: string | null
): string {
  return appendFinanceReturnTo(
    `/finance/vouchers/${encodeURIComponent(voucherId)}`,
    returnTo
  )
}

export function buildOperationalParentDocumentPath(
  refType: string,
  refId: string
): string | null {
  const id = refId.trim()
  if (!id) return null

  if (refType === FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL) {
    return `/finance/opening-balance/${encodeURIComponent(id)}`
  }

  if (MANUAL_JOURNAL_ENTRY_REF_TYPES.has(refType)) {
    return `/finance/manual-journal-entries/${encodeURIComponent(id)}`
  }

  return buildOperationalVoucherEditorPath(refType, refId)
}

function inferBackLabelFromHref(href: string): string | null {
  if (href.startsWith("/finance/opening-balance/")) {
    return "← Opening Balance"
  }
  if (href.startsWith("/finance/manual-journal-entries/")) {
    return "← Journal Entry"
  }
  if (href.startsWith("/finance/payment-vouchers/")) {
    return "← Payment Voucher"
  }
  if (href.startsWith("/finance/revenue-vouchers/")) {
    return "← Revenue Voucher"
  }
  if (href.startsWith("/finance/petty-cash-vouchers/")) {
    return "← Petty Cash Voucher"
  }
  if (href.startsWith("/finance/reports/general-ledger")) {
    return "← General Ledger"
  }
  if (href === "/finance/vouchers" || href.startsWith("/finance/vouchers?")) {
    return "← Voucher / Journal Inquiry"
  }
  if (href.startsWith("/finance/vouchers/")) {
    return "← Voucher"
  }
  if (href === "/finance/reconciliation" || href.startsWith("/finance/reconciliation/")) {
    return "← Reconciliation"
  }
  if (href === "/finance/journal-entries" || href.startsWith("/finance/journal-entries?")) {
    return "← Manual journals"
  }
  if (
    href === "/finance/pos-settlement/collector-pickup" ||
    href.startsWith("/finance/pos-settlement/collector-pickup?")
  ) {
    return "← Collector Pickup Settlement"
  }
  return null
}

export function formatFinanceDocumentBackLabel(input: {
  href: string
  documentNo?: string | null
  entryType?: ManualJournalEntryTypeCode | string | null
}): string {
  const documentNo = input.documentNo?.trim()
  if (documentNo) {
    return `← ${documentNo}`
  }

  const entryType = input.entryType
  if (
    entryType &&
    entryType in ENTRY_TYPE_BACK_FALLBACK
  ) {
    return ENTRY_TYPE_BACK_FALLBACK[entryType as ManualJournalEntryTypeCode]
  }

  return inferBackLabelFromHref(input.href) ?? "← Back"
}

export function resolveFinanceDocumentBackLink(
  context: FinanceDocumentBackContext
): FinanceDocumentBackLink {
  const documentNo = context.documentNo
  const entryType = context.entryType

  const safeReturnTo = resolveSafeFinanceReturnTo(context.returnTo)
  if (safeReturnTo) {
    return {
      href: safeReturnTo,
      label: formatFinanceDocumentBackLabel({
        href: safeReturnTo,
        documentNo,
        entryType,
      }),
    }
  }

  const parentHref = buildOperationalParentDocumentPath(context.refType, context.refId)
  if (parentHref) {
    return {
      href: parentHref,
      label: formatFinanceDocumentBackLabel({
        href: parentHref,
        documentNo,
        entryType,
      }),
    }
  }

  return {
    href: context.moduleDefaultHref,
    label: context.moduleDefaultLabel,
  }
}
