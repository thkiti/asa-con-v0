import type { DocStatus, DocType } from "@/generated/prisma/client"
import { parseDocType } from "@/app/api/stock-document/shared/parse-save-body"
import { normalizeListLimit } from "@/lib/stock/document-read/document-list"

const DOC_STATUSES: readonly DocStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "SHIPPED",
  "CONFIRMED",
  "RECEIVED",
  "POSTED",
  "TRANSFERRED",
  "CANCELLED",
]

function parseDocStatus(value: string | null): DocStatus | undefined {
  const raw = String(value ?? "").trim().toUpperCase()
  if ((DOC_STATUSES as readonly string[]).includes(raw)) {
    return raw as DocStatus
  }
  return undefined
}

export type ParsedListQuery = {
  branchId: string | null
  docType?: DocType
  status?: DocStatus
  periodMonth?: string
  fromDate?: Date
  toDate?: Date
  cursor?: string | null
  limit: number
}

export function parseListQuery(url: string): ParsedListQuery {
  const params = new URL(url).searchParams
  const branchId = params.get("branchId")
  const docType = parseDocType(params.get("docType") ?? params.get("type"))
  const status = parseDocStatus(params.get("status"))
  // Prefer periodKey (PeriodSelector contract); accept legacy periodMonth.
  const periodMonth =
    params.get("periodKey")?.trim() ||
    params.get("periodMonth")?.trim() ||
    undefined
  const cursor = params.get("cursor")

  const fromRaw = params.get("from")?.trim()
  const toRaw = params.get("to")?.trim()
  const fromDate = fromRaw ? new Date(fromRaw) : undefined
  const toDate = toRaw ? new Date(toRaw) : undefined

  return {
    branchId,
    ...(docType ? { docType } : {}),
    ...(status ? { status } : {}),
    ...(periodMonth ? { periodMonth } : {}),
    ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { fromDate } : {}),
    ...(toDate && !Number.isNaN(toDate.getTime()) ? { toDate } : {}),
    cursor,
    limit: normalizeListLimit(Number(params.get("limit"))),
  }
}
