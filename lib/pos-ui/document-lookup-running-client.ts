import type { PosDocumentLookupDocType } from "@/lib/pos-ui/document-lookup-doc-types"

export type DocumentLookupRunningNumbersParams = {
  branchId: string
  docType: PosDocumentLookupDocType
  year: number
  month: number
}

export type DocumentLookupRunningNumbersResult =
  | { ok: true; runningNumbers: string[] }
  | { ok: false; error: string }

export async function fetchDocumentLookupRunningNumbers(
  params: DocumentLookupRunningNumbersParams
): Promise<DocumentLookupRunningNumbersResult> {
  const search = new URLSearchParams({
    branchId: params.branchId.trim(),
    docType: params.docType,
    year: String(params.year),
    month: String(params.month),
  })

  const res = await fetch(
    `/api/pos/document-lookup/running-numbers?${search.toString()}`
  )
  const body = (await res.json().catch(() => ({}))) as {
    error?: string
    runningNumbers?: string[]
  }

  if (!res.ok) {
    return {
      ok: false,
      error: body.error ?? "Failed to load running numbers",
    }
  }

  return { ok: true, runningNumbers: body.runningNumbers ?? [] }
}
