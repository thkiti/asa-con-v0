import "server-only"

import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { generateRunningRef } from "@/lib/stock/document/generate-ref"
import { EndError, EndErrorCodes } from "./end-errors"
import {
  assertPeriodNotHardClosed,
  loadPriorLockedEnd,
} from "./end-period-guards"
import {
  endPeriodKey,
  isInitialEndPeriod,
  parsePeriodMonth,
  periodBounds,
  previousPeriodMonth,
} from "./end-period"
import type { GetOrCreateEndInput, GetOrCreateEndResult } from "./end-types"

async function loadEndByKey(
  tx: Prisma.TransactionClient,
  key: string
) {
  return tx.stockDocument.findUnique({
    where: { endPeriodKey: key },
  })
}

export async function getOrCreateEndDocument(
  input: GetOrCreateEndInput
): Promise<GetOrCreateEndResult> {
  const legalEntityCode = String(input.legalEntityCode ?? "").trim().toUpperCase()
  const branchId = String(input.branchId ?? "").trim()
  const periodMonth = String(input.periodMonth ?? "").trim()
  const staffId = String(input.staffId ?? "").trim()

  if (!legalEntityCode || !branchId || !staffId) {
    throw new EndError(
      "legalEntityCode, branchId, and staffId are required",
      EndErrorCodes.INVALID_INPUT
    )
  }
  parsePeriodMonth(periodMonth)
  const key = endPeriodKey(legalEntityCode, branchId, periodMonth)

  const run = async (tx: Prisma.TransactionClient): Promise<GetOrCreateEndResult> => {
    const existing = await loadEndByKey(tx, key)
    if (existing) {
      return { document: existing, created: false }
    }

    await assertPeriodNotHardClosed(tx, legalEntityCode, periodMonth)

    const branch = await tx.branch.findUnique({
      where: { id: branchId },
      select: { id: true, code: true, isActive: true, deleted: true },
    })
    if (!branch || branch.deleted || !branch.isActive) {
      throw new EndError("Branch not found", EndErrorCodes.DOCUMENT_NOT_FOUND, 404)
    }

    const { end: periodEnd } = periodBounds(periodMonth)
    const beginLines: { productId: string; beginQty: number }[] = []

    if (!isInitialEndPeriod(periodMonth)) {
      const priorMonth = previousPeriodMonth(periodMonth)
      const prior = await loadPriorLockedEnd(tx, {
        legalEntityCode,
        branchId,
        priorPeriodMonth: priorMonth,
      })
      if (!prior) {
        throw new EndError(
          `Previous END for ${priorMonth} is required`,
          EndErrorCodes.PRIOR_END_REQUIRED,
          409
        )
      }
      if (prior.endStatus !== "LOCKED") {
        throw new EndError(
          `Previous END for ${priorMonth} must be LOCKED`,
          EndErrorCodes.PRIOR_END_NOT_LOCKED,
          409
        )
      }
      for (const line of prior.lines) {
        if (line.endingQty == null) continue
        beginLines.push({ productId: line.productId, beginQty: line.endingQty })
      }
    }

    const refNo = await generateRunningRef(tx, "END", periodEnd, branch.code)

    try {
      const document = await tx.stockDocument.create({
        data: {
          refNo,
          docType: "END",
          status: "DRAFT",
          date: periodEnd,
          branchId,
          legalEntityCode,
          periodMonth,
          endPeriodKey: key,
          endStatus: "DRAFT",
          endSourceRebuildVersion: 0,
          endCompletenessOk: false,
          createdByStaffId: staffId,
          endLines: {
            create: beginLines.map((line) => ({
              productId: line.productId,
              beginQty: line.beginQty,
              inQty: 0,
              usageQty: 0,
              actualQty: line.beginQty,
              countQty: null,
              endingQty: null,
              adjQty: null,
              beginManual: false,
              countManual: false,
              priceIncomplete: true,
              countIncomplete: true,
            })),
          },
          endAuditEvents: {
            create: {
              eventType: "CREATED",
              byStaffId: staffId,
              payload: {
                legalEntityCode,
                branchId,
                periodMonth,
                beginLineCount: beginLines.length,
              },
            },
          },
        },
      })
      return { document, created: true }
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const raced = await loadEndByKey(tx, key)
        if (raced) return { document: raced, created: false }
      }
      throw err
    }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
