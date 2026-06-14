import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { PaymentMethod } from "@/generated/prisma/client"
import { createPaymentRow } from "@/lib/pos/payment"
import { allocateReceiptNo, createReceiptRow } from "@/lib/pos/receipt"
import { toDec, ZERO } from "@/lib/stock/decimal"
import { parseLegacySaleDate } from "./normalize-row"
import { buildLegacyTransactionKey } from "./transaction-key"
import type { LegacySalesConvertOptions, LegacySalesConvertSummary, LegacySalesRowRef } from "./types"

type TransactionGroup = {
  key: string
  mappedBranchId: string
  legacyBranchId: string
  legacyDate: string
  legacyTransNo: string
  legacyTime: string
  mappedStaffId: string | null
  saleAt: Date
  legacySaleDate: string
  lines: LegacySalesRowRef[]
}

function groupValidLegacySalesRows(rows: LegacySalesRowRef[]): TransactionGroup[] {
  const groups = new Map<string, TransactionGroup>()

  for (const row of rows) {
    if (!row.mappedBranchId || !row.mappedProductId || !row.normalizedSaleDateTime) continue

    const key = buildLegacyTransactionKey({
      legacyBranchId: row.legacyBranchId,
      legacyDate: row.legacyDate,
      legacyTransNo: row.legacyTransNo,
    })

    const legacySaleDate =
      parseLegacySaleDate(row.legacyDate)?.dateKey ??
      row.normalizedSaleDateTime.toISOString().slice(0, 10)

    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, {
        key,
        mappedBranchId: row.mappedBranchId,
        legacyBranchId: row.legacyBranchId,
        legacyDate: row.legacyDate,
        legacyTransNo: row.legacyTransNo,
        legacyTime: row.legacyTime,
        mappedStaffId: row.mappedStaffId,
        saleAt: row.normalizedSaleDateTime,
        legacySaleDate,
        lines: [row],
      })
      continue
    }

    existing.lines.push(row)
    if (!existing.mappedStaffId && row.mappedStaffId) {
      existing.mappedStaffId = row.mappedStaffId
    }
  }

  return [...groups.values()].sort((a, b) => a.saleAt.getTime() - b.saleAt.getTime())
}

async function createLegacyImportedSale(
  tx: Prisma.TransactionClient,
  input: {
    group: TransactionGroup
    sourceFileName: string
    importBatchId: string
    productsById: Map<string, { productType: string }>
  }
) {
  let total = ZERO
  const lineCreates: Array<{
    productId: string
    productType: "TRACKED" | "CONSUMABLE"
    qty: number
    unitPrice: Prisma.Decimal
    lineTotal: Prisma.Decimal
  }> = []

  for (const row of input.group.lines) {
    const product = input.productsById.get(row.mappedProductId!)
    if (!product) {
      throw new Error(`Missing product ${row.mappedProductId} during convert`)
    }

    const lineTotal = toDec(row.amount.toString())
    const unitPrice = lineTotal.div(row.qty)
    total = total.plus(lineTotal)
    lineCreates.push({
      productId: row.mappedProductId!,
      productType: product.productType as "TRACKED" | "CONSUMABLE",
      qty: row.qty,
      unitPrice,
      lineTotal,
    })
  }

  const sale = await tx.sale.create({
    data: {
      branchId: input.group.mappedBranchId,
      staffId: input.group.mappedStaffId,
      total,
      createdAt: input.group.saleAt,
    },
  })

  for (const line of lineCreates) {
    await tx.saleItem.create({
      data: {
        saleId: sale.id,
        productId: line.productId,
        productType: line.productType,
        qty: line.qty,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        ledgerSkippedReason: line.productType === "CONSUMABLE" ? "CONSUMABLE" : null,
      },
    })
  }

  await createPaymentRow(tx, {
    saleId: sale.id,
    method: PaymentMethod.CASH,
    amount: total,
    change: ZERO,
  })

  const receiptNo = await allocateReceiptNo(tx, input.group.mappedBranchId, input.group.saleAt)
  const receipt = await createReceiptRow(tx, {
    saleId: sale.id,
    branchId: input.group.mappedBranchId,
    receiptNo,
    issuedAt: input.group.saleAt,
  })

  await tx.legacySaleReference.create({
    data: {
      saleId: sale.id,
      importBatchId: input.importBatchId,
      sourceFileName: input.sourceFileName,
      legacyTransNo: input.group.legacyTransNo,
      legacyBranchId: input.group.legacyBranchId,
      legacySaleDate: input.group.legacySaleDate,
      legacySaleTime: input.group.legacyTime || null,
    },
  })

  return { sale, receipt }
}

export async function runLegacySalesConvertStaging(
  db: PrismaClient,
  options: LegacySalesConvertOptions
): Promise<LegacySalesConvertSummary> {
  const batch = await db.legacySalesImportBatch.findUnique({ where: { id: options.batchId } })
  if (!batch) {
    throw new Error(`Import batch not found: ${options.batchId}`)
  }

  const rows = await db.legacySalesImportRow.findMany({
    where: {
      importBatchId: options.batchId,
      status: "VALID",
    },
    orderBy: [{ normalizedSaleDateTime: "asc" }, { sourceRowNo: "asc" }],
  })

  const groups = groupValidLegacySalesRows(rows)
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount.toString()), 0)
  const errors: string[] = []
  let createdSales = 0
  let skippedAlreadyImported = 0

  if (!options.apply) {
    return {
      batchId: options.batchId,
      mode: "dry-run",
      transactionGroups: groups.length,
      lineCount: rows.length,
      totalAmount,
      wouldCreateSales: groups.length,
      createdSales: 0,
      skippedAlreadyImported: 0,
      errors,
    }
  }

  const products = await db.product.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.mappedProductId).filter(Boolean))] as string[] } },
    select: { id: true, productType: true },
  })
  const productsById = new Map(products.map((product) => [product.id, product]))

  await db.legacySalesImportBatch.update({
    where: { id: options.batchId },
    data: { status: "CONVERTING" },
  })

  for (const group of groups) {
    const existingRef = await db.legacySaleReference.findUnique({
      where: {
        sourceFileName_legacyBranchId_legacySaleDate_legacyTransNo: {
          sourceFileName: batch.sourceFileName,
          legacyBranchId: group.legacyBranchId,
          legacySaleDate: group.legacySaleDate,
          legacyTransNo: group.legacyTransNo,
        },
      },
    })

    if (existingRef) {
      skippedAlreadyImported++
      const receipt = await db.receipt.findUnique({
        where: { saleId: existingRef.saleId },
        select: { id: true },
      })
      await db.legacySalesImportRow.updateMany({
        where: { id: { in: group.lines.map((line) => line.id) } },
        data: {
          status: "IMPORTED",
          createdSaleId: existingRef.saleId,
          createdReceiptId: receipt?.id ?? null,
        },
      })
      continue
    }

    try {
      const result = await db.$transaction(async (tx) => {
        const created = await createLegacyImportedSale(tx, {
          group,
          sourceFileName: batch.sourceFileName,
          importBatchId: batch.id,
          productsById,
        })

        await tx.legacySalesImportRow.updateMany({
          where: { id: { in: group.lines.map((line) => line.id) } },
          data: {
            status: "IMPORTED",
            createdSaleId: created.sale.id,
            createdReceiptId: created.receipt.id,
          },
        })

        return created
      })

      if (result) createdSales++
    } catch (error) {
      errors.push(
        `${group.key}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  await db.legacySalesImportBatch.update({
    where: { id: options.batchId },
    data: {
      status: errors.length > 0 ? "FAILED" : "COMPLETED",
      importedTransactions: createdSales + skippedAlreadyImported,
      importedLines: rows.length,
      finishedAt: new Date(),
    },
  })

  return {
    batchId: options.batchId,
    mode: "apply",
    transactionGroups: groups.length,
    lineCount: rows.length,
    totalAmount,
    wouldCreateSales: groups.length,
    createdSales,
    skippedAlreadyImported,
    errors,
  }
}

export function printLegacySalesConvertSummary(summary: LegacySalesConvertSummary): void {
  console.log("\n=== Legacy Sales Convert Summary ===")
  console.log(`Mode: ${summary.mode}`)
  console.log(`Batch ID: ${summary.batchId}`)
  console.log(`Transaction groups: ${summary.transactionGroups}`)
  console.log(`Line count: ${summary.lineCount}`)
  console.log(`Total amount: ${summary.totalAmount.toFixed(2)}`)
  if (summary.mode === "dry-run") {
    console.log(`Would create sales: ${summary.wouldCreateSales}`)
  } else {
    console.log(`Created sales: ${summary.createdSales}`)
    console.log(`Skipped already imported: ${summary.skippedAlreadyImported}`)
  }
  if (summary.errors.length > 0) {
    console.log(`Errors (${summary.errors.length}):`)
    for (const error of summary.errors.slice(0, 20)) {
      console.log(`  - ${error}`)
    }
  }
}

export { groupValidLegacySalesRows }
