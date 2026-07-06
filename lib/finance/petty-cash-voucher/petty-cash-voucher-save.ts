import type { Prisma } from "@/generated/prisma/client"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import {
  createWithAllocatedEntryNoRetry,
  formatFinanceDocumentAllocationFailedMessage,
} from "@/lib/finance/document-number-allocation"
import { prisma } from "@/lib/shared/prisma"
import { allocatePettyCashVoucherNo } from "./petty-cash-voucher-allocate-no"
import {
  PettyCashVoucherError,
  PettyCashVoucherErrorCodes,
} from "./petty-cash-voucher-errors"
import type {
  CreatePettyCashVoucherDraftInput,
  PettyCashVoucherWithLines,
  UpdatePettyCashVoucherDraftInput,
} from "./petty-cash-voucher-types"
import {
  assertEligiblePettyCashAccount,
  assertPettyCashVoucherDraftEditable,
  parsePettyCashVoucherDate,
  resolvePettyCashVoucherAllocationLines,
  sumPettyCashVoucherDebitTotal,
} from "./petty-cash-voucher-validation"

async function replacePettyCashVoucherLines(
  tx: Prisma.TransactionClient,
  entryId: string,
  lines: Awaited<ReturnType<typeof resolvePettyCashVoucherAllocationLines>>
): Promise<void> {
  await tx.pettyCashVoucherLine.deleteMany({
    where: { pettyCashVoucherId: entryId },
  })

  if (lines.length > 0) {
    await tx.pettyCashVoucherLine.createMany({
      data: lines.map((line) => ({
        pettyCashVoucherId: entryId,
        lineNo: line.lineNo,
        glAccountId: line.glAccountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      })),
    })
  }
}

export async function createPettyCashVoucherDraft(
  input: CreatePettyCashVoucherDraftInput
): Promise<PettyCashVoucherWithLines> {
  const branchId = String(input.branchId ?? "").trim()
  const legalEntityCode = String(input.legalEntityCode ?? "").trim()
  const createdByStaffId = String(input.createdByStaffId ?? "").trim()
  const pettyCashAccountId = String(input.pettyCashAccountId ?? "").trim()
  const payeeName = String(input.payeeName ?? "").trim()
  const entryDate = parsePettyCashVoucherDate(input.entryDate)

  if (!branchId) {
    throw new PettyCashVoucherError(
      "branchId is required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!legalEntityCode) {
    throw new PettyCashVoucherError(
      "legalEntityCode is required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!createdByStaffId) {
    throw new PettyCashVoucherError(
      "createdByStaffId is required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!pettyCashAccountId) {
    throw new PettyCashVoucherError(
      "pettyCashAccountId is required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!payeeName) {
    throw new PettyCashVoucherError(
      "payeeName is required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PettyCashVoucherWithLines> => {
    await assertEligiblePettyCashAccount(tx, pettyCashAccountId)
    const lines = await resolvePettyCashVoucherAllocationLines(tx, input.lines)
    const totalAmount = sumPettyCashVoucherDebitTotal(lines)

    return createWithAllocatedEntryNoRetry({
      allocate: () =>
        allocatePettyCashVoucherNo(tx, {
          legalEntityCode,
          entryDate,
        }),
      create: (entryNo) =>
        tx.pettyCashVoucher.create({
          data: {
            entryNo,
            status: "DRAFT",
            branchId,
            legalEntityCode,
            entryDate,
            pettyCashAccountId,
            payeeName,
            description: input.description ?? null,
            refNo: input.refNo ?? null,
            totalAmount,
            createdByStaffId,
            lines: {
              create: lines.map((line) => ({
                lineNo: line.lineNo,
                glAccountId: line.glAccountId,
                debit: line.debit,
                credit: line.credit,
                memo: line.memo,
              })),
            },
          },
          include: { lines: true },
        }),
      allocationFailedError: () =>
        new PettyCashVoucherError(
          formatFinanceDocumentAllocationFailedMessage(
            legalEntityCode,
            "petty cash voucher"
          ),
          PettyCashVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
        ),
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function updatePettyCashVoucherDraft(
  input: UpdatePettyCashVoucherDraftInput
): Promise<PettyCashVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  if (!entryId) {
    throw new PettyCashVoucherError(
      "entryId is required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PettyCashVoucherWithLines> => {
    const { id } = entityScopedIdWhere(entryId, legalEntityCode)
    const existing = await tx.pettyCashVoucher.findFirst({
      where: { id, legalEntityCode },
      include: { lines: true },
    })

    if (!existing) {
      throw new PettyCashVoucherError(
        "Petty cash voucher not found",
        PettyCashVoucherErrorCodes.ENTRY_NOT_FOUND,
        404
      )
    }

    assertPettyCashVoucherDraftEditable(existing.status)

    const pettyCashAccountId =
      input.pettyCashAccountId != null
        ? String(input.pettyCashAccountId).trim()
        : existing.pettyCashAccountId

    if (input.pettyCashAccountId != null) {
      await assertEligiblePettyCashAccount(tx, pettyCashAccountId)
    }

    const lines = await resolvePettyCashVoucherAllocationLines(tx, input.lines)
    const totalAmount = sumPettyCashVoucherDebitTotal(lines)

    await replacePettyCashVoucherLines(tx, entryId, lines)

    return tx.pettyCashVoucher.update({
      where: { id: entryId },
      data: {
        ...(input.entryDate !== undefined
          ? { entryDate: parsePettyCashVoucherDate(input.entryDate) }
          : {}),
        ...(input.pettyCashAccountId !== undefined ? { pettyCashAccountId } : {}),
        ...(input.payeeName !== undefined
          ? { payeeName: String(input.payeeName).trim() }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description ?? null }
          : {}),
        ...(input.refNo !== undefined ? { refNo: input.refNo ?? null } : {}),
        totalAmount,
      },
      include: { lines: true },
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
