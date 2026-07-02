import {
  VOUCHER_INQUIRY_MJV_REF_TYPES,
  VOUCHER_INQUIRY_OPB_REF_TYPES,
} from "@/lib/finance/inquiry/voucher-document-types"
import {
  buildFinanceDocumentTypeSelectItems,
  FINANCE_DOCUMENT_TYPE_CODES,
  formatFinanceDocumentTypeLabel,
  listFinanceDocumentTypeOptions,
  type FinanceDocumentTypeCode,
} from "@/lib/finance/document-types"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { formatEntityShort } from "@/lib/legal-entity/display"

/** Primary list-first document types shown in the main dropdown. */
export const DOCUMENT_TRACE_MAIN_DOC_TYPES = FINANCE_DOCUMENT_TYPE_CODES

export type DocumentTraceMainDocType = FinanceDocumentTypeCode

/** Full voucher-number search only — listed at the bottom of the dropdown. */
export const DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE = "VOUCHER" as const

export const DOCUMENT_TRACE_DOC_TYPES = [
  ...DOCUMENT_TRACE_MAIN_DOC_TYPES,
  DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE,
] as const

export type DocumentTraceDocType =
  | DocumentTraceMainDocType
  | typeof DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE

export type DocumentTraceFilters = {
  legalEntityCode: DocumentEntityCode
  docType: DocumentTraceDocType | ""
  branchCode: string
  period: string
  dateFrom: string
  dateTo: string
}

const POS_SHOP_DOC_TYPES = new Set<DocumentTraceDocType>(["REC", "REF"])
const STOCK_DOC_TYPES = new Set<DocumentTraceDocType>([
  "CNT",
  "ADJ",
  "ORD",
  "DEY",
  "ORS",
  "ORI",
])
const FINANCE_ENTRY_DOC_TYPES = new Set<DocumentTraceDocType>([
  "MJV",
  "PAV",
  "REV",
  "PCV",
  "OPB",
])
const ASAD_BLOCKED_DOC_TYPES = new Set<DocumentTraceDocType>(["REC", "REF", "PAY"])

const FULL_DOCUMENT_NUMBER_PATTERNS = [
  /^REC-[A-Z0-9]+-\d{6}-\d+$/i,
  /^REF-[A-Z0-9]+-\d{6}-\d+$/i,
  /^COL-[A-Z0-9]+-\d{6}-\d+$/i,
  /^V-\d{4}-\d{2}-\d+$/i,
  /^(MJV|PAV|REV|PCV|OPB)-\d+$/i,
  /^(CNT|ADJ|ORD|DEY|ORS|ORI|TRO|TRI|PUR|ADJ)-[A-Z0-9]+-\d{6}-\d+$/i,
] as const

const DOC_TYPE_LABELS: Partial<Record<DocumentTraceDocType, string>> = {
  VOUCHER: "Voucher No.",
}

export function currentDocumentTracePeriodKey(at: Date = new Date()): string {
  const year = at.getFullYear()
  const month = String(at.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export function createDefaultDocumentTraceFilters(
  legalEntityCode: DocumentEntityCode,
  periodKey: string = ""
): DocumentTraceFilters {
  return {
    legalEntityCode,
    docType: "",
    branchCode: "",
    period: periodKey,
    dateFrom: "",
    dateTo: "",
  }
}

export function formatDocumentTraceDocTypeLabel(docType: DocumentTraceDocType): string {
  return DOC_TYPE_LABELS[docType] ?? formatFinanceDocumentTypeLabel(docType)
}

export function isDocumentTraceDocTypeAllowed(
  docType: DocumentTraceDocType,
  legalEntityCode: DocumentEntityCode
): boolean {
  if (legalEntityCode === "AD") {
    return !ASAD_BLOCKED_DOC_TYPES.has(docType)
  }
  return true
}

export type DocumentTraceDocTypeSelectItem =
  | { kind: "group"; label: string }
  | { kind: "option"; value: DocumentTraceDocType; label: string }

export function listDocumentTraceDocTypeOptions(
  legalEntityCode: DocumentEntityCode
): Array<{ value: DocumentTraceDocType; label: string }> {
  const main: Array<{ value: DocumentTraceDocType; label: string }> =
    listFinanceDocumentTypeOptions({
    allowedValues: new Set(
      DOCUMENT_TRACE_MAIN_DOC_TYPES.filter((docType) =>
        isDocumentTraceDocTypeAllowed(docType, legalEntityCode)
      )
    ),
    }).map((option) => ({
      value: option.value,
      label: option.label,
    }))

  if (isDocumentTraceDocTypeAllowed(DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE, legalEntityCode)) {
    main.push({
      value: DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE,
      label: formatDocumentTraceDocTypeLabel(DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE),
    })
  }

  return main
}

export function listDocumentTraceDocTypeSelectOptions(
  legalEntityCode: DocumentEntityCode
): DocumentTraceDocTypeSelectItem[] {
  const items: DocumentTraceDocTypeSelectItem[] = buildFinanceDocumentTypeSelectItems(
    listFinanceDocumentTypeOptions({
      allowedValues: new Set(
        DOCUMENT_TRACE_MAIN_DOC_TYPES.filter((docType) =>
          isDocumentTraceDocTypeAllowed(docType, legalEntityCode)
        )
      ),
    })
  ).map((item) =>
    item.kind === "group"
      ? { kind: "group", label: item.label }
      : { kind: "option", value: item.value, label: item.label }
  )

  if (isDocumentTraceDocTypeAllowed(DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE, legalEntityCode)) {
    items.push({
      kind: "option",
      value: DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE,
      label: formatDocumentTraceDocTypeLabel(DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE),
    })
  }

  return items
}

export function isDocumentTraceVoucherSearchOnly(
  docType: DocumentTraceDocType | ""
): boolean {
  return docType === DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE
}

export function requiresDocumentTraceShop(docType: DocumentTraceDocType | ""): boolean {
  if (!docType) return false
  return POS_SHOP_DOC_TYPES.has(docType) || STOCK_DOC_TYPES.has(docType)
}

export function shouldApplyDocumentTraceBranchFilter(
  docType: DocumentTraceDocType | ""
): boolean {
  return requiresDocumentTraceShop(docType)
}

export function showDocumentTraceShopOnMainRow(
  legalEntityCode: DocumentEntityCode,
  _docType?: DocumentTraceDocType | ""
): boolean {
  return legalEntityCode === "AS"
}

export function resolveDocumentTraceListBranchCode(
  filters: DocumentTraceFilters
): string {
  if (!shouldApplyDocumentTraceBranchFilter(filters.docType)) {
    return ""
  }
  return filters.branchCode.trim()
}

export function showDocumentTraceShopInMoreFilter(
  legalEntityCode: DocumentEntityCode,
  docType: DocumentTraceDocType | ""
): boolean {
  if (showDocumentTraceShopOnMainRow(legalEntityCode, docType)) {
    return false
  }
  if (legalEntityCode === "AD" && requiresDocumentTraceShop(docType)) {
    return true
  }
  return false
}

export function requiresDocumentTracePeriod(docType: DocumentTraceDocType | ""): boolean {
  if (!docType) return false
  if (docType === DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE) return false
  return (
    POS_SHOP_DOC_TYPES.has(docType) ||
    STOCK_DOC_TYPES.has(docType) ||
    FINANCE_ENTRY_DOC_TYPES.has(docType) ||
    docType === "PAY"
  )
}

export function getDocumentTraceShopFieldState(legalEntityCode: DocumentEntityCode): {
  mode: "select" | "locked"
  label: string
} {
  if (legalEntityCode === "AD") {
    return { mode: "locked", label: formatEntityShort("AD") }
  }
  return { mode: "select", label: "Shop" }
}

export function isFullDocumentTraceNumber(raw: string): boolean {
  const value = raw.trim()
  if (!value) return false
  return FULL_DOCUMENT_NUMBER_PATTERNS.some((pattern) => pattern.test(value))
}

export function parseDocumentTracePeriodRange(
  period: string
): { from: Date; to: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59, 999)
  return { from, to }
}

export function parseDocumentTraceFilterDate(raw: string): Date | undefined {
  const value = raw.trim()
  if (!value) return undefined

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function endOfDocumentTraceFilterDay(date: Date): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

export function resolveDocumentTraceListDateRange(
  filters: Pick<DocumentTraceFilters, "period" | "dateFrom" | "dateTo">
): { from: Date; to: Date } | null {
  const periodRange = parseDocumentTracePeriodRange(filters.period)
  if (!periodRange) return null

  const dateFrom = parseDocumentTraceFilterDate(filters.dateFrom)
  const dateTo = parseDocumentTraceFilterDate(filters.dateTo)

  if (!dateFrom && !dateTo) {
    return periodRange
  }

  const from = dateFrom ?? periodRange.from
  const to = dateTo ? endOfDocumentTraceFilterDay(dateTo) : periodRange.to

  return {
    from: from < periodRange.from ? periodRange.from : from,
    to: to > periodRange.to ? periodRange.to : to,
  }
}

export function isDocumentTraceMoreFilterActive(filters: DocumentTraceFilters): boolean {
  const branchCountsAsMoreFilter =
    showDocumentTraceShopInMoreFilter(filters.legalEntityCode, filters.docType) &&
    filters.branchCode.trim()

  return Boolean(
    branchCountsAsMoreFilter || filters.dateFrom.trim() || filters.dateTo.trim()
  )
}

export function isDocumentTracePeriodValid(period: string): boolean {
  return parseDocumentTracePeriodRange(period) !== null
}

export function canListDocumentTraceDocuments(filters: DocumentTraceFilters): boolean {
  const docType = filters.docType
  if (!docType || isDocumentTraceVoucherSearchOnly(docType)) return false
  if (!isDocumentTraceDocTypeAllowed(docType, filters.legalEntityCode)) return false
  if (!isDocumentTracePeriodValid(filters.period)) return false
  return true
}

export function buildDocumentTraceListFetchKey(
  filters: DocumentTraceFilters
): string | null {
  if (!canListDocumentTraceDocuments(filters)) {
    return null
  }

  return [
    filters.docType,
    filters.period.trim(),
    resolveDocumentTraceListBranchCode(filters),
    filters.dateFrom.trim(),
    filters.dateTo.trim(),
  ].join("|")
}

export function areDocumentTraceFiltersEqual(
  left: DocumentTraceFilters,
  right: DocumentTraceFilters
): boolean {
  return (
    left.legalEntityCode === right.legalEntityCode &&
    left.docType === right.docType &&
    left.branchCode === right.branchCode &&
    left.period === right.period &&
    left.dateFrom === right.dateFrom &&
    left.dateTo === right.dateTo
  )
}

export function canRunDocumentTraceList(filters: DocumentTraceFilters): boolean {
  return canListDocumentTraceDocuments(filters)
}

export function canDocumentTraceSearch(filters: DocumentTraceFilters): boolean {
  return canListDocumentTraceDocuments(filters)
}

export function resolveDocumentTraceSearchError(filters: DocumentTraceFilters): string | null {
  if (!filters.docType) {
    return "Select a document type."
  }
  if (!isDocumentTraceDocTypeAllowed(filters.docType, filters.legalEntityCode)) {
    return `${filters.docType} is not available for ${formatEntityShort(filters.legalEntityCode)}.`
  }
  if (isDocumentTraceVoucherSearchOnly(filters.docType)) {
    return "Select a document type to list, then trace from the results."
  }
  if (!isDocumentTracePeriodValid(filters.period)) {
    return "Period must use YYYY-MM format."
  }
  return null
}

export function resolveDocumentTraceRefTypes(
  docType: DocumentTraceMainDocType
): string[] | null {
  switch (docType) {
    case "MJV":
      return [...VOUCHER_INQUIRY_MJV_REF_TYPES]
    case "OPB":
      return [...VOUCHER_INQUIRY_OPB_REF_TYPES]
    case "PAV":
      return [FINANCE_REF_TYPES.PAYMENT_VOUCHER]
    case "REV":
      return [FINANCE_REF_TYPES.REVENUE_VOUCHER]
    case "PCV":
      return [FINANCE_REF_TYPES.PETTY_CASH_VOUCHER]
    case "PAY":
      return [
        FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
        FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
      ]
    default:
      return null
  }
}
