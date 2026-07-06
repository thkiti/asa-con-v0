import type { Prisma } from "@/generated/prisma/client"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import {
  createWithAllocatedEntryNoRetry,
  formatFinanceDocumentAllocationFailedMessage,
} from "@/lib/finance/document-number-allocation"
import { prisma } from "@/lib/shared/prisma"
import { allocateRevenueVoucherNo } from "./revenue-voucher-allocate-no"
import {
  RevenueVoucherError,
  RevenueVoucherErrorCodes,
} from "./revenue-voucher-errors"
import type {
  CreateRevenueVoucherDraftInput,
  RevenueVoucherWithLines,
  UpdateRevenueVoucherDraftInput,
} from "./revenue-voucher-types"
import {
  assertEligibleReceiveToAccount,
  assertRevenueVoucherDraftEditable,
  parseRevenueVoucherDate,
  resolveRevenueVoucherAllocationLines,
  sumRevenueVoucherCreditTotal,
} from "./revenue-voucher-validation"

async function replaceRevenueVoucherLines(
  tx: Prisma.TransactionClient,
  entryId: string,
  lines: Awaited<ReturnType<typeof resolveRevenueVoucherAllocationLines>>
): Promise<void> {
  await tx.revenueVoucherLine.deleteMany({
    where: { revenueVoucherId: entryId },
  })

  if (lines.length > 0) {
    await tx.revenueVoucherLine.createMany({
      data: lines.map((line) => ({
        revenueVoucherId: entryId,
        lineNo: line.lineNo,
        glAccountId: line.glAccountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      })),
    })
  }
}

export async function createRevenueVoucherDraft(
  input: CreateRevenueVoucherDraftInput
): Promise<RevenueVoucherWithLines> {
  const branchId = String(input.branchId ?? "").trim()
  const legalEntityCode = String(input.legalEntityCode ?? "").trim()
  const createdByStaffId = String(input.createdByStaffId ?? "").trim()
  const receiveToAccountId = String(input.receiveToAccountId ?? "").trim()
  const receivedFromName = String(input.receivedFromName ?? "").trim()
  const entryDate = parseRevenueVoucherDate(input.entryDate)

  if (!branchId) {
    throw new RevenueVoucherError(
      "branchId is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!legalEntityCode) {
    throw new RevenueVoucherError(
      "legalEntityCode is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!createdByStaffId) {
    throw new RevenueVoucherError(
      "createdByStaffId is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!receiveToAccountId) {
    throw new RevenueVoucherError(
      "receiveToAccountId is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!receivedFromName) {
    throw new RevenueVoucherError(
      "receivedFromName is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<RevenueVoucherWithLines> => {
    await assertEligibleReceiveToAccount(tx, receiveToAccountId)
    const lines = await resolveRevenueVoucherAllocationLines(tx, input.lines)
    const totalAmount = sumRevenueVoucherCreditTotal(lines)

    return createWithAllocatedEntryNoRetry({
      allocate: () =>
        allocateRevenueVoucherNo(tx, {
          legalEntityCode,
          entryDate,
        }),
      create: (entryNo) =>
        tx.revenueVoucher.create({
          data: {
            entryNo,
            status: "DRAFT",
            branchId,
            legalEntityCode,
            entryDate,
            receiveToAccountId,
            receivedFromName,
            description: input.description ?? null,
            refNo: input.refNo ?? null,
            receiptNo: input.receiptNo ?? null,
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
        new RevenueVoucherError(
          formatFinanceDocumentAllocationFailedMessage(
            legalEntityCode,
            "revenue voucher"
          ),
          RevenueVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
        ),
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function updateRevenueVoucherDraft(
  input: UpdateRevenueVoucherDraftInput
): Promise<RevenueVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  if (!entryId) {
    throw new RevenueVoucherError(
      "entryId is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<RevenueVoucherWithLines> => {
    const { id } = entityScopedIdWhere(entryId, legalEntityCode)
    const existing = await tx.revenueVoucher.findFirst({
      where: { id, legalEntityCode },
      include: { lines: true },
    })

    if (!existing) {
      throw new RevenueVoucherError(
        "Revenue voucher not found",
        RevenueVoucherErrorCodes.ENTRY_NOT_FOUND,
        404
      )
    }

    assertRevenueVoucherDraftEditable(existing.status)

    const receiveToAccountId =
      input.receiveToAccountId != null
        ? String(input.receiveToAccountId).trim()
        : existing.receiveToAccountId

    if (input.receiveToAccountId != null) {
      await assertEligibleReceiveToAccount(tx, receiveToAccountId)
    }

    const lines = await resolveRevenueVoucherAllocationLines(tx, input.lines)
    const totalAmount = sumRevenueVoucherCreditTotal(lines)

    await replaceRevenueVoucherLines(tx, entryId, lines)

    return tx.revenueVoucher.update({
      where: { id: entryId },
      data: {
        ...(input.entryDate !== undefined
          ? { entryDate: parseRevenueVoucherDate(input.entryDate) }
          : {}),
        ...(input.receiveToAccountId !== undefined ? { receiveToAccountId } : {}),
        ...(input.receivedFromName !== undefined
          ? { receivedFromName: String(input.receivedFromName).trim() }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description ?? null }
          : {}),
        ...(input.refNo !== undefined ? { refNo: input.refNo ?? null } : {}),
        ...(input.receiptNo !== undefined ? { receiptNo: input.receiptNo ?? null } : {}),
        totalAmount,
      },
      include: { lines: true },
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
