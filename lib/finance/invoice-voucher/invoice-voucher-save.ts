import type { Prisma } from "@/generated/prisma/client"
import { Prisma as PrismaNamespace } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { allocateInvoiceVoucherNo } from "./invoice-voucher-allocate-no"
import {
  InvoiceVoucherError,
  InvoiceVoucherErrorCodes,
} from "./invoice-voucher-errors"
import type {
  CreateInvoiceVoucherDraftInput,
  InvoiceVoucherWithLines,
  UpdateInvoiceVoucherDraftInput,
} from "./invoice-voucher-types"
import {
  assertInvoiceVoucherDraftEditable,
  parseInvoiceVoucherDate,
  parseInvoiceVoucherDueDate,
  resolveInvoiceVoucherAllocationLines,
  sumInvoiceVoucherDebitTotal,
} from "./invoice-voucher-validation"

async function replaceInvoiceVoucherLines(
  tx: Prisma.TransactionClient,
  entryId: string,
  lines: Awaited<ReturnType<typeof resolveInvoiceVoucherAllocationLines>>
): Promise<void> {
  await tx.invoiceVoucherLine.deleteMany({
    where: { invoiceVoucherId: entryId },
  })

  if (lines.length > 0) {
    await tx.invoiceVoucherLine.createMany({
      data: lines.map((line) => ({
        invoiceVoucherId: entryId,
        lineNo: line.lineNo,
        glAccountId: line.glAccountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      })),
    })
  }
}

export async function createInvoiceVoucherDraft(
  input: CreateInvoiceVoucherDraftInput
): Promise<InvoiceVoucherWithLines> {
  const branchId = String(input.branchId ?? "").trim()
  const legalEntityCode = String(input.legalEntityCode ?? "").trim()
  const createdByStaffId = String(input.createdByStaffId ?? "").trim()
  const customerName = String(input.customerName ?? "").trim()
  const invoiceDate = parseInvoiceVoucherDate(input.invoiceDate)
  const dueDate = parseInvoiceVoucherDueDate(input.dueDate)

  if (!branchId) {
    throw new InvoiceVoucherError(
      "branchId is required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!legalEntityCode) {
    throw new InvoiceVoucherError(
      "legalEntityCode is required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!createdByStaffId) {
    throw new InvoiceVoucherError(
      "createdByStaffId is required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }
  if (!customerName) {
    throw new InvoiceVoucherError(
      "customerName is required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<InvoiceVoucherWithLines> => {
    const lines = await resolveInvoiceVoucherAllocationLines(tx, input.lines)
    const totalAmount = sumInvoiceVoucherDebitTotal(lines)
    const entryNo = await allocateInvoiceVoucherNo(tx, {
      legalEntityCode,
      invoiceDate,
    })

    try {
      return await tx.invoiceVoucher.create({
        data: {
          entryNo,
          status: "DRAFT",
          branchId,
          legalEntityCode,
          invoiceDate,
          dueDate,
          customerName,
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
      })
    } catch (err: unknown) {
      if (
        err instanceof PrismaNamespace.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new InvoiceVoucherError(
          "Invoice voucher number already exists",
          InvoiceVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
        )
      }
      throw err
    }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function updateInvoiceVoucherDraft(
  input: UpdateInvoiceVoucherDraftInput
): Promise<InvoiceVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  if (!entryId) {
    throw new InvoiceVoucherError(
      "entryId is required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<InvoiceVoucherWithLines> => {
    const existing = await tx.invoiceVoucher.findUnique({
      where: { id: entryId },
      include: { lines: true },
    })

    if (!existing) {
      throw new InvoiceVoucherError(
        "Invoice voucher not found",
        InvoiceVoucherErrorCodes.ENTRY_NOT_FOUND,
        404
      )
    }

    assertInvoiceVoucherDraftEditable(existing.status)

    const lines = await resolveInvoiceVoucherAllocationLines(tx, input.lines)
    const totalAmount = sumInvoiceVoucherDebitTotal(lines)

    await replaceInvoiceVoucherLines(tx, entryId, lines)

    return tx.invoiceVoucher.update({
      where: { id: entryId },
      data: {
        ...(input.invoiceDate !== undefined
          ? { invoiceDate: parseInvoiceVoucherDate(input.invoiceDate) }
          : {}),
        ...(input.dueDate !== undefined
          ? { dueDate: parseInvoiceVoucherDueDate(input.dueDate) }
          : {}),
        ...(input.customerName !== undefined
          ? { customerName: String(input.customerName).trim() }
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
