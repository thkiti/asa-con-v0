import { messageForDocumentErrorCode, StockDocumentUiError } from "./document-errors"
import type { EndCompleteness } from "@/lib/stock/end/end-public-types"

type ApiErrorBody = {
  error?: string
  code?: string
}

export type EndLineVM = {
  id: string
  productId: string
  beginQty: number
  inQty: number
  usageQty: number
  actualQty: number
  countQty: number | null
  endingQty: number | null
  adjQty: number | null
  sellingPriceSnapshot: string | number | null
  adjAmount: string | number | null
  beginManual: boolean
  countManual: boolean
  priceIncomplete: boolean
  countIncomplete: boolean
  product: {
    id: string
    code: string
    name: string
  }
}

export type EndDocumentDetailVM = {
  id: string
  refNo: string
  docType: "END"
  status: string
  date: string
  periodMonth: string | null
  branchId: string
  legalEntityCode: string
  endStatus: "DRAFT" | "READY_FOR_REVIEW" | "LOCKED" | null
  endRebuiltAt: string | null
  endLockedAt: string | null
  endCompletenessOk: boolean | null
  endCompletenessNotes: string | null
  endTotalAdjAmount: string | number | null
  endTrackableSales: string | number | null
  endUntrackableSales: string | number | null
  endTotalSales: string | number | null
  endRefundsTotal: string | number | null
  branch?: {
    id: string
    code: string
    name: string
    type: string
  } | null
  endLines: EndLineVM[]
  contributionSummary?: {
    byKind: Record<string, { count: number; quantity: number }>
    bySourceType: Record<string, { count: number; quantity: number }>
    total: number
  }
}

export type GetOrCreateEndResultVM = {
  id: string
  refNo: string
  created: boolean
  endStatus: string | null
  periodMonth: string | null
}

export type ImportEndCsvResultVM = {
  mode: "preview" | "apply"
  valid: boolean
  rows: Array<{
    row: number
    productCode: string
    productId: string
    beginQty: number
    countQty: number | null
    previousBeginQty: number | null
    previousCountQty: number | null
  }>
  errors: Array<{ row: number; productCode?: string; message: string }>
  warnings: string[]
  document?: EndDocumentDetailVM
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

function normalizeIso(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export function normalizeEndDocumentDetail(raw: EndDocumentDetailVM): EndDocumentDetailVM {
  return {
    ...raw,
    date:
      typeof raw.date === "string"
        ? raw.date
        : new Date(raw.date as string | Date).toISOString(),
    endRebuiltAt: normalizeIso(raw.endRebuiltAt),
    endLockedAt: normalizeIso(raw.endLockedAt),
    endLines: (raw.endLines ?? []).map((line) => ({
      ...line,
      product: line.product ?? {
        id: line.productId,
        code: line.productId,
        name: line.productId,
      },
    })),
  }
}

export async function fetchEndDocumentDetail(
  documentId: string
): Promise<EndDocumentDetailVM> {
  const id = String(documentId ?? "").trim()
  const res = await fetch(`/api/stock-document/end/${encodeURIComponent(id)}`)
  await throwOnError(res)
  const raw = await parseJson<EndDocumentDetailVM>(res)
  return normalizeEndDocumentDetail(raw)
}

export async function getOrCreateEndDocument(input: {
  legalEntityCode: string
  branchId: string
  periodMonth: string
}): Promise<GetOrCreateEndResultVM> {
  const res = await fetch("/api/stock-document/end/get-or-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  await throwOnError(res)
  return parseJson<GetOrCreateEndResultVM>(res)
}

export async function rebuildEndDocument(
  documentId: string
): Promise<{
  document: EndDocumentDetailVM
  lineCount: number
  contributionCount: number
  completeness: EndCompleteness
}> {
  const id = String(documentId ?? "").trim()
  const res = await fetch(
    `/api/stock-document/end/${encodeURIComponent(id)}/rebuild`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  )
  await throwOnError(res)
  return parseJson(res)
}

export async function submitEndDocument(
  documentId: string
): Promise<{ document: EndDocumentDetailVM; completeness: EndCompleteness }> {
  const id = String(documentId ?? "").trim()
  const res = await fetch(
    `/api/stock-document/end/${encodeURIComponent(id)}/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  )
  await throwOnError(res)
  return parseJson(res)
}

export async function lockEndDocument(
  documentId: string
): Promise<EndDocumentDetailVM> {
  const id = String(documentId ?? "").trim()
  const res = await fetch(
    `/api/stock-document/end/${encodeURIComponent(id)}/lock`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  )
  await throwOnError(res)
  return parseJson(res)
}

export async function reopenEndDocument(
  documentId: string,
  reason: string
): Promise<EndDocumentDetailVM> {
  const id = String(documentId ?? "").trim()
  const res = await fetch(
    `/api/stock-document/end/${encodeURIComponent(id)}/reopen`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  )
  await throwOnError(res)
  return parseJson(res)
}

export async function importEndCsv(
  documentId: string,
  input: { csvText: string; mode: "preview" | "apply"; fileName?: string }
): Promise<ImportEndCsvResultVM> {
  const id = String(documentId ?? "").trim()
  const res = await fetch(
    `/api/stock-document/end/${encodeURIComponent(id)}/import`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  await throwOnError(res)
  return parseJson(res)
}

export async function applyEndManualOpening(
  documentId: string,
  lines: Array<{
    productCode: string
    beginQty: number
    countQty?: number | null
  }>
): Promise<{ ok: boolean; rowCount: number }> {
  const id = String(documentId ?? "").trim()
  const res = await fetch(
    `/api/stock-document/end/${encodeURIComponent(id)}/manual-opening`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    }
  )
  if (!res.ok) {
    let message = res.statusText || "Request failed"
    let code = "REQUEST_FAILED"
    try {
      const body = (await res.json()) as ApiErrorBody & {
        errors?: Array<{ message?: string; productCode?: string }>
      }
      if (body.error) message = body.error
      if (body.code) code = body.code
      if (body.errors?.length) {
        const first = body.errors[0]!
        message = first.productCode
          ? `${first.productCode}: ${first.message ?? message}`
          : String(first.message ?? message)
      }
    } catch {
      // keep defaults
    }
    throw new StockDocumentUiError(
      messageForDocumentErrorCode(code) || message,
      code
    )
  }
  return parseJson(res)
}
