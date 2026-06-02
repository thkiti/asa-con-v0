import { messageForDocumentErrorCode, StockDocumentUiError } from "./document-errors"
import { normalizeStockDocumentDetail } from "./fetchers"
import type { StockDocumentDetailVM } from "./types"

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

async function postWorkflow(
  documentId: string,
  action: "submit" | "confirm" | "cancel",
  body?: Record<string, unknown>
): Promise<StockDocumentDetailVM> {
  const id = String(documentId ?? "").trim()
  const init: RequestInit = { method: "POST" }
  if (body) {
    init.headers = { "Content-Type": "application/json" }
    init.body = JSON.stringify(body)
  }

  const res = await fetch(`/api/stock-document/${encodeURIComponent(id)}/${action}`, init)
  await throwOnError(res)
  const raw = await parseJson<StockDocumentDetailVM & { lines?: StockDocumentDetailVM["lines"] }>(
    res
  )
  return normalizeStockDocumentDetail(raw)
}

export async function submitStockDocument(
  documentId: string
): Promise<StockDocumentDetailVM> {
  return postWorkflow(documentId, "submit")
}

export async function confirmStockDocument(
  documentId: string,
  confirmedByStaffId: string
): Promise<StockDocumentDetailVM> {
  const staffId = String(confirmedByStaffId ?? "").trim()
  return postWorkflow(documentId, "confirm", {
    confirmedByStaffId: staffId,
    staffId,
  })
}

export async function cancelStockDocument(
  documentId: string,
  cancelledByStaffId: string,
  cancelReason?: string | null
): Promise<StockDocumentDetailVM> {
  const staffId = String(cancelledByStaffId ?? "").trim()
  return postWorkflow(documentId, "cancel", {
    cancelledByStaffId: staffId,
    staffId,
    cancelReason: cancelReason ?? null,
  })
}
