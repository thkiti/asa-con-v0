import type { DocumentTraceListResult } from "@/lib/finance/audit/document-trace-list"
import { DOCUMENT_TRACE_LIST_DEFAULT_LIMIT } from "@/lib/finance/audit/document-trace-list-pagination"
import type { TraceResult } from "@/lib/finance/audit/document-trace"
import {
  resolveDocumentTraceListBranchCode,
  type DocumentTraceFilters,
} from "@/lib/finance/audit/document-trace-filters"

export type DocumentTraceApiResult = TraceResult

export type DocumentTraceListApiResult = DocumentTraceListResult

export type DocumentTraceListRequest = {
  limit?: number
  offset?: number
}

export async function fetchDocumentTrace(query: string): Promise<DocumentTraceApiResult> {
  const trimmed = query.trim()
  if (!trimmed) {
    return {
      root: null,
      nodes: [],
      edges: [],
      warnings: ["Enter a document number to trace."],
    }
  }

  const params = new URLSearchParams({ query: trimmed })
  const response = await fetch(`/api/finance/audit/document-trace?${params.toString()}`, {
    cache: "no-store",
  })

  const payload = (await response.json()) as DocumentTraceApiResult & { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? "Document trace request failed")
  }

  return payload
}

function buildDocumentTraceListQuery(
  filters: DocumentTraceFilters,
  request: DocumentTraceListRequest = {}
): string {
  const params = new URLSearchParams()
  if (filters.docType) params.set("docType", filters.docType)
  if (filters.period.trim()) params.set("period", filters.period.trim())
  const branchCode = resolveDocumentTraceListBranchCode(filters)
  if (branchCode) params.set("branchCode", branchCode)
  if (filters.dateFrom.trim()) params.set("dateFrom", filters.dateFrom.trim())
  if (filters.dateTo.trim()) params.set("dateTo", filters.dateTo.trim())
  params.set("limit", String(request.limit ?? DOCUMENT_TRACE_LIST_DEFAULT_LIMIT))
  if (request.offset && request.offset > 0) {
    params.set("offset", String(request.offset))
  }
  return params.toString()
}

export async function fetchDocumentTraceList(
  filters: DocumentTraceFilters,
  request: DocumentTraceListRequest = {}
): Promise<DocumentTraceListApiResult> {
  const query = buildDocumentTraceListQuery(filters, request)
  const response = await fetch(`/api/finance/audit/document-trace/list?${query}`, {
    cache: "no-store",
  })

  const payload = (await response.json()) as DocumentTraceListApiResult & { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? "Document trace list request failed")
  }

  return {
    rows: payload.rows ?? [],
    warnings: payload.warnings ?? [],
    totalCount: payload.totalCount ?? null,
    hasMore: payload.hasMore ?? false,
    nextOffset: payload.nextOffset ?? null,
  }
}
