import type { PrismaClient } from "@/generated/prisma/client"
import { formatShopBranchCode } from "@/lib/import/validation/branch-code"
import { buildLegacySalesValidationAggregates } from "./summaries"
import type { LegacySalesRowRef, LegacySalesValidateOptions, LegacySalesValidationSummary } from "./types"

type ValidationMaps = {
  branchByCode: Map<string, { id: string }>
  productByCode: Map<string, { id: string }>
  staffByStaffId: Map<string, { staffId: string }>
}

function evaluateLegacySalesRow(
  row: LegacySalesRowRef,
  maps: ValidationMaps
): {
  status: "VALID" | "INVALID"
  errorCode: string | null
  errorMessage: string | null
  mappedBranchId: string | null
  mappedStaffId: string | null
  mappedProductId: string | null
  unmatchedStaff: string | null
} {
  if (row.qty <= 0) {
    return {
      status: "INVALID",
      errorCode: row.qty === 0 ? "ZERO_QTY" : "NEGATIVE_QTY",
      errorMessage: "Quantity must be positive (POS rule)",
      mappedBranchId: null,
      mappedStaffId: null,
      mappedProductId: null,
      unmatchedStaff: null,
    }
  }

  if (Number(row.amount.toString()) < 0) {
    return {
      status: "INVALID",
      errorCode: "NEGATIVE_AMOUNT",
      errorMessage: "Negative line amount requires manual review",
      mappedBranchId: null,
      mappedStaffId: null,
      mappedProductId: null,
      unmatchedStaff: null,
    }
  }

  const branchCode = formatShopBranchCode(row.legacyBranchId)
  const branch = branchCode ? maps.branchByCode.get(branchCode) : undefined
  if (!branch) {
    return {
      status: "INVALID",
      errorCode: "UNMATCHED_BRANCH",
      errorMessage: `Branch not found for S_ID ${row.legacyBranchId} (${branchCode || "blank"})`,
      mappedBranchId: null,
      mappedStaffId: null,
      mappedProductId: null,
      unmatchedStaff: null,
    }
  }

  const product = maps.productByCode.get(row.legacyProductCode)
  if (!product) {
    return {
      status: "INVALID",
      errorCode: "UNMATCHED_PRODUCT",
      errorMessage: `Product not found for I_ID ${row.legacyProductCode}`,
      mappedBranchId: branch.id,
      mappedStaffId: null,
      mappedProductId: null,
      unmatchedStaff: null,
    }
  }

  let mappedStaffId: string | null = null
  let unmatchedStaff: string | null = null
  if (row.legacyStaffId) {
    const staff = maps.staffByStaffId.get(row.legacyStaffId)
    if (staff) {
      mappedStaffId = staff.staffId
    } else {
      unmatchedStaff = row.legacyStaffId
    }
  }

  return {
    status: "VALID",
    errorCode: unmatchedStaff ? "UNMATCHED_STAFF" : null,
    errorMessage: unmatchedStaff
      ? `Staff ${unmatchedStaff} not found — sale will import without staffId`
      : null,
    mappedBranchId: branch.id,
    mappedStaffId,
    mappedProductId: product.id,
    unmatchedStaff,
  }
}

export async function runLegacySalesValidateStaging(
  db: Pick<
    PrismaClient,
    "legacySalesImportBatch" | "legacySalesImportRow" | "branch" | "product" | "staff"
  >,
  options: LegacySalesValidateOptions
): Promise<LegacySalesValidationSummary> {
  const batch = await db.legacySalesImportBatch.findUnique({ where: { id: options.batchId } })
  if (!batch) {
    throw new Error(`Import batch not found: ${options.batchId}`)
  }

  const rows = await db.legacySalesImportRow.findMany({
    where: {
      importBatchId: options.batchId,
      status: { in: ["PENDING", "VALID", "INVALID"] },
    },
    orderBy: [{ sourceRowNo: "asc" }],
  })

  const [branches, products, staffRows] = await Promise.all([
    db.branch.findMany({
      where: { deleted: false, isActive: true },
      select: { id: true, code: true },
    }),
    db.product.findMany({
      where: { deleted: false },
      select: { id: true, code: true },
    }),
    db.staff.findMany({
      where: { deleted: false },
      select: { staffId: true },
    }),
  ])

  const maps: ValidationMaps = {
    branchByCode: new Map(branches.map((branch) => [branch.code, { id: branch.id }])),
    productByCode: new Map(products.map((product) => [product.code, { id: product.id }])),
    staffByStaffId: new Map(staffRows.map((staff) => [staff.staffId, { staffId: staff.staffId }])),
  }

  const unmatchedBranches = new Set<string>()
  const unmatchedProducts = new Set<string>()
  const unmatchedStaff = new Set<string>()
  let negativeQtyRows = 0
  let negativeAmountRows = 0
  let zeroQtyRows = 0
  let validRows = 0
  let invalidRows = 0

  const evaluated = rows.map((row) => {
    const result = evaluateLegacySalesRow(row, maps)
    if (result.status === "INVALID") {
      invalidRows++
      if (result.errorCode === "UNMATCHED_BRANCH") unmatchedBranches.add(row.legacyBranchId)
      if (result.errorCode === "UNMATCHED_PRODUCT") unmatchedProducts.add(row.legacyProductCode)
      if (result.errorCode === "NEGATIVE_QTY") negativeQtyRows++
      if (result.errorCode === "ZERO_QTY") zeroQtyRows++
      if (result.errorCode === "NEGATIVE_AMOUNT") negativeAmountRows++
    } else {
      validRows++
      if (result.unmatchedStaff) unmatchedStaff.add(result.unmatchedStaff)
    }
    return { row, result }
  })

  if (options.apply) {
    for (const { row, result } of evaluated) {
      await db.legacySalesImportRow.update({
        where: { id: row.id },
        data: {
          status: result.status,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          mappedBranchId: result.mappedBranchId,
          mappedStaffId: result.mappedStaffId,
          mappedProductId: result.mappedProductId,
        },
      })
    }

    await db.legacySalesImportBatch.update({
      where: { id: options.batchId },
      data: {
        status: "VALIDATED",
        invalidRows,
        finishedAt: new Date(),
      },
    })
  }

  const validRowRefs: LegacySalesRowRef[] = evaluated
    .filter(({ result }) => result.status === "VALID")
    .map(({ row, result }) => ({
      ...row,
      mappedBranchId: result.mappedBranchId,
      mappedStaffId: result.mappedStaffId,
      mappedProductId: result.mappedProductId,
    }))

  const aggregates = buildLegacySalesValidationAggregates(validRowRefs)

  return {
    batchId: options.batchId,
    mode: options.apply ? "apply" : "dry-run",
    pendingRows: rows.length,
    validRows,
    invalidRows,
    unmatchedBranches: [...unmatchedBranches].sort(),
    unmatchedProducts: [...unmatchedProducts].sort(),
    unmatchedStaff: [...unmatchedStaff].sort(),
    negativeQtyRows,
    negativeAmountRows,
    zeroQtyRows,
    byDate: aggregates.byDate,
    byBranch: aggregates.byBranch,
    totals: aggregates.totals,
  }
}

export function printLegacySalesValidationSummary(summary: LegacySalesValidationSummary): void {
  console.log("\n=== Legacy Sales Validation Summary ===")
  console.log(`Mode: ${summary.mode}`)
  console.log(`Batch ID: ${summary.batchId}`)
  console.log(`Rows evaluated: ${summary.pendingRows}`)
  console.log(`Valid: ${summary.validRows}`)
  console.log(`Invalid: ${summary.invalidRows}`)
  console.log(`Zero qty rows: ${summary.zeroQtyRows}`)
  console.log(`Negative qty rows: ${summary.negativeQtyRows}`)
  console.log(`Negative amount rows: ${summary.negativeAmountRows}`)
  console.log(
    `Totals — transactions: ${summary.totals.transactionCount}, lines: ${summary.totals.lineCount}, amount: ${summary.totals.totalAmount.toFixed(2)}`
  )

  if (summary.unmatchedBranches.length > 0) {
    console.log(`Unmatched branches (${summary.unmatchedBranches.length}): ${summary.unmatchedBranches.join(", ")}`)
  }
  if (summary.unmatchedProducts.length > 0) {
    console.log(`Unmatched products (${summary.unmatchedProducts.length}): ${summary.unmatchedProducts.slice(0, 30).join(", ")}`)
    if (summary.unmatchedProducts.length > 30) {
      console.log(`  ... and ${summary.unmatchedProducts.length - 30} more`)
    }
  }
  if (summary.unmatchedStaff.length > 0) {
    console.log(`Unmatched staff (${summary.unmatchedStaff.length}): ${summary.unmatchedStaff.join(", ")}`)
  }

  console.log("\nBy date (valid rows):")
  for (const row of summary.byDate.slice(0, 10)) {
    console.log(
      `  ${row.key}: tx=${row.transactionCount}, lines=${row.lineCount}, amount=${row.totalAmount.toFixed(2)}`
    )
  }
}
