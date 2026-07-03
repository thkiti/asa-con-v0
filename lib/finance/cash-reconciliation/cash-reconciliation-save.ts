import { GlAccountReconciliationRole, type Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { computeCashReconciliationVariance } from "../period-reconciliation-compute"
import { requireReconciliationGlAccount } from "../period-reconciliation-accounts"
import { isPeriodReconciliationEditable } from "../period-reconciliation-types"
import { toMoney } from "../decimal"
import {
  CashReconciliationError,
  CashReconciliationErrorCodes,
} from "./cash-reconciliation-errors"
import { resolveCashReconciliationExpectedCash } from "./cash-reconciliation-gl-balance"
import { getCashReconciliationById } from "./cash-reconciliation-read"
import type {
  CashReconciliationRow,
  UpdateCashReconciliationDraftInput,
  UpsertCashReconciliationInput,
} from "./cash-reconciliation-types"

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function upsertCashReconciliationDraft(
  input: UpsertCashReconciliationInput
): Promise<CashReconciliationRow> {
  const periodKey = input.periodKey.trim()
  const branchId = input.branchId.trim()
  const glAccountIdInput = input.glAccountId?.trim() ?? ""
  const glAccountCodeInput = input.glAccountCode?.trim() ?? ""
  const actorStaffId = input.actorStaffId.trim()

  if (!periodKey || !branchId || !actorStaffId) {
    throw new CashReconciliationError(
      "periodKey, branchId, and actorStaffId are required",
      CashReconciliationErrorCodes.VALIDATION
    )
  }

  if (!glAccountIdInput && !glAccountCodeInput) {
    throw new CashReconciliationError(
      "glAccountId or glAccountCode is required",
      CashReconciliationErrorCodes.VALIDATION
    )
  }

  let glAccountRef
  try {
    glAccountRef = await requireReconciliationGlAccount(prisma, {
      glAccountId: glAccountIdInput,
      glAccountCode: glAccountCodeInput,
      expectedRole: GlAccountReconciliationRole.CASH,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "GL account validation failed"
    throw new CashReconciliationError(
      message,
      message.includes("not configured")
        ? CashReconciliationErrorCodes.VALIDATION
        : CashReconciliationErrorCodes.ACCOUNT_NOT_FOUND,
      message.includes("not found") ? 404 : 400
    )
  }

  const glAccountId = glAccountRef.id

  const expectedCash = await resolveCashReconciliationExpectedCash(prisma, {
    legalEntityCode: input.legalEntityCode,
    periodKey,
    glAccountId,
    branchId,
  })

  const computed = computeCashReconciliationVariance({
    expectedCash,
    actualCountedCash: input.actualCountedCash,
  })

  const run = async (tx: Prisma.TransactionClient): Promise<CashReconciliationRow> => {
    const existing = await tx.cashReconciliation.findUnique({
      where: {
        legalEntityCode_periodKey_branchId_glAccountId: {
          legalEntityCode: input.legalEntityCode,
          periodKey,
          branchId,
          glAccountId,
        },
      },
    })

    if (existing && !isPeriodReconciliationEditable(existing.status)) {
      throw new CashReconciliationError(
        `Cannot update cash reconciliation in status ${existing.status}`,
        CashReconciliationErrorCodes.IMMUTABLE,
        409
      )
    }

    const data = {
      expectedCash: toMoney(expectedCash),
      actualCountedCash: toMoney(input.actualCountedCash),
      variance: toMoney(computed.variance),
      note: normalizeOptionalText(input.note),
      evidenceNote: normalizeOptionalText(input.evidenceNote),
      updatedByStaffId: actorStaffId,
    }

    if (existing) {
      await tx.cashReconciliation.update({
        where: { id: existing.id },
        data,
      })
      return getCashReconciliationById(tx, existing.id, input.legalEntityCode)
    }

    const created = await tx.cashReconciliation.create({
      data: {
        legalEntityCode: input.legalEntityCode,
        periodKey,
        branchId,
        glAccountId,
        ...data,
        createdByStaffId: actorStaffId,
      },
    })

    return getCashReconciliationById(tx, created.id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}

export async function updateCashReconciliationDraft(
  input: UpdateCashReconciliationDraftInput
): Promise<CashReconciliationRow> {
  const id = input.id.trim()
  const actorStaffId = input.actorStaffId.trim()

  if (!id || !actorStaffId) {
    throw new CashReconciliationError(
      "id and actorStaffId are required",
      CashReconciliationErrorCodes.VALIDATION
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<CashReconciliationRow> => {
    const existing = await tx.cashReconciliation.findFirst({
      where: { id, legalEntityCode: input.legalEntityCode },
    })

    if (!existing) {
      throw new CashReconciliationError(
        "Cash reconciliation not found",
        CashReconciliationErrorCodes.NOT_FOUND,
        404
      )
    }

    if (!isPeriodReconciliationEditable(existing.status)) {
      throw new CashReconciliationError(
        `Cannot update cash reconciliation in status ${existing.status}`,
        CashReconciliationErrorCodes.IMMUTABLE,
        409
      )
    }

    const expectedCash = await resolveCashReconciliationExpectedCash(tx, {
      legalEntityCode: input.legalEntityCode,
      periodKey: existing.periodKey,
      glAccountId: existing.glAccountId,
      branchId: existing.branchId,
    })

    const computed = computeCashReconciliationVariance({
      expectedCash,
      actualCountedCash:
        input.actualCountedCash ?? existing.actualCountedCash.toString(),
    })

    await tx.cashReconciliation.update({
      where: { id },
      data: {
        expectedCash: toMoney(expectedCash),
        actualCountedCash: toMoney(
          input.actualCountedCash ?? existing.actualCountedCash
        ),
        variance: toMoney(computed.variance),
        note:
          input.note !== undefined
            ? normalizeOptionalText(input.note)
            : existing.note,
        evidenceNote:
          input.evidenceNote !== undefined
            ? normalizeOptionalText(input.evidenceNote)
            : existing.evidenceNote,
        updatedByStaffId: actorStaffId,
      },
    })

    return getCashReconciliationById(tx, id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}
