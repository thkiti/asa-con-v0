import type { DocType } from "@/generated/prisma/client"
import type { SaveDocumentLineInput } from "@/lib/stock/document/document-types"

const DOC_TYPES: readonly DocType[] = [
  "PURCHASE",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "ADJUSTMENT",
  "PERFORMANCE",
]

export type ParsedSaveBody = {
  id?: string | null
  docType: DocType
  date: string
  branchId: string
  fromLocId?: string | null
  toLocId?: string | null
  createdByStaffId?: string | null
  lines: SaveDocumentLineInput[]
}

export function parseDocType(value: unknown): DocType | null {
  const raw = String(value ?? "").trim().toUpperCase()
  if ((DOC_TYPES as readonly string[]).includes(raw)) {
    return raw as DocType
  }
  return null
}

function parseLines(raw: unknown): SaveDocumentLineInput[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const row = item as Record<string, unknown>
    return {
      productId: String(row.productId ?? ""),
      qty: Number(row.qty ?? 0),
      endingQty:
        row.endingQty === undefined || row.endingQty === null
          ? null
          : Number(row.endingQty),
      reviewPostingDelta:
        row.reviewPostingDelta === undefined || row.reviewPostingDelta === null
          ? null
          : Number(row.reviewPostingDelta),
    }
  })
}

export function parseSaveBody(body: unknown): ParsedSaveBody | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const docType = parseDocType(b.docType ?? b.type)
  if (!docType) {
    return { error: "docType is required" }
  }

  const date = String(b.date ?? "").trim()
  if (!date) {
    return { error: "date is required" }
  }

  const branchId = String(b.branchId ?? "").trim()
  if (!branchId) {
    return { error: "branchId is required" }
  }

  const rawLines = b.lines ?? b.items
  const lines = parseLines(rawLines)
  if (!Array.isArray(rawLines)) {
    return { error: "lines must be an array" }
  }

  const id = b.id == null ? null : String(b.id).trim() || null

  return {
    id,
    docType,
    date,
    branchId,
    fromLocId: b.fromLocId == null ? null : String(b.fromLocId),
    toLocId: b.toLocId == null ? null : String(b.toLocId),
    createdByStaffId:
      b.createdByStaffId == null ? null : String(b.createdByStaffId),
    lines,
  }
}
