import {
  createEmptyPhaseReport,
  takeSampleRows,
} from "../report"
import { parseReferenceCsvFiles } from "../parsers/reference-csv"
import type {
  ImportDb,
  ImportPhaseReport,
  ImportProfile,
  ReferenceStockImportRow,
} from "../types"

function referenceNeedsUpdate(
  existing: {
    supplierCode?: string
    productCode?: string
    productGroup?: string | null
    deleted?: boolean
  },
  row: ReferenceStockImportRow
): boolean {
  return (
    existing.supplierCode !== row.supplierCode ||
    existing.productCode !== row.productCode ||
    (existing.productGroup ?? null) !== row.productGroup ||
    existing.deleted !== false
  )
}

function isPendingProductId(productId: string): boolean {
  return productId.startsWith("__pending__:")
}

async function resolveProductId(
  db: ImportDb,
  productCode: string,
  apply: boolean,
  pendingProductCodes?: Set<string>
): Promise<string | null> {
  const existing = await db.product.findUnique({
    where: { code: productCode },
    select: { id: true },
  })

  if (existing) {
    return existing.id
  }

  if (!apply && pendingProductCodes?.has(productCode)) {
    return `__pending__:${productCode}`
  }

  return null
}

async function upsertReferenceStockRow(
  db: ImportDb,
  productId: string,
  row: ReferenceStockImportRow
): Promise<void> {
  await db.referenceStock.upsert({
    where: {
      productId_hookGroup_hookNo: {
        productId,
        hookGroup: row.hookGroup,
        hookNo: row.hookNo,
      },
    },
    create: {
      hookGroup: row.hookGroup,
      hookNo: row.hookNo,
      supplierCode: row.supplierCode,
      productCode: row.productCode,
      productGroup: row.productGroup,
      productId,
      deleted: false,
    },
    update: {
      supplierCode: row.supplierCode,
      productCode: row.productCode,
      productGroup: row.productGroup,
      deleted: false,
    },
  })
}

export async function runReferenceStockImport(input: {
  db: ImportDb
  profile: ImportProfile
  apply: boolean
  pendingProductCodes?: Set<string>
}): Promise<ImportPhaseReport> {
  const report = createEmptyPhaseReport("reference-stock")
  const parsed = parseReferenceCsvFiles(
    input.profile.sourceDir,
    input.profile.referenceStockFiles
  )

  report.rowsRead = parsed.rows.length + parsed.skipped
  report.skipped = parsed.skipped
  report.errors.push(...parsed.errors)
  report.warnings.push(...parsed.warnings)
  report.sampleRows = takeSampleRows(parsed.rows)

  for (const row of parsed.rows) {
    let productId = await resolveProductId(
      input.db,
      row.productCode,
      input.apply,
      input.pendingProductCodes
    )

    if (!productId) {
      report.skipped++
      report.missingProductReferences.push(
        `${row.sourceFile} hook ${row.hookGroup}${row.hookNo}: product ${row.productCode} not found`
      )
      continue
    }

    if (input.apply && isPendingProductId(productId)) {
      const persisted = await input.db.product.findUnique({
        where: { code: row.productCode },
        select: { id: true },
      })
      productId = persisted?.id ?? null
      if (!productId) {
        report.skipped++
        report.missingProductReferences.push(
          `${row.sourceFile} hook ${row.hookGroup}${row.hookNo}: product ${row.productCode} not found after product import`
        )
        continue
      }
    }

    const existing = isPendingProductId(productId)
      ? null
      : await input.db.referenceStock.findUnique({
          where: {
            productId_hookGroup_hookNo: {
              productId,
              hookGroup: row.hookGroup,
              hookNo: row.hookNo,
            },
          },
          select: {
            id: true,
            supplierCode: true,
            productCode: true,
            productGroup: true,
            deleted: true,
          },
        })

    if (!existing) {
      report.wouldInsert++
      if (input.apply) {
        await upsertReferenceStockRow(input.db, productId, row)
        report.inserted++
      }
      continue
    }

    if (referenceNeedsUpdate(existing, row)) {
      report.wouldUpdate++
      if (input.apply) {
        await upsertReferenceStockRow(input.db, productId, row)
        report.updated++
      }
      continue
    }

    report.skipped++
  }

  return report
}
