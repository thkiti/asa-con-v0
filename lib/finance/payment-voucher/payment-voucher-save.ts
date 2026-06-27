import type { Prisma } from "@/generated/prisma/client"
import { Prisma as PrismaNamespace } from "@/generated/prisma/client"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import { prisma } from "@/lib/shared/prisma"
import { allocatePaymentVoucherNo } from "./payment-voucher-allocate-no"
import {
  PaymentVoucherError,
  PaymentVoucherErrorCodes,
} from "./payment-voucher-errors"
import type {
  CreatePaymentVoucherDraftInput,
  PaymentVoucherWithLines,
  UpdatePaymentVoucherDraftInput,
} from "./payment-voucher-types"
import {
  assertEligiblePayFromAccount,
  assertPaymentVoucherDraftEditable,
  parsePaymentVoucherDate,
  resolvePaymentVoucherAllocationLines,
  sumPaymentVoucherDebitTotal,
} from "./payment-voucher-validation"

async function replacePaymentVoucherLines(
  tx: Prisma.TransactionClient,
  entryId: string,
  lines: Awaited<ReturnType<typeof resolvePaymentVoucherAllocationLines>>
): Promise<void> {
  await tx.paymentVoucherLine.deleteMany({
    where: { paymentVoucherId: entryId },
  })

  if (lines.length > 0) {
    await tx.paymentVoucherLine.createMany({
      data: lines.map((line) => ({
        paymentVoucherId: entryId,
        lineNo: line.lineNo,
        glAccountId: line.glAccountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      })),
    })
  }
}

export async function createPaymentVoucherDraft(
  input: CreatePaymentVoucherDraftInput
): Promise<PaymentVoucherWithLines> {
  const branchId = String(input.branchId ?? "").trim()
  const legalEntityCode = String(input.legalEntityCode ?? "").trim()
  const createdByStaffId = String(input.createdByStaffId ?? "").trim()
  const payFromAccountId = String(input.payFromAccountId ?? "").trim()
  const payeeName = String(input.payeeName ?? "").trim()
  const entryDate = parsePaymentVoucherDate(input.entryDate)

  if (!branchId) {
    throw new PaymentVoucherError(
      "branchId is required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!legalEntityCode) {
    throw new PaymentVoucherError(
      "legalEntityCode is required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!createdByStaffId) {
    throw new PaymentVoucherError(
      "createdByStaffId is required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!payFromAccountId) {
    throw new PaymentVoucherError(
      "payFromAccountId is required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!payeeName) {
    throw new PaymentVoucherError(
      "payeeName is required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PaymentVoucherWithLines> => {
    await assertEligiblePayFromAccount(tx, payFromAccountId)
    const lines = await resolvePaymentVoucherAllocationLines(tx, input.lines)
    const totalAmount = sumPaymentVoucherDebitTotal(lines)
    const entryNo = await allocatePaymentVoucherNo(tx, {
      legalEntityCode,
      entryDate,
    })

    try {
      return await tx.paymentVoucher.create({
        data: {
          entryNo,
          status: "DRAFT",
          branchId,
          legalEntityCode,
          entryDate,
          payFromAccountId,
          payeeName,
          description: input.description ?? null,
          refNo: input.refNo ?? null,
          chequeNo: input.chequeNo ?? null,
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
      })
    } catch (err: unknown) {
      if (
        err instanceof PrismaNamespace.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new PaymentVoucherError(
          "Payment voucher number already exists",
          PaymentVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
        )
      }
      throw err
    }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function updatePaymentVoucherDraft(
  input: UpdatePaymentVoucherDraftInput
): Promise<PaymentVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  if (!entryId) {
    throw new PaymentVoucherError(
      "entryId is required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PaymentVoucherWithLines> => {
    const { id } = entityScopedIdWhere(entryId, legalEntityCode)
    const existing = await tx.paymentVoucher.findFirst({
      where: { id, legalEntityCode },
      include: { lines: true },
    })

    if (!existing) {
      throw new PaymentVoucherError(
        "Payment voucher not found",
        PaymentVoucherErrorCodes.ENTRY_NOT_FOUND,
        404
      )
    }

    assertPaymentVoucherDraftEditable(existing.status)

    const payFromAccountId =
      input.payFromAccountId != null
        ? String(input.payFromAccountId).trim()
        : existing.payFromAccountId

    if (input.payFromAccountId != null) {
      await assertEligiblePayFromAccount(tx, payFromAccountId)
    }

    const lines = await resolvePaymentVoucherAllocationLines(tx, input.lines)
    const totalAmount = sumPaymentVoucherDebitTotal(lines)

    await replacePaymentVoucherLines(tx, entryId, lines)

    return tx.paymentVoucher.update({
      where: { id: entryId },
      data: {
        ...(input.entryDate !== undefined
          ? { entryDate: parsePaymentVoucherDate(input.entryDate) }
          : {}),
        ...(input.payFromAccountId !== undefined ? { payFromAccountId } : {}),
        ...(input.payeeName !== undefined
          ? { payeeName: String(input.payeeName).trim() }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description ?? null }
          : {}),
        ...(input.refNo !== undefined ? { refNo: input.refNo ?? null } : {}),
        ...(input.chequeNo !== undefined ? { chequeNo: input.chequeNo ?? null } : {}),
        totalAmount,
      },
      include: { lines: true },
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
