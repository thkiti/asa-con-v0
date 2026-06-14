import fs from "fs"

import { readDbfRecords } from "@/lib/import/parsers/dbf-reader"
import { normalizeLegacySalesDbfRecord } from "./normalize-row"
import type { ParsedLegacySalesDbfRow } from "./types"

export type LegacySalesDbfParseResult = {
  totalFileRows: number
  acceptedRows: ParsedLegacySalesDbfRow[]
  skippedOldRows: number
  parseErrors: string[]
}

export async function parseLegacySalesDbf(filePath: string): Promise<LegacySalesDbfParseResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing legacy sales file: ${filePath}`)
  }

  const records = await readDbfRecords(filePath)
  const acceptedRows: ParsedLegacySalesDbfRow[] = []
  const parseErrors: string[] = []
  let skippedOldRows = 0

  for (let index = 0; index < records.length; index++) {
    const sourceRowNo = index + 1
    const result = normalizeLegacySalesDbfRecord(records[index] ?? {}, sourceRowNo)
    if (result.ok) {
      acceptedRows.push(result.row)
      continue
    }

    if (result.reason === "OLD_DATA") {
      skippedOldRows++
      continue
    }

    parseErrors.push(`Row ${sourceRowNo}: ${result.message}`)
  }

  return {
    totalFileRows: records.length,
    acceptedRows,
    skippedOldRows,
    parseErrors,
  }
}
