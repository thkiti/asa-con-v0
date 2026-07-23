import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import {
  evaluateEndCompleteness,
  serializeCompletenessNotes,
} from "./end-completeness"
import { EndError, EndErrorCodes } from "./end-errors"
import {
  isPeriodHardClosed,
  loadPriorLockedEnd,
} from "./end-period-guards"
import { isInitialEndPeriod, previousPeriodMonth } from "./end-period"
import type { LockEndInput, LockEndResult } from "./end-types"

export async function lockEndDocument(
  input: LockEndInput
): Promise<LockEndResult> {
  const documentId = String(input.documentId ?? "").trim()
  const staffId = String(input.staffId ?? "").trim()
  if (!documentId || !staffId) {
    throw new EndError(
      "documentId and staffId are required",
      EndErrorCodes.INVALID_INPUT
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<LockEndResult> => {
    const doc = await tx.stockDocument.findUnique({
      where: { id: documentId },
      include: { endLines: true },
    })

    if (!doc || doc.docType !== "END") {
      throw new EndError("END document not found", EndErrorCodes.END_NOT_FOUND, 404)
    }
    if (doc.endStatus === "LOCKED") {
      throw new EndError("END is already locked", EndErrorCodes.END_LOCKED, 409)
    }
    if (!doc.periodMonth) {
      throw new EndError("END periodMonth is missing", EndErrorCodes.INVALID_PERIOD)
    }

    const periodHardClosed = await isPeriodHardClosed(
      tx,
      doc.legalEntityCode,
      doc.periodMonth
    )

    let priorEndLocked = true
    if (!isInitialEndPeriod(doc.periodMonth)) {
      const prior = await loadPriorLockedEnd(tx, {
        legalEntityCode: doc.legalEntityCode,
        branchId: doc.branchId,
        priorPeriodMonth: previousPeriodMonth(doc.periodMonth),
      })
      priorEndLocked = prior?.endStatus === "LOCKED"
    }

    const countSource = await tx.stockDocument.findFirst({
      where: {
        docType: "ADJUSTMENT",
        status: "POSTED",
        branchId: doc.branchId,
        fromLocId: doc.branchId,
        periodMonth: doc.periodMonth,
      },
      select: { id: true },
    })

    const completeness = evaluateEndCompleteness({
      document: doc,
      lines: doc.endLines,
      countSourceMissing: !countSource,
      priorEndLocked,
      periodHardClosed,
    })

    if (!completeness.ok) {
      await tx.stockDocument.update({
        where: { id: doc.id },
        data: {
          endCompletenessOk: false,
          endCompletenessNotes: serializeCompletenessNotes(completeness),
        },
      })
      throw new EndError(
        completeness.blockers[0]?.message ?? "END completeness blocked",
        EndErrorCodes.COMPLETENESS_BLOCKED,
        409
      )
    }

    const now = new Date()
    const document = await tx.stockDocument.update({
      where: { id: doc.id },
      data: {
        endStatus: "LOCKED",
        endLockedAt: now,
        endLockedByStaffId: staffId,
        endCompletenessOk: true,
        endCompletenessNotes: serializeCompletenessNotes(completeness),
      },
    })

    await tx.endAuditEvent.create({
      data: {
        documentId: doc.id,
        eventType: "LOCKED",
        byStaffId: staffId,
        payload: {
          lockedAt: now.toISOString(),
          lineCount: doc.endLines.length,
          endTotalAdjAmount: document.endTotalAdjAmount,
        },
      },
    })

    return { document }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
