import { StockDocumentUiError } from "@/lib/stock-ui/document-errors"

type GetOrCreateStockCountResponse = {
  id: string
  refNo: string
}

type ApiErrorBody = {
  error?: string
  code?: string
}

export async function openStockCountDraft(): Promise<GetOrCreateStockCountResponse> {
  const res = await fetch("/api/stock-document/get-or-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    let message = res.statusText || "Failed to open stock count"
    let code = "REQUEST_FAILED"
    try {
      const body = (await res.json()) as ApiErrorBody
      if (body.error) message = body.error
      if (body.code) code = body.code
    } catch {
      // keep defaults
    }
    throw new StockDocumentUiError(message, code)
  }

  return res.json() as Promise<GetOrCreateStockCountResponse>
}
