import "server-only"

import type {
  EndContributionKind,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import { periodBounds } from "./end-period"

type DbClient = Prisma.TransactionClient | PrismaClient

export type EndContributionDraft = {
  productId: string
  sourceDocumentType: string
  sourceDocumentId: string
  sourceLineId: string
  contributionKind: EndContributionKind
  quantity: number
}

export type SellingPriceSnapshot = {
  price: Prisma.Decimal
  effectiveFrom: Date
  source: string
}

export type EndCollectedSources = {
  contributions: EndContributionDraft[]
  inByProduct: Map<string, number>
  usageByProduct: Map<string, number>
  countByProduct: Map<string, number>
  countSourceDocId: string | null
  countIncomplete: boolean
  warnings: string[]
  trackableSales: Prisma.Decimal
  untrackableSales: Prisma.Decimal
  refundsTotal: Prisma.Decimal
}

function addQty(map: Map<string, number>, productId: string, qty: number): void {
  map.set(productId, (map.get(productId) ?? 0) + qty)
}

function pushContribution(
  contributions: EndContributionDraft[],
  draft: EndContributionDraft
): void {
  contributions.push(draft)
}

/** REC USAGE for AS (ASAS) shop END — never reads Stock / StockTransaction / StockLayer. */
export async function collectRecUsage(
  db: DbClient,
  input: { branchId: string; periodMonth: string; legalEntityCode: string }
): Promise<{
  contributions: EndContributionDraft[]
  usageByProduct: Map<string, number>
  trackableSales: Prisma.Decimal
  untrackableSales: Prisma.Decimal
  refundsTotal: Prisma.Decimal
}> {
  const contributions: EndContributionDraft[] = []
  const usageByProduct = new Map<string, number>()
  let trackableSales = ZERO
  let untrackableSales = ZERO

  if (String(input.legalEntityCode).trim().toUpperCase() !== "AS") {
    const refundsTotal = await sumRefunds(db, input.branchId, input.periodMonth)
    return {
      contributions,
      usageByProduct,
      trackableSales,
      untrackableSales,
      refundsTotal,
    }
  }

  const { start, end } = periodBounds(input.periodMonth)

  const sales = await db.sale.findMany({
    where: {
      branchId: input.branchId,
      status: "COMPLETED",
      createdAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      items: {
        select: {
          id: true,
          productId: true,
          productType: true,
          qty: true,
          lineTotal: true,
        },
      },
    },
  })

  for (const sale of sales) {
    for (const item of sale.items) {
      const lineTotal = toMoney(item.lineTotal)
      if (item.productType === "TRACKED" && item.productId) {
        addQty(usageByProduct, item.productId, item.qty)
        trackableSales = addMoney(trackableSales, lineTotal)
        pushContribution(contributions, {
          productId: item.productId,
          sourceDocumentType: "REC",
          sourceDocumentId: sale.id,
          sourceLineId: item.id,
          contributionKind: "USAGE",
          quantity: item.qty,
        })
      } else if (item.productType === "CONSUMABLE") {
        untrackableSales = addMoney(untrackableSales, lineTotal)
      }
    }
  }

  const refundsTotal = await sumRefunds(db, input.branchId, input.periodMonth)

  return {
    contributions,
    usageByProduct,
    trackableSales,
    untrackableSales,
    refundsTotal,
  }
}

async function sumRefunds(
  db: DbClient,
  branchId: string,
  periodMonth: string
): Promise<Prisma.Decimal> {
  const { start, end } = periodBounds(periodMonth)
  const agg = await db.refund.aggregate({
    where: {
      branchId,
      createdAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  })
  return toMoney(agg._sum.amount)
}

/**
 * DEY = TRANSFER_OUT with shopReceivedAt set.
 * ASAS shop END: toLocId=shop → IN
 * ASAD HO END: fromLocId=HO → USAGE
 */
export async function collectDeyContributions(
  db: DbClient,
  input: { branchId: string; periodMonth: string; legalEntityCode: string }
): Promise<{
  contributions: EndContributionDraft[]
  inByProduct: Map<string, number>
  usageByProduct: Map<string, number>
}> {
  const contributions: EndContributionDraft[] = []
  const inByProduct = new Map<string, number>()
  const usageByProduct = new Map<string, number>()
  const entity = String(input.legalEntityCode).trim().toUpperCase()
  const { start, end } = periodBounds(input.periodMonth)

  const where =
    entity === "AD"
      ? {
          docType: "TRANSFER_OUT" as const,
          fromLocId: input.branchId,
          shopReceivedAt: { not: null, gte: start, lte: end },
          status: { not: "CANCELLED" as const },
        }
      : {
          docType: "TRANSFER_OUT" as const,
          toLocId: input.branchId,
          shopReceivedAt: { not: null, gte: start, lte: end },
          status: { not: "CANCELLED" as const },
        }

  const docs = await db.stockDocument.findMany({
    where,
    select: {
      id: true,
      lines: {
        select: {
          id: true,
          productId: true,
          qty: true,
          receivedQty: true,
        },
      },
    },
  })

  const kind: EndContributionKind = entity === "AD" ? "USAGE" : "IN"

  for (const doc of docs) {
    for (const line of doc.lines) {
      const qty = line.receivedQty ?? line.qty
      if (!Number.isFinite(qty) || qty === 0) continue
      if (kind === "IN") addQty(inByProduct, line.productId, qty)
      else addQty(usageByProduct, line.productId, qty)
      pushContribution(contributions, {
        productId: line.productId,
        sourceDocumentType: "DEY",
        sourceDocumentId: doc.id,
        sourceLineId: line.id,
        contributionKind: kind,
        quantity: qty,
      })
    }
  }

  return { contributions, inByProduct, usageByProduct }
}

/** ASAD HO IN from POSTED PURCHASE / TRANSFER_IN into HO. */
export async function collectAsadInContributions(
  db: DbClient,
  input: { branchId: string; periodMonth: string; legalEntityCode: string }
): Promise<{
  contributions: EndContributionDraft[]
  inByProduct: Map<string, number>
}> {
  const contributions: EndContributionDraft[] = []
  const inByProduct = new Map<string, number>()

  if (String(input.legalEntityCode).trim().toUpperCase() !== "AD") {
    return { contributions, inByProduct }
  }

  const { start, end } = periodBounds(input.periodMonth)

  const docs = await db.stockDocument.findMany({
    where: {
      docType: { in: ["PURCHASE", "TRANSFER_IN"] },
      status: "POSTED",
      toLocId: input.branchId,
      OR: [
        { periodMonth: input.periodMonth },
        { date: { gte: start, lte: end } },
      ],
    },
    select: {
      id: true,
      docType: true,
      lines: {
        select: { id: true, productId: true, qty: true },
      },
    },
  })

  for (const doc of docs) {
    const sourceDocumentType =
      doc.docType === "PURCHASE" ? "PURCHASE" : "TRANSFER_IN"
    for (const line of doc.lines) {
      if (!Number.isFinite(line.qty) || line.qty === 0) continue
      addQty(inByProduct, line.productId, line.qty)
      pushContribution(contributions, {
        productId: line.productId,
        sourceDocumentType,
        sourceDocumentId: doc.id,
        sourceLineId: line.id,
        contributionKind: "IN",
        quantity: line.qty,
      })
    }
  }

  return { contributions, inByProduct }
}

/** CNT = POSTED ADJUSTMENT for branch+period; latest postedAt wins. */
export async function collectCntCount(
  db: DbClient,
  input: { branchId: string; periodMonth: string }
): Promise<{
  contributions: EndContributionDraft[]
  countByProduct: Map<string, number>
  countSourceDocId: string | null
  countIncomplete: boolean
  warnings: string[]
}> {
  const contributions: EndContributionDraft[] = []
  const countByProduct = new Map<string, number>()
  const warnings: string[] = []

  const posted = await db.stockDocument.findMany({
    where: {
      docType: "ADJUSTMENT",
      status: "POSTED",
      branchId: input.branchId,
      fromLocId: input.branchId,
      periodMonth: input.periodMonth,
    },
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      postedAt: true,
      lines: {
        select: { id: true, productId: true, qty: true },
      },
    },
  })

  if (posted.length === 0) {
    return {
      contributions,
      countByProduct,
      countSourceDocId: null,
      countIncomplete: true,
      warnings,
    }
  }

  if (posted.length > 1) {
    warnings.push(
      `Multiple POSTED CNT documents for period ${input.periodMonth}; using latest postedAt (${posted[0]!.id})`
    )
  }

  const chosen = posted[0]!
  for (const line of chosen.lines) {
    countByProduct.set(line.productId, line.qty)
    pushContribution(contributions, {
      productId: line.productId,
      sourceDocumentType: "CNT",
      sourceDocumentId: chosen.id,
      sourceLineId: line.id,
      contributionKind: "COUNT",
      quantity: line.qty,
    })
  }

  return {
    contributions,
    countByProduct,
    countSourceDocId: chosen.id,
    countIncomplete: false,
    warnings,
  }
}

export async function loadSellingPriceSnapshots(
  db: DbClient,
  productIds: readonly string[],
  periodEnd: Date
): Promise<Map<string, SellingPriceSnapshot | null>> {
  const result = new Map<string, SellingPriceSnapshot | null>()
  if (productIds.length === 0) return result

  const prices = await db.sellingPrice.findMany({
    where: {
      productId: { in: [...productIds] },
      effectiveFrom: { lte: periodEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: periodEnd } }],
    },
    orderBy: { effectiveFrom: "desc" },
    select: {
      productId: true,
      price: true,
      effectiveFrom: true,
    },
  })

  const seen = new Set<string>()
  for (const row of prices) {
    if (seen.has(row.productId)) continue
    seen.add(row.productId)
    result.set(row.productId, {
      price: toMoney(row.price),
      effectiveFrom: row.effectiveFrom,
      source: "SELLING_PRICE",
    })
  }

  for (const productId of productIds) {
    if (!result.has(productId)) result.set(productId, null)
  }

  return result
}

export async function collectEndSources(
  db: DbClient,
  input: { branchId: string; periodMonth: string; legalEntityCode: string }
): Promise<EndCollectedSources> {
  const [rec, dey, asadIn, cnt] = await Promise.all([
    collectRecUsage(db, input),
    collectDeyContributions(db, input),
    collectAsadInContributions(db, input),
    collectCntCount(db, input),
  ])

  const inByProduct = new Map<string, number>()
  const usageByProduct = new Map<string, number>()

  for (const [productId, qty] of dey.inByProduct) addQty(inByProduct, productId, qty)
  for (const [productId, qty] of asadIn.inByProduct) addQty(inByProduct, productId, qty)
  for (const [productId, qty] of dey.usageByProduct) addQty(usageByProduct, productId, qty)
  for (const [productId, qty] of rec.usageByProduct) addQty(usageByProduct, productId, qty)

  return {
    contributions: [
      ...rec.contributions,
      ...dey.contributions,
      ...asadIn.contributions,
      ...cnt.contributions,
    ],
    inByProduct,
    usageByProduct,
    countByProduct: cnt.countByProduct,
    countSourceDocId: cnt.countSourceDocId,
    countIncomplete: cnt.countIncomplete,
    warnings: [...cnt.warnings],
    trackableSales: rec.trackableSales,
    untrackableSales: rec.untrackableSales,
    refundsTotal: rec.refundsTotal,
  }
}
