import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import {
  CashReconciliationError,
  CashReconciliationErrorCodes,
} from "./cash-reconciliation-errors"
import { getCashReconciliationById } from "./cash-reconciliation-read"
import type {
  CashReconciliationRow,
  CashReconciliationWorkflowInput,
} from "./cash-reconciliation-types"

async function loadOrThrow(
  tx: Prisma.TransactionClient,
  input: CashReconciliationWorkflowInput
) {
  const row = await tx.cashReconciliation.findFirst({
    where: { id: input.id.trim(), legalEntityCode: input.legalEntityCode },
  })

  if (!row) {
    throw new CashReconciliationError(
      "Cash reconciliation not found",
      CashReconciliationErrorCodes.NOT_FOUND,
      404
    )
  }

  return row
}

export async function submitCashReconciliation(
  input: CashReconciliationWorkflowInput
): Promise<CashReconciliationRow> {
  const actorStaffId = input.actorStaffId.trim()
  if (!actorStaffId) {
    throw new CashReconciliationError(
      "actorStaffId is required",
      CashReconciliationErrorCodes.VALIDATION
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<CashReconciliationRow> => {
    const row = await loadOrThrow(tx, input)
    if (row.status !== "DRAFT") {
      throw new CashReconciliationError(
        `Only DRAFT cash reconciliations may be submitted (status: ${row.status})`,
        CashReconciliationErrorCodes.INVALID_TRANSITION,
        409
      )
    }

    const now = new Date()
    await tx.cashReconciliation.update({
      where: { id: row.id },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        submittedByStaffId: actorStaffId,
        updatedByStaffId: actorStaffId,
      },
    })

    return getCashReconciliationById(tx, row.id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}

export async function confirmCashReconciliation(
  input: CashReconciliationWorkflowInput
): Promise<CashReconciliationRow> {
  const actorStaffId = input.actorStaffId.trim()
  if (!actorStaffId) {
    throw new CashReconciliationError(
      "actorStaffId is required",
      CashReconciliationErrorCodes.VALIDATION
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<CashReconciliationRow> => {
    const row = await loadOrThrow(tx, input)
    if (row.status !== "SUBMITTED") {
      throw new CashReconciliationError(
        `Only SUBMITTED cash reconciliations may be confirmed (status: ${row.status})`,
        CashReconciliationErrorCodes.INVALID_TRANSITION,
        409
      )
    }

    const now = new Date()
    await tx.cashReconciliation.update({
      where: { id: row.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
        confirmedByStaffId: actorStaffId,
        updatedByStaffId: actorStaffId,
      },
    })

    return getCashReconciliationById(tx, row.id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}

export async function lockCashReconciliation(
  input: CashReconciliationWorkflowInput
): Promise<CashReconciliationRow> {
  const actorStaffId = input.actorStaffId.trim()
  if (!actorStaffId) {
    throw new CashReconciliationError(
      "actorStaffId is required",
      CashReconciliationErrorCodes.VALIDATION
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<CashReconciliationRow> => {
    const row = await loadOrThrow(tx, input)
    if (row.status !== "CONFIRMED" && row.status !== "SUBMITTED") {
      throw new CashReconciliationError(
        `Only SUBMITTED or CONFIRMED cash reconciliations may be locked (status: ${row.status})`,
        CashReconciliationErrorCodes.INVALID_TRANSITION,
        409
      )
    }

    const now = new Date()
    await tx.cashReconciliation.update({
      where: { id: row.id },
      data: {
        status: "LOCKED",
        lockedAt: now,
        lockedByStaffId: actorStaffId,
        updatedByStaffId: actorStaffId,
        ...(row.status === "SUBMITTED"
          ? {
              confirmedAt: row.confirmedAt ?? now,
              confirmedByStaffId: row.confirmedByStaffId ?? actorStaffId,
            }
          : {}),
      },
    })

    return getCashReconciliationById(tx, row.id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}
