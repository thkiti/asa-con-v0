import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { normalizeAccountingPeriodKey } from "@/lib/finance/period-key"
import {
  DOCUMENT_TRACE_DOC_TYPES,
  createDefaultDocumentTraceFilters,
  isDocumentTraceDocTypeAllowed,
  type DocumentTraceDocType,
  type DocumentTraceFilters,
} from "@/lib/finance/audit/document-trace-filters"

export type { DocumentTraceDocType, DocumentTraceFilters }

function parseDocumentTraceDocType(
  raw: string,
  legalEntityCode: DocumentEntityCode
): DocumentTraceDocType | "" {
  const docType = raw.trim().toUpperCase()
  if (!docType) return ""

  if (!(DOCUMENT_TRACE_DOC_TYPES as readonly string[]).includes(docType)) {
    return ""
  }

  const typed = docType as DocumentTraceDocType
  return isDocumentTraceDocTypeAllowed(typed, legalEntityCode) ? typed : ""
}

export function parseDocumentTraceFiltersFromSearchParams(
  params: URLSearchParams,
  legalEntityCode: DocumentEntityCode
): DocumentTraceFilters {
  const defaults = createDefaultDocumentTraceFilters(legalEntityCode)

  return {
    legalEntityCode,
    docType: parseDocumentTraceDocType(params.get("docType") ?? "", legalEntityCode),
    branchCode: params.get("branch")?.trim() ?? defaults.branchCode,
    period:
      normalizeAccountingPeriodKey(params.get("period") ?? "") ??
      params.get("period")?.trim() ??
      defaults.period,
    dateFrom:
      params.get("dateFrom")?.trim() ?? params.get("from")?.trim() ?? defaults.dateFrom,
    dateTo: params.get("dateTo")?.trim() ?? params.get("to")?.trim() ?? defaults.dateTo,
  }
}

export function buildDocumentTraceSearchParams(
  filters: DocumentTraceFilters,
  query?: string | null
): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.docType) {
    params.set("docType", filters.docType)
  }
  if (filters.branchCode.trim()) {
    params.set("branch", filters.branchCode.trim())
  }
  if (filters.period.trim()) {
    const normalized =
      normalizeAccountingPeriodKey(filters.period) ?? filters.period.trim()
    params.set("period", normalized)
  }
  if (filters.dateFrom.trim()) {
    params.set("dateFrom", filters.dateFrom.trim())
  }
  if (filters.dateTo.trim()) {
    params.set("dateTo", filters.dateTo.trim())
  }

  const resolvedQuery = query?.trim()
  if (resolvedQuery) {
    params.set("query", resolvedQuery)
  }

  return params
}

export function buildDocumentTraceReturnPath(filters: DocumentTraceFilters): string {
  const params = buildDocumentTraceSearchParams(filters).toString()
  return params
    ? `/finance/audit/document-trace?${params}`
    : "/finance/audit/document-trace"
}

export function clearDocumentTraceFilters(
  legalEntityCode: DocumentEntityCode
): DocumentTraceFilters {
  return createDefaultDocumentTraceFilters(legalEntityCode)
}
