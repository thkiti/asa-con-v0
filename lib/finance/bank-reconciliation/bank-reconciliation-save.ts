import { GlAccountReconciliationRole, type Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { computeBankReconciliationAmounts } from "../period-reconciliation-compute"
import { requireReconciliationGlAccount } from "../period-reconciliation-accounts"
import { isPeriodReconciliationEditable } from "../period-reconciliation-types"
import { toMoney } from "../decimal"
import {
  BankReconciliationError,
  BankReconciliationErrorCodes,
} from "./bank-reconciliation-errors"
import { resolveBankReconciliationGlBalance } from "./bank-reconciliation-gl-balance"
import { getBankReconciliationById } from "./bank-reconciliation-read"
import type {
  BankReconciliationRow,
  UpdateBankReconciliationDraftInput,
  UpsertBankReconciliationInput,
} from "./bank-reconciliation-types"

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildAmountFields(input: {
  glBalance: string
  bankStatementBalance: string | number
  outstandingDeposits?: string | number
  outstandingPayments?: string | number
  bankCharges?: string | number
  interest?: string | number
  adjustments?: string | number
}) {
  const computed = computeBankReconciliationAmounts({
    glBalance: input.glBalance,
    bankStatementBalance: input.bankStatementBalance,
    outstandingDeposits: input.outstandingDeposits,
    outstandingPayments: input.outstandingPayments,
    bankCharges: input.bankCharges,
    interest: input.interest,
    adjustments: input.adjustments,
  })

  return {
    glBalance: toMoney(input.glBalance),
    bankStatementBalance: toMoney(input.bankStatementBalance),
    outstandingDeposits: toMoney(input.outstandingDeposits ?? 0),
    outstandingPayments: toMoney(input.outstandingPayments ?? 0),
    bankCharges: toMoney(input.bankCharges ?? 0),
    interest: toMoney(input.interest ?? 0),
    adjustments: toMoney(input.adjustments ?? 0),
    reconciledBalance: toMoney(computed.reconciledBalance),
    variance: toMoney(computed.variance),
  }
}

export async function upsertBankReconciliationDraft(
  input: UpsertBankReconciliationInput
): Promise<BankReconciliationRow> {
  const periodKey = input.periodKey.trim()
  const glAccountIdInput = input.glAccountId?.trim() ?? ""
  const glAccountCodeInput = input.glAccountCode?.trim() ?? ""
  const actorStaffId = input.actorStaffId.trim()

  if (!periodKey || !actorStaffId) {
    throw new BankReconciliationError(
      "periodKey and actorStaffId are required",
      BankReconciliationErrorCodes.VALIDATION
    )
  }

  if (!glAccountIdInput && !glAccountCodeInput) {
    throw new BankReconciliationError(
      "glAccountId or glAccountCode is required",
      BankReconciliationErrorCodes.VALIDATION
    )
  }

  let glAccountRef
  try {
    glAccountRef = await requireReconciliationGlAccount(prisma, {
      glAccountId: glAccountIdInput,
      glAccountCode: glAccountCodeInput,
      expectedRole: GlAccountReconciliationRole.BANK,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "GL account validation failed"
    throw new BankReconciliationError(
      message,
      message.includes("not configured")
        ? BankReconciliationErrorCodes.VALIDATION
        : BankReconciliationErrorCodes.ACCOUNT_NOT_FOUND,
      message.includes("not found") ? 404 : 400
    )
  }

  const glAccountId = glAccountRef.id

  const branchId = input.branchId?.trim() || null

  const glBalance = await resolveBankReconciliationGlBalance(prisma, {
    legalEntityCode: input.legalEntityCode,
    periodKey,
    glAccountId,
    branchId,
  })

  const amounts = buildAmountFields({
    glBalance,
    bankStatementBalance: input.bankStatementBalance,
    outstandingDeposits: input.outstandingDeposits,
    outstandingPayments: input.outstandingPayments,
    bankCharges: input.bankCharges,
    interest: input.interest,
    adjustments: input.adjustments,
  })

  const run = async (tx: Prisma.TransactionClient): Promise<BankReconciliationRow> => {
    const existing = await tx.bankReconciliation.findUnique({
      where: {
        legalEntityCode_periodKey_glAccountId: {
          legalEntityCode: input.legalEntityCode,
          periodKey,
          glAccountId,
        },
      },
    })

    if (existing && !isPeriodReconciliationEditable(existing.status)) {
      throw new BankReconciliationError(
        `Cannot update bank reconciliation in status ${existing.status}`,
        BankReconciliationErrorCodes.IMMUTABLE,
        409
      )
    }

    const data = {
      ...amounts,
      branchId,
      note: normalizeOptionalText(input.note),
      evidenceNote: normalizeOptionalText(input.evidenceNote),
      updatedByStaffId: actorStaffId,
    }

    if (existing) {
      await tx.bankReconciliation.update({
        where: { id: existing.id },
        data,
      })
      return getBankReconciliationById(tx, existing.id, input.legalEntityCode)
    }

    const created = await tx.bankReconciliation.create({
      data: {
        legalEntityCode: input.legalEntityCode,
        periodKey,
        glAccountId,
        ...data,
        createdByStaffId: actorStaffId,
      },
    })

    return getBankReconciliationById(tx, created.id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}

export async function updateBankReconciliationDraft(
  input: UpdateBankReconciliationDraftInput
): Promise<BankReconciliationRow> {
  const id = input.id.trim()
  const actorStaffId = input.actorStaffId.trim()

  if (!id || !actorStaffId) {
    throw new BankReconciliationError(
      "id and actorStaffId are required",
      BankReconciliationErrorCodes.VALIDATION
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<BankReconciliationRow> => {
    const existing = await tx.bankReconciliation.findFirst({
      where: { id, legalEntityCode: input.legalEntityCode },
    })

    if (!existing) {
      throw new BankReconciliationError(
        "Bank reconciliation not found",
        BankReconciliationErrorCodes.NOT_FOUND,
        404
      )
    }

    if (!isPeriodReconciliationEditable(existing.status)) {
      throw new BankReconciliationError(
        `Cannot update bank reconciliation in status ${existing.status}`,
        BankReconciliationErrorCodes.IMMUTABLE,
        409
      )
    }

    const glBalance = await resolveBankReconciliationGlBalance(tx, {
      legalEntityCode: input.legalEntityCode,
      periodKey: existing.periodKey,
      glAccountId: existing.glAccountId,
      branchId: existing.branchId,
    })

    const amounts = buildAmountFields({
      glBalance,
      bankStatementBalance:
        input.bankStatementBalance ?? existing.bankStatementBalance.toString(),
      outstandingDeposits:
        input.outstandingDeposits ?? existing.outstandingDeposits.toString(),
      outstandingPayments:
        input.outstandingPayments ?? existing.outstandingPayments.toString(),
      bankCharges: input.bankCharges ?? existing.bankCharges.toString(),
      interest: input.interest ?? existing.interest.toString(),
      adjustments: input.adjustments ?? existing.adjustments.toString(),
    })

    await tx.bankReconciliation.update({
      where: { id },
      data: {
        ...amounts,
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

    return getBankReconciliationById(tx, id, input.legalEntityCode)
  }

  return prisma.$transaction(run)
}
