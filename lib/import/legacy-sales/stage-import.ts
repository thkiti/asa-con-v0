import type { PrismaClient } from "@/generated/prisma/client"
import { toDec } from "@/lib/stock/decimal"
import { parseLegacySalesDbf } from "./parse-sales-dbf"
import type { LegacySalesStageOptions, LegacySalesStageSummary } from "./types"

export async function runLegacySalesStageImport(
  db: Pick<PrismaClient, "legacySalesImportBatch" | "legacySalesImportRow">,
  options: LegacySalesStageOptions
): Promise<LegacySalesStageSummary> {
  const parsed = await parseLegacySalesDbf(options.filePath)
  const mode = options.apply ? "apply" : "dry-run"

  if (!options.apply) {
    return {
      batchId: null,
      sourceFileName: options.sourceFileName,
      year: options.year,
      mode,
      totalFileRows: parsed.totalFileRows,
      acceptedRows: parsed.acceptedRows.length,
      skippedOldRows: parsed.skippedOldRows,
      skippedDuplicateRows: 0,
      parseErrors: parsed.parseErrors,
    }
  }

  const batch = await db.legacySalesImportBatch.create({
    data: {
      sourceFileName: options.sourceFileName,
      year: options.year,
      status: "STAGING",
      totalRows: parsed.totalFileRows,
      acceptedRows: 0,
      skippedOldRows: parsed.skippedOldRows,
    },
  })

  let inserted = 0
  let skippedDuplicateRows = 0

  for (const row of parsed.acceptedRows) {
    try {
      await db.legacySalesImportRow.create({
        data: {
          sourceFileName: options.sourceFileName,
          sourceRowNo: row.sourceRowNo,
          legacyTransNo: row.legacyTransNo,
          legacyDate: row.legacyDate,
          legacyTime: row.legacyTime,
          legacyBranchId: row.legacyBranchId,
          legacyStaffId: row.legacyStaffId,
          legacyProductCode: row.legacyProductCode,
          qty: row.qty,
          amount: toDec(row.amount),
          normalizedSaleDateTime: row.normalizedSaleDateTime,
          importBatchId: batch.id,
          status: "PENDING",
        },
      })
      inserted++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("Unique constraint")) {
        skippedDuplicateRows++
        continue
      }
      throw error
    }
  }

  await db.legacySalesImportBatch.update({
    where: { id: batch.id },
    data: {
      acceptedRows: inserted,
      skippedOldRows: parsed.skippedOldRows,
      finishedAt: new Date(),
    },
  })

  return {
    batchId: batch.id,
    sourceFileName: options.sourceFileName,
    year: options.year,
    mode,
    totalFileRows: parsed.totalFileRows,
    acceptedRows: inserted,
    skippedOldRows: parsed.skippedOldRows,
    skippedDuplicateRows,
    parseErrors: parsed.parseErrors,
  }
}

export function printLegacySalesStageSummary(summary: LegacySalesStageSummary): void {
  console.log("\n=== Legacy Sales Stage Summary ===")
  console.log(`Mode: ${summary.mode}`)
  console.log(`Source file: ${summary.sourceFileName}`)
  console.log(`Year filter: ${summary.year}`)
  if (summary.batchId) console.log(`Batch ID: ${summary.batchId}`)
  console.log(`Total DBF rows: ${summary.totalFileRows}`)
  console.log(`Accepted (>= 2026-01-01): ${summary.acceptedRows}`)
  console.log(`Skipped old rows: ${summary.skippedOldRows}`)
  console.log(`Skipped duplicate staging rows: ${summary.skippedDuplicateRows}`)
  if (summary.parseErrors.length > 0) {
    console.log(`Parse errors: ${summary.parseErrors.length}`)
    for (const error of summary.parseErrors.slice(0, 20)) {
      console.log(`  - ${error}`)
    }
    if (summary.parseErrors.length > 20) {
      console.log(`  ... and ${summary.parseErrors.length - 20} more`)
    }
  }
}
