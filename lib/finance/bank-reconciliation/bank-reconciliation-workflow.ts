import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import {
  BankReconciliationError,
  BankReconciliationErrorCodes,
} from "./bank-reconciliation-errors"
import { getBankReconciliationById } from "./bank-reconciliation-read"
import type {
  BankReconciliationRow,
  BankReconciliationWorkflowInput,
} from "./bank-reconciliation-types"

async function loadOrThrow(
  tx: Prisma.TransactionClient,
  input: BankReconciliationWorkflowInput
) {
  const row = await tx.bankReconciliation.findFirst({
    where: { id: input.id.trim(), legalEntityCode: input.legalEntityCode },
  })

  if (!row) {
    throw new BankReconciliationError(
      "Bank reconciliation not found",
      BankReconciliationErrorCodes.NOT_FOUND,
      404
    )
  }

  return row
}

export async function submitBankReconciliation(
  input: BankReconciliationWorkflowInput
): Promise<BankReconciliationRow> {
  const actorStaffId = input.actorStaffId.trim()
  if (!actorStaffId) {
    throw new BankReconciliationError(
      "actorStaffId is required",
      BankReconciliationErrorCodes.VALIDATION
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<BankReconciliationRow> => {
    const row = await loadOrThrow(tx, input)

    if (row.status !== "DRAFT") {
      throw new BankReconciliationError(
        `Only DRAFT bank reconciliations may be submitted (status: ${row.status})`,
        BankReconciliationErrorCodes.INVALID_TRANSITION,
        409
      )
    }

    const now = new Date()
    await tx.bankReconciliation.update({
      where: { id: row.id },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        submittedByStaffId: actorStaffId,
        updatedByStaffId: actorStaffId,
      },
    })

    return getBankReconciliationById(tx, row.id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}

export async function confirmBankReconciliation(
  input: BankReconciliationWorkflowInput
): Promise<BankReconciliationRow> {
  const actorStaffId = input.actorStaffId.trim()
  if (!actorStaffId) {
    throw new BankReconciliationError(
      "actorStaffId is required",
      BankReconciliationErrorCodes.VALIDATION
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<BankReconciliationRow> => {
    const row = await loadOrThrow(tx, input)

    if (row.status !== "SUBMITTED") {
      throw new BankReconciliationError(
        `Only SUBMITTED bank reconciliations may be confirmed (status: ${row.status})`,
        BankReconciliationErrorCodes.INVALID_TRANSITION,
        409
      )
    }

    const now = new Date()
    await tx.bankReconciliation.update({
      where: { id: row.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
        confirmedByStaffId: actorStaffId,
        updatedByStaffId: actorStaffId,
      },
    })

    return getBankReconciliationById(tx, row.id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}

export async function lockBankReconciliation(
  input: BankReconciliationWorkflowInput
): Promise<BankReconciliationRow> {
  const actorStaffId = input.actorStaffId.trim()
  if (!actorStaffId) {
    throw new BankReconciliationError(
      "actorStaffId is required",
      BankReconciliationErrorCodes.VALIDATION
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<BankReconciliationRow> => {
    const row = await loadOrThrow(tx, input)

    if (row.status !== "CONFIRMED" && row.status !== "SUBMITTED") {
      throw new BankReconciliationError(
        `Only SUBMITTED or CONFIRMED bank reconciliations may be locked (status: ${row.status})`,
        BankReconciliationErrorCodes.INVALID_TRANSITION,
        409
      )
    }

    const now = new Date()
    await tx.bankReconciliation.update({
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

    return getBankReconciliationById(tx, row.id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}
