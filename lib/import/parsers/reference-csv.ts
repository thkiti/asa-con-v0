import fs from "fs"
import path from "path"

import { resolveImportSourceFile } from "../source-paths"
import type { ReferenceStockImportRow } from "../types"
import { normalizeReferenceProductCode } from "../validation/product-code"

type ReferenceCsvParseResult = {
  rows: ReferenceStockImportRow[]
  skipped: number
  warnings: string[]
  errors: string[]
  missingFile: boolean
}

function cleanCsvCell(value: string): string {
  return value.trim().replace(/^"|"$/g, "")
}

function splitCsvLine(line: string): string[] {
  const trimmed = line.trim()
  const unquoted =
    trimmed.startsWith('"') && trimmed.endsWith('"')
      ? trimmed.slice(1, -1)
      : trimmed
  return unquoted.split(",").map(cleanCsvCell)
}

export function hookGroupFromFileName(fileName: string): string {
  const base = path.basename(fileName, path.extname(fileName))
  const letter = base.charAt(0).toUpperCase()
  return letter || "?"
}

export function parseReferenceCsvContent(
  content: string,
  fileName: string,
  hookGroup = hookGroupFromFileName(fileName)
): ReferenceCsvParseResult {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean)
  const rows: ReferenceStockImportRow[] = []
  const warnings: string[] = []
  const errors: string[] = []
  let skipped = 0

  for (let index = 1; index < lines.length; index++) {
    try {
      const cols = splitCsvLine(lines[index] ?? "")
      const supplierCode = cols[0] ?? ""
      const hookNo = Number(cols[1])
      const productCode = normalizeReferenceProductCode(cols[2])
      const productGroupRaw = normalizeReferenceProductCode(cols[3])
      const productGroup = productGroupRaw || null

      if (!supplierCode || !Number.isFinite(hookNo) || hookNo <= 0 || !productCode) {
        skipped++
        continue
      }

      rows.push({
        hookGroup,
        hookNo,
        supplierCode,
        productCode,
        productGroup,
        sourceFile: fileName,
      })
    } catch (error) {
      skipped++
      errors.push(
        `${fileName} row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  if (lines.length <= 1 && lines.length > 0) {
    warnings.push(`${fileName}: header only, no data rows`)
  }

  return { rows, skipped, warnings, errors, missingFile: false }
}

export function parseReferenceCsvFile(
  filePath: string,
  hookGroup?: string
): ReferenceCsvParseResult {
  const fileName = path.basename(filePath)

  if (!fs.existsSync(filePath)) {
    return {
      rows: [],
      skipped: 0,
      warnings: [],
      errors: [],
      missingFile: true,
    }
  }

  const content = fs.readFileSync(filePath, "utf8")
  return parseReferenceCsvContent(
    content,
    fileName,
    hookGroup ?? hookGroupFromFileName(fileName)
  )
}

export function parseReferenceCsvFiles(
  sourceDir: string,
  files: Array<{ fileName: string; hookGroup: string; optional?: boolean }>
): {
  rows: ReferenceStockImportRow[]
  skipped: number
  warnings: string[]
  errors: string[]
} {
  const rows: ReferenceStockImportRow[] = []
  let skipped = 0
  const warnings: string[] = []
  const errors: string[] = []

  for (const file of files) {
    const filePath = resolveImportSourceFile(sourceDir, file.fileName, "csv")
    const parsed = parseReferenceCsvFile(filePath, file.hookGroup)

    if (parsed.missingFile) {
      if (file.optional) {
        warnings.push(`Optional file missing, skipped: ${file.fileName}`)
        continue
      }
      errors.push(`Missing required file: ${file.fileName}`)
      continue
    }

    rows.push(...parsed.rows)
    skipped += parsed.skipped
    warnings.push(...parsed.warnings)
    errors.push(...parsed.errors)
  }

  return { rows, skipped, warnings, errors }
}
