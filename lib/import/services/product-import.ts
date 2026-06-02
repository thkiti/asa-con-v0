import {
  createEmptyPhaseReport,
  takeSampleRows,
} from "../report"
import {
  parseProductDbf,
  resolveProductDbfPath,
} from "../parsers/product-dbf"
import type { ImportDb, ImportPhaseReport, ImportProfile, ProductImportRow } from "../types"

export async function loadProductImportCodes(profile: ImportProfile): Promise<Set<string>> {
  const filePath = resolveProductDbfPath(profile.sourceDir, profile.productFile)
  const parsed = await parseProductDbf(filePath)
  return new Set(parsed.rows.map((row) => row.code))
}

function productNeedsUpdate(
  existing: {
    name?: string
    groupCode?: number
    typeCode?: number
    runningCode?: number
    productType?: ProductImportRow["productType"]
    deleted?: boolean
  },
  row: ProductImportRow
): boolean {
  return (
    existing.name !== row.name ||
    existing.groupCode !== row.groupCode ||
    existing.typeCode !== row.typeCode ||
    existing.runningCode !== row.runningCode ||
    existing.productType !== row.productType ||
    existing.deleted !== row.deleted
  )
}

export async function runProductImport(input: {
  db: ImportDb
  profile: ImportProfile
  apply: boolean
}): Promise<ImportPhaseReport> {
  const report = createEmptyPhaseReport("product")
  const filePath = resolveProductDbfPath(input.profile.sourceDir, input.profile.productFile)
  const parsed = await parseProductDbf(filePath)

  report.rowsRead = parsed.rows.length + parsed.skipped
  report.skipped = parsed.skipped
  report.errors.push(...parsed.errors)
  report.sampleRows = takeSampleRows(parsed.rows)

  for (const row of parsed.rows) {
    const existing = await input.db.product.findUnique({
      where: { code: row.code },
      select: {
        id: true,
        name: true,
        groupCode: true,
        typeCode: true,
        runningCode: true,
        productType: true,
        deleted: true,
      },
    })

    if (!existing) {
      report.wouldInsert++
      if (input.apply) {
        await input.db.product.upsert({
          where: { code: row.code },
          create: row,
          update: {
            name: row.name,
            groupCode: row.groupCode,
            typeCode: row.typeCode,
            runningCode: row.runningCode,
            productType: row.productType,
            deleted: row.deleted,
          },
        })
        report.inserted++
      }
      continue
    }

    if (productNeedsUpdate(existing, row)) {
      report.wouldUpdate++
      if (input.apply) {
        await input.db.product.upsert({
          where: { code: row.code },
          create: row,
          update: {
            name: row.name,
            groupCode: row.groupCode,
            typeCode: row.typeCode,
            runningCode: row.runningCode,
            productType: row.productType,
            deleted: row.deleted,
          },
        })
        report.updated++
      }
      continue
    }

    report.skipped++
  }

  return report
}
