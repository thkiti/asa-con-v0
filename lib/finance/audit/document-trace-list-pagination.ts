export const DOCUMENT_TRACE_LIST_DEFAULT_LIMIT = 30
export const DOCUMENT_TRACE_LIST_MAX_LIMIT = 100

export type DocumentTraceListPagination = {
  limit: number
  offset: number
}

export function parseDocumentTraceListLimit(raw: string | number | null | undefined): number {
  const value = typeof raw === "number" ? raw : Number(String(raw ?? "").trim())
  if (!Number.isFinite(value) || value < 1) {
    return DOCUMENT_TRACE_LIST_DEFAULT_LIMIT
  }
  return Math.min(Math.floor(value), DOCUMENT_TRACE_LIST_MAX_LIMIT)
}

export function parseDocumentTraceListOffset(raw: string | number | null | undefined): number {
  const value = typeof raw === "number" ? raw : Number(String(raw ?? "").trim())
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }
  return Math.floor(value)
}

export function resolveDocumentTraceListPagination(input?: {
  limit?: number
  offset?: number
}): DocumentTraceListPagination {
  return {
    limit: parseDocumentTraceListLimit(input?.limit ?? null),
    offset: parseDocumentTraceListOffset(input?.offset ?? null),
  }
}

export function buildDocumentTraceListPageMeta(input: {
  limit: number
  offset: number
  fetchedCount: number
  totalCount: number | null
}): {
  hasMore: boolean
  nextOffset: number | null
  totalCount: number | null
} {
  const hasMore = input.fetchedCount > input.limit
  return {
    hasMore,
    nextOffset: hasMore ? input.offset + input.limit : null,
    totalCount: input.totalCount,
  }
}

export function formatDocumentTraceListCountLabel(
  visibleCount: number,
  totalCount: number | null
): string {
  if (totalCount !== null && totalCount > visibleCount) {
    return `Showing ${visibleCount} of ${totalCount} documents`
  }
  if (totalCount !== null) {
    return `Showing ${visibleCount} document${visibleCount === 1 ? "" : "s"}`
  }
  return `Showing first ${visibleCount} document${visibleCount === 1 ? "" : "s"}`
}

export function formatDocumentTraceListLimitedHelper(visibleCount: number): string {
  return `Showing first ${visibleCount} documents. Use filters or Load more to narrow results.`
}
