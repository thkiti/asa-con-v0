import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { addMoney } from "@/lib/finance/decimal"
import { prisma } from "@/lib/shared/prisma"
import { calcEndLine, sumAdjAmounts } from "./end-calc"
import {
  evaluateEndCompleteness,
  serializeCompletenessNotes,
} from "./end-completeness"
import { EndError, EndErrorCodes } from "./end-errors"
import {
  assertPeriodNotHardClosed,
  isPeriodHardClosed,
  loadPriorLockedEnd,
} from "./end-period-guards"
import { isInitialEndPeriod, periodBounds, previousPeriodMonth } from "./end-period"
import {
  collectEndSources,
  loadSellingPriceSnapshots,
} from "./end-sources"
import type { RebuildEndInput, RebuildEndResult } from "./end-types"

export async function rebuildEndDocument(
  input: RebuildEndInput
): Promise<RebuildEndResult> {
  const documentId = String(input.documentId ?? "").trim()
  const staffId = String(input.staffId ?? "").trim()
  if (!documentId || !staffId) {
    throw new EndError(
      "documentId and staffId are required",
      EndErrorCodes.INVALID_INPUT
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<RebuildEndResult> => {
    const doc = await tx.stockDocument.findUnique({
      where: { id: documentId },
      include: { endLines: true },
    })

    if (!doc || doc.docType !== "END") {
      throw new EndError("END document not found", EndErrorCodes.END_NOT_FOUND, 404)
    }
    if (doc.endStatus === "LOCKED") {
      throw new EndError("Cannot rebuild a locked END", EndErrorCodes.END_LOCKED, 409)
    }
    if (!doc.periodMonth) {
      throw new EndError("END periodMonth is missing", EndErrorCodes.INVALID_PERIOD)
    }

    await assertPeriodNotHardClosed(tx, doc.legalEntityCode, doc.periodMonth)

    const existingByProduct = new Map(
      doc.endLines.map((line) => [line.productId, line] as const)
    )

    const beginByProduct = new Map<string, number>()
    const beginManualByProduct = new Map<string, boolean>()
    const countManualByProduct = new Map<string, number | null>()
    const countManualFlag = new Map<string, boolean>()

    const initial = isInitialEndPeriod(doc.periodMonth)

    for (const line of doc.endLines) {
      if (line.beginManual) {
        beginByProduct.set(line.productId, line.beginQty)
        beginManualByProduct.set(line.productId, true)
      }
      if (line.countManual) {
        countManualByProduct.set(line.productId, line.countQty)
        countManualFlag.set(line.productId, true)
      }
    }

    let priorEndLocked = true
    if (!initial) {
      const priorMonth = previousPeriodMonth(doc.periodMonth)
      const prior = await loadPriorLockedEnd(tx, {
        legalEntityCode: doc.legalEntityCode,
        branchId: doc.branchId,
        priorPeriodMonth: priorMonth,
      })
      priorEndLocked = prior?.endStatus === "LOCKED"
      if (prior?.endStatus === "LOCKED") {
        for (const line of prior.lines) {
          if (line.endingQty == null) continue
          if (beginManualByProduct.get(line.productId)) continue
          beginByProduct.set(line.productId, line.endingQty)
          beginManualByProduct.set(line.productId, false)
        }
      }
    } else {
      for (const line of doc.endLines) {
        if (beginManualByProduct.get(line.productId)) continue
        beginByProduct.set(line.productId, line.beginQty)
      }
    }

    const sources = await collectEndSources(tx, {
      branchId: doc.branchId,
      periodMonth: doc.periodMonth,
      legalEntityCode: doc.legalEntityCode,
    })

    const productIds = new Set<string>()
    for (const id of beginByProduct.keys()) productIds.add(id)
    for (const id of sources.inByProduct.keys()) productIds.add(id)
    for (const id of sources.usageByProduct.keys()) productIds.add(id)
    for (const id of sources.countByProduct.keys()) productIds.add(id)
    for (const id of countManualByProduct.keys()) productIds.add(id)

    const { end: periodEnd } = periodBounds(doc.periodMonth)
    const prices = await loadSellingPriceSnapshots(tx, [...productIds], periodEnd)

    const lineRows: Prisma.EndLineCreateManyInput[] = []
    const contributionRows: Prisma.EndSourceContributionCreateManyInput[] = []

    for (const productId of productIds) {
      const beginQty = beginByProduct.get(productId) ?? 0
      const inQty = sources.inByProduct.get(productId) ?? 0
      const usageQty = sources.usageByProduct.get(productId) ?? 0
      const beginManual = beginManualByProduct.get(productId) ?? false
      const countManual = countManualFlag.get(productId) ?? false

      let countQty: number | null = null
      let countIncomplete = false

      if (countManual && countManualByProduct.has(productId)) {
        countQty = countManualByProduct.get(productId) ?? null
        countIncomplete = countQty == null
      } else if (sources.countByProduct.has(productId)) {
        countQty = sources.countByProduct.get(productId) ?? null
        countIncomplete = countQty == null
      } else if (sources.countIncomplete) {
        countQty = null
        countIncomplete = true
      } else {
        // CNT exists but product not on CNT sheet
        countQty = null
        countIncomplete = true
      }

      const priceSnap = prices.get(productId) ?? null
      const priceIncomplete = priceSnap == null
      const calc = calcEndLine({
        beginQty,
        inQty,
        usageQty,
        countQty,
        sellingPrice: priceSnap?.price ?? null,
      })

      // Omit all-zero lines with no count and no manual markers
      const hasSignal =
        beginQty !== 0 ||
        inQty !== 0 ||
        usageQty !== 0 ||
        countQty != null ||
        beginManual ||
        countManual ||
        existingByProduct.has(productId)

      if (!hasSignal) continue

      lineRows.push({
        documentId: doc.id,
        productId,
        beginQty,
        inQty,
        usageQty,
        actualQty: calc.actualQty,
        countQty,
        endingQty: calc.endingQty,
        adjQty: calc.adjQty,
        sellingPriceSnapshot: priceSnap?.price ?? null,
        sellingPriceSource: priceSnap?.source ?? null,
        sellingPriceEffectiveFrom: priceSnap?.effectiveFrom ?? null,
        adjAmount: calc.adjAmount,
        beginManual,
        countManual,
        priceIncomplete,
        countIncomplete,
      })
    }

    for (const c of sources.contributions) {
      if (!productIds.has(c.productId)) continue
      contributionRows.push({
        documentId: doc.id,
        productId: c.productId,
        sourceDocumentType: c.sourceDocumentType,
        sourceDocumentId: c.sourceDocumentId,
        sourceLineId: c.sourceLineId,
        contributionKind: c.contributionKind,
        quantity: c.quantity,
      })
    }

    await tx.endSourceContribution.deleteMany({ where: { documentId: doc.id } })
    await tx.endLine.deleteMany({ where: { documentId: doc.id } })

    if (lineRows.length > 0) {
      await tx.endLine.createMany({ data: lineRows })
    }
    if (contributionRows.length > 0) {
      await tx.endSourceContribution.createMany({ data: contributionRows })
    }

    const totalAdj = sumAdjAmounts(lineRows.map((l) => l.adjAmount as Prisma.Decimal | null))
    const totalSales = addMoney(sources.trackableSales, sources.untrackableSales)

    const periodHardClosed = await isPeriodHardClosed(
      tx,
      doc.legalEntityCode,
      doc.periodMonth
    )

    const completeness = evaluateEndCompleteness({
      document: doc,
      lines: lineRows.map((l) => ({
        productId: l.productId,
        beginQty: l.beginQty ?? 0,
        inQty: l.inQty ?? 0,
        usageQty: l.usageQty ?? 0,
        actualQty: l.actualQty ?? 0,
        countQty: l.countQty ?? null,
        endingQty: l.endingQty ?? null,
        adjQty: l.adjQty ?? null,
        priceIncomplete: Boolean(l.priceIncomplete),
        countIncomplete: Boolean(l.countIncomplete),
        countManual: Boolean(l.countManual),
        beginManual: Boolean(l.beginManual),
      })),
      countSourceMissing: sources.countIncomplete,
      priorEndLocked,
      periodHardClosed,
      extraWarnings: sources.warnings.map((message) => ({
        code: "SOURCE_WARNING",
        message,
        blocking: false,
      })),
    })

    const version = (doc.endSourceRebuildVersion ?? 0) + 1
    const now = new Date()

    const document = await tx.stockDocument.update({
      where: { id: doc.id },
      data: {
        endSourceRebuildVersion: version,
        endRebuiltAt: now,
        endRebuiltByStaffId: staffId,
        endCompletenessOk: completeness.ok,
        endCompletenessNotes: serializeCompletenessNotes(completeness),
        endTotalAdjAmount: totalAdj,
        endTrackableSales: sources.trackableSales,
        endUntrackableSales: sources.untrackableSales,
        endTotalSales: totalSales,
        endRefundsTotal: sources.refundsTotal,
        endStatus:
          doc.endStatus === "READY_FOR_REVIEW" && !completeness.ok
            ? "DRAFT"
            : doc.endStatus,
      },
    })

    await tx.endAuditEvent.create({
      data: {
        documentId: doc.id,
        eventType: "REBUILT",
        byStaffId: staffId,
        payload: {
          version,
          lineCount: lineRows.length,
          contributionCount: contributionRows.length,
          completenessOk: completeness.ok,
          countSourceDocId: sources.countSourceDocId,
        },
      },
    })

    return {
      document,
      lineCount: lineRows.length,
      contributionCount: contributionRows.length,
      completeness,
    }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
