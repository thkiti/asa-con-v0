import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { EndError, EndErrorCodes } from "./end-errors"
import { canReopenEnd } from "./end-permissions"
import {
  assertPeriodNotHardClosed,
  hasLaterEnd,
} from "./end-period-guards"
import type { ReopenEndInput, ReopenEndResult } from "./end-types"

export async function reopenEndDocument(
  input: ReopenEndInput
): Promise<ReopenEndResult> {
  const documentId = String(input.documentId ?? "").trim()
  const staffId = String(input.staffId ?? "").trim()
  const reason = String(input.reason ?? "").trim()
  const role = String(input.role ?? "").trim()

  if (!documentId || !staffId) {
    throw new EndError(
      "documentId and staffId are required",
      EndErrorCodes.INVALID_INPUT
    )
  }
  if (!reason) {
    throw new EndError("Reopen reason is required", EndErrorCodes.INVALID_INPUT)
  }
  if (!canReopenEnd(role)) {
    throw new EndError(
      "Only HO_ADMIN or HO_FINANCE may reopen END",
      EndErrorCodes.PERMISSION_DENIED,
      403
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<ReopenEndResult> => {
    const doc = await tx.stockDocument.findUnique({
      where: { id: documentId },
    })

    if (!doc || doc.docType !== "END") {
      throw new EndError("END document not found", EndErrorCodes.END_NOT_FOUND, 404)
    }
    if (doc.endStatus !== "LOCKED") {
      throw new EndError(
        "Only a locked END can be reopened",
        EndErrorCodes.END_NOT_LOCKED,
        409
      )
    }
    if (!doc.periodMonth) {
      throw new EndError("END periodMonth is missing", EndErrorCodes.INVALID_PERIOD)
    }

    await assertPeriodNotHardClosed(tx, doc.legalEntityCode, doc.periodMonth)

    if (
      await hasLaterEnd(tx, {
        legalEntityCode: doc.legalEntityCode,
        branchId: doc.branchId,
        periodMonth: doc.periodMonth,
        excludeDocumentId: doc.id,
      })
    ) {
      throw new EndError(
        "Cannot reopen END while a later period END exists for this entity and branch",
        EndErrorCodes.DOWNSTREAM_END_EXISTS,
        409
      )
    }

    const priorLock = {
      endLockedAt: doc.endLockedAt,
      endLockedByStaffId: doc.endLockedByStaffId,
      endStatus: doc.endStatus,
    }

    const now = new Date()
    const document = await tx.stockDocument.update({
      where: { id: doc.id },
      data: {
        endStatus: "DRAFT",
        endLockedAt: null,
        endLockedByStaffId: null,
        endReopenedAt: now,
        endReopenedByStaffId: staffId,
        endReopenReason: reason,
      },
    })

    await tx.endAuditEvent.create({
      data: {
        documentId: doc.id,
        eventType: "REOPENED",
        byStaffId: staffId,
        reason,
        payload: {
          priorLock,
          reopenedAt: now.toISOString(),
        },
      },
    })

    return { document }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
