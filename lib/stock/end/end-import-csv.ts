import "server-only"

import { createHash } from "crypto"
import { prisma } from "@/lib/shared/prisma"
import { EndError, EndErrorCodes } from "./end-errors"
import { isInitialEndPeriod } from "./end-period"
import { applyEndManualOpeningLines } from "./end-manual-opening"
import type {
  ImportEndCsvInput,
  ImportEndCsvResult,
  ImportEndCsvRowError,
  ImportEndCsvRowPreview,
} from "./end-types"

function cleanCell(value: string): string {
  return value.trim().replace(/^"|"$/g, "")
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === "," && !inQuotes) {
      cells.push(cleanCell(current))
      current = ""
      continue
    }
    current += ch
  }
  cells.push(cleanCell(current))
  return cells
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ")
}

function parseQty(raw: string, field: string, row: number): number | null {
  const s = raw.trim()
  if (!s) return null
  if (!/^-?\d+$/.test(s)) {
    throw new EndError(
      `Row ${row}: ${field} must be an integer`,
      EndErrorCodes.IMPORT_VALIDATION_FAILED
    )
  }
  return Number(s)
}

export async function importEndCsv(
  input: ImportEndCsvInput
): Promise<ImportEndCsvResult> {
  const documentId = String(input.documentId ?? "").trim()
  const staffId = String(input.staffId ?? "").trim()
  const mode = input.mode
  const csvText = String(input.csvText ?? "")
  const fileName = input.fileName?.trim() || null

  if (!documentId || !staffId) {
    throw new EndError(
      "documentId and staffId are required",
      EndErrorCodes.INVALID_INPUT
    )
  }
  if (mode !== "preview" && mode !== "apply") {
    throw new EndError("mode must be preview or apply", EndErrorCodes.INVALID_INPUT)
  }

  const doc = await (input.tx ?? prisma).stockDocument.findUnique({
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
      "CSV import is only allowed for period 2026-01",
      EndErrorCodes.IMPORT_NOT_ALLOWED,
      409
    )
  }

  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/)
  const nonEmpty = lines
    .map((line, index) => ({ line, index: index + 1 }))
    .filter((x) => x.line.trim().length > 0)

  if (nonEmpty.length === 0) {
    throw new EndError("CSV is empty", EndErrorCodes.IMPORT_VALIDATION_FAILED)
  }

  const headerCells = splitCsvLine(nonEmpty[0]!.line)
  const headerMap = new Map<string, number>()
  headerCells.forEach((h, i) => headerMap.set(normalizeHeader(h), i))

  const productCodeIdx = headerMap.get("product code")
  const beginIdx = headerMap.get("begin qty")
  const countIdx = headerMap.get("count qty")

  const errors: ImportEndCsvRowError[] = []
  const warnings: string[] = []

  if (productCodeIdx === undefined) {
    errors.push({ row: 1, message: "Missing required column: Product Code" })
  }
  if (beginIdx === undefined) {
    errors.push({ row: 1, message: "Missing required column: BEGIN Qty" })
  }

  for (const h of headerCells) {
    const n = normalizeHeader(h)
    if (n && !["product code", "begin qty", "count qty"].includes(n)) {
      warnings.push(`Unknown column ignored: ${h}`)
    }
  }

  const existingByProductId = new Map(
    doc.endLines.map((l) => [l.productId, l] as const)
  )

  const products = await (input.tx ?? prisma).product.findMany({
    where: { deleted: false },
    select: { id: true, code: true },
  })
  const productByCode = new Map(
    products.map((p) => [p.code.trim().toUpperCase(), p] as const)
  )

  const seenCodes = new Set<string>()
  const rows: ImportEndCsvRowPreview[] = []

  for (let i = 1; i < nonEmpty.length; i++) {
    const { line, index: rowNum } = nonEmpty[i]!
    const cells = splitCsvLine(line)
    const productCodeRaw =
      productCodeIdx === undefined ? "" : (cells[productCodeIdx] ?? "")
    const productCode = productCodeRaw.trim().toUpperCase()

    if (!productCode) {
      errors.push({ row: rowNum, message: "Product Code is required" })
      continue
    }
    if (seenCodes.has(productCode)) {
      errors.push({
        row: rowNum,
        productCode,
        message: "Duplicate Product Code in CSV",
      })
      continue
    }
    seenCodes.add(productCode)

    const product = productByCode.get(productCode)
    if (!product) {
      errors.push({
        row: rowNum,
        productCode,
        message: "Product Code not found",
      })
      continue
    }

    let beginQty: number
    let countQty: number | null = null
    try {
      const beginRaw =
        beginIdx === undefined ? "" : (cells[beginIdx] ?? "")
      const parsedBegin = parseQty(beginRaw, "BEGIN Qty", rowNum)
      if (parsedBegin === null) {
        errors.push({
          row: rowNum,
          productCode,
          message: "BEGIN Qty is required",
        })
        continue
      }
      beginQty = parsedBegin

      if (countIdx !== undefined) {
        const countRaw = cells[countIdx] ?? ""
        countQty = parseQty(countRaw, "COUNT Qty", rowNum)
      }
    } catch (err: unknown) {
      errors.push({
        row: rowNum,
        productCode,
        message: err instanceof Error ? err.message : String(err),
      })
      continue
    }

    const previous = existingByProductId.get(product.id) ?? null
    rows.push({
      row: rowNum,
      productCode,
      productId: product.id,
      beginQty,
      countQty,
      previousBeginQty: previous?.beginQty ?? null,
      previousCountQty: previous?.countQty ?? null,
    })
  }

  const valid = errors.length === 0
  if (!valid || mode === "preview") {
    return { mode, valid, rows, errors, warnings }
  }

  const checksum = createHash("sha256").update(csvText).digest("hex")
  const applied = await applyEndManualOpeningLines({
    documentId: doc.id,
    staffId,
    lines: rows.map((row) => ({
      productCode: row.productCode,
      beginQty: row.beginQty,
      countQty: row.countQty,
    })),
    importMeta: {
      fileName,
      checksum,
      source: "csv",
    },
    tx: input.tx,
  })

  return {
    mode,
    valid: true,
    rows,
    errors: [],
    warnings,
    document: applied.document,
  }
}
