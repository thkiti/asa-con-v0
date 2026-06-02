import { messageForDocumentErrorCode, StockDocumentUiError } from "./document-errors"
import type {
  StockDocumentDetailVM,
  StockDocumentListFilter,
  StockDocumentListResultVM,
} from "./types"

type ApiErrorBody = {
  error?: string
  code?: string
}

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>
}

async function throwOnError(res: Response): Promise<void> {
  if (res.ok) return

  let message = res.statusText || "Request failed"
  let code = "REQUEST_FAILED"

  try {
    const body = (await res.json()) as ApiErrorBody
    if (body.error) message = body.error
    if (body.code) code = body.code
  } catch {
    // keep defaults
  }

  throw new StockDocumentUiError(
    messageForDocumentErrorCode(code) || message,
    code
  )
}

function buildListQuery(filter: StockDocumentListFilter): string {
  const params = new URLSearchParams()
  if (filter.branchId?.trim()) params.set("branchId", filter.branchId.trim())
  if (filter.docType) params.set("docType", filter.docType)
  if (filter.status) params.set("status", filter.status)
  if (filter.periodMonth?.trim()) params.set("periodMonth", filter.periodMonth.trim())
  if (filter.from?.trim()) params.set("from", filter.from.trim())
  if (filter.to?.trim()) params.set("to", filter.to.trim())
  if (filter.cursor) params.set("cursor", filter.cursor)
  if (filter.limit != null) params.set("limit", String(filter.limit))
  const q = params.toString()
  return q ? `?${q}` : ""
}

export async function fetchStockDocumentList(
  filter: StockDocumentListFilter = {}
): Promise<StockDocumentListResultVM> {
  const query = buildListQuery(filter)
  const res = await fetch(`/api/stock-document${query}`)
  await throwOnError(res)
  return parseJson<StockDocumentListResultVM>(res)
}

export async function fetchStockDocumentDetail(
  documentId: string
): Promise<StockDocumentDetailVM> {
  const id = String(documentId ?? "").trim()
  const res = await fetch(`/api/stock-document/${encodeURIComponent(id)}`)
  await throwOnError(res)
  return parseJson<StockDocumentDetailVM>(res)
}
