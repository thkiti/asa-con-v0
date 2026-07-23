import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { EndError, EndErrorCodes } from "./end-errors"
import { isInitialEndPeriod } from "./end-period"
import { rebuildEndDocument } from "./end-rebuild"

export type EndManualOpeningLineInput = {
  productCode: string
  beginQty: number
  countQty?: number | null
}

export type EndManualOpeningResolvedRow = {
  productCode: string
  productId: string
  beginQty: number
  countQty: number | null
  previousBeginQty: number | null
  previousCountQty: number | null
}

export type ApplyEndManualOpeningInput = {
  documentId: string
  staffId: string
  lines: EndManualOpeningLineInput[]
  /** Optional audit meta (e.g. CSV checksum). */
  importMeta?: {
    fileName?: string | null
    checksum?: string | null
    source?: "csv" | "manual"
  }
  tx?: Prisma.TransactionClient
}

export type ApplyEndManualOpeningResult = {
  valid: boolean
  rows: EndManualOpeningResolvedRow[]
  errors: { row: number; productCode?: string; message: string }[]
  document?: Awaited<ReturnType<typeof rebuildEndDocument>>["document"]
}

function parseIntegerQty(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isInteger(value)) return value
  const s = String(value ?? "").trim()
  if (!/^-?\d+$/.test(s)) {
    throw new EndError(
      `${field} must be an integer`,
      EndErrorCodes.IMPORT_VALIDATION_FAILED
    )
  }
  return Number(s)
}

/**
 * Resolve + validate first-period BEGIN (and optional COUNT) rows.
 * Shared by CSV import and manual paper entry.
 */
export async function resolveEndManualOpeningLines(
  documentId: string,
  lines: EndManualOpeningLineInput[],
  db: Pick<typeof prisma, "stockDocument" | "product"> = prisma
): Promise<{
  doc: NonNullable<
    Awaited<ReturnType<typeof db.stockDocument.findUnique>>
  >
  rows: EndManualOpeningResolvedRow[]
  errors: { row: number; productCode?: string; message: string }[]
}> {
  const doc = await db.stockDocument.findUnique({
    where: { id: documentId },
    include: { endLines: true },
  })

  if (!doc || doc.docType !== "END") {
    throw new EndError("END document not found", EndErrorCodes.END_NOT_FOUND, 404)
  }
  if (doc.endStatus === "LOCKED") {
    throw new EndError("Cannot import into a locked END", EndErrorCodes.END_LOCKED, 409)
  }
  if (!doc.periodMonth || !isInitialEndPeriod(doc.periodMonth)) {
    throw new EndError(
      "Opening BEGIN entry is only allowed for period 2026-01",
      EndErrorCodes.IMPORT_NOT_ALLOWED,
      409
    )
  }

  const products = await db.product.findMany({
    where: { deleted: false },
    select: { id: true, code: true },
  })
  const productByCode = new Map(
    products.map((p) => [p.code.trim().toUpperCase(), p] as const)
  )
  const existingByProductId = new Map(
    doc.endLines.map((l) => [l.productId, l] as const)
  )

  const errors: { row: number; productCode?: string; message: string }[] = []
  const rows: EndManualOpeningResolvedRow[] = []
  const seenCodes = new Set<string>()

  lines.forEach((raw, index) => {
    const rowNum = index + 1
    const productCode = String(raw.productCode ?? "").trim().toUpperCase()
    if (!productCode) {
      errors.push({ row: rowNum, message: "Product Code is required" })
      return
    }
    if (seenCodes.has(productCode)) {
      errors.push({
        row: rowNum,
        productCode,
        message: "Duplicate Product Code",
      })
      return
    }
    seenCodes.add(productCode)

    const product = productByCode.get(productCode)
    if (!product) {
      errors.push({
        row: rowNum,
        productCode,
        message: "Product Code not found",
      })
      return
    }

    let beginQty: number
    let countQty: number | null = null
    try {
      beginQty = parseIntegerQty(raw.beginQty, "Opening Qty (BEGIN)")
      if (raw.countQty !== undefined && raw.countQty !== null && String(raw.countQty).trim() !== "") {
        countQty = parseIntegerQty(raw.countQty, "Physical Count Qty")
      }
    } catch (err: unknown) {
      errors.push({
        row: rowNum,
        productCode,
        message: err instanceof Error ? err.message : String(err),
      })
      return
    }

    const previous = existingByProductId.get(product.id) ?? null
    rows.push({
      productCode,
      productId: product.id,
      beginQty,
      countQty,
      previousBeginQty: previous?.beginQty ?? null,
      previousCountQty: previous?.countQty ?? null,
    })
  })

  return { doc, rows, errors }
}

/**
 * Upsert first-period BEGIN (/ optional COUNT) lines with beginManual flags, then rebuild.
 * Architecture: END is the approved owner of 2026-01 BEGIN (see docs/40_END_STOCK_DOCUMENT.md).
 */
export async function applyEndManualOpeningLines(
  input: ApplyEndManualOpeningInput
): Promise<ApplyEndManualOpeningResult> {
  const documentId = String(input.documentId ?? "").trim()
  const staffId = String(input.staffId ?? "").trim()
  if (!documentId || !staffId) {
    throw new EndError(
      "documentId and staffId are required",
      EndErrorCodes.INVALID_INPUT
    )
  }
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new EndError("At least one line is required", EndErrorCodes.INVALID_INPUT)
  }

  const db = input.tx ?? prisma
  const { doc, rows, errors } = await resolveEndManualOpeningLines(
    documentId,
    input.lines,
    db as never
  )

  if (errors.length > 0) {
    return { valid: false, rows, errors }
  }

  const source = input.importMeta?.source ?? "manual"
  const fileName = input.importMeta?.fileName ?? null
  const checksum = input.importMeta?.checksum ?? null

  const run = async (tx: Prisma.TransactionClient) => {
    const existingByProductId = new Map(
      (
        await tx.endLine.findMany({
          where: { documentId: doc.id },
          select: {
            id: true,
            productId: true,
            beginQty: true,
            countQty: true,
          },
        })
      ).map((l) => [l.productId, l] as const)
    )

    for (const row of rows) {
      const existing = existingByProductId.get(row.productId)
      if (existing) {
        await tx.endLine.update({
          where: { id: existing.id },
          data: {
            beginQty: row.beginQty,
            beginManual: true,
            countQty: row.countQty,
            countManual: row.countQty != null,
            countIncomplete: row.countQty == null,
          },
        })
      } else {
        await tx.endLine.create({
          data: {
            documentId: doc.id,
            productId: row.productId,
            beginQty: row.beginQty,
            beginManual: true,
            inQty: 0,
            usageQty: 0,
            actualQty: row.beginQty,
            countQty: row.countQty,
            countManual: row.countQty != null,
            countIncomplete: row.countQty == null,
            endingQty: row.countQty,
            adjQty:
              row.countQty == null ? null : row.countQty - row.beginQty,
            priceIncomplete: true,
          },
        })
      }
    }

    await tx.stockDocument.update({
      where: { id: doc.id },
      data: {
        endInitImportMeta: {
          at: new Date().toISOString(),
          byStaffId: staffId,
          fileName,
          checksum,
          rowCount: rows.length,
          source,
        },
        endCompletenessOk: false,
      },
    })

    await tx.endAuditEvent.create({
      data: {
        documentId: doc.id,
        eventType: "IMPORTED",
        byStaffId: staffId,
        payload: {
          fileName,
          checksum,
          rowCount: rows.length,
          source,
          mode: "apply",
        },
      },
    })

    return rebuildEndDocument({
      documentId: doc.id,
      staffId,
      tx,
    })
  }

  const rebuilt = input.tx
    ? await run(input.tx)
    : await prisma.$transaction(run)

  return {
    valid: true,
    rows,
    errors: [],
    document: rebuilt.document,
  }
}
