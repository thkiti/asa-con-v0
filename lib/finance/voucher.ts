import type { Prisma } from "@/generated/prisma/client"
import { Prisma as PrismaNamespace, VoucherStatus } from "@/generated/prisma/client"
import { FinancePostingError } from "./posting-errors"
import { toMoney } from "./decimal"
import type { JournalLineDraft } from "./posting-types"
import { assertPeriodOpen } from "./validation"

export type CreateVoucherWithLinesInput = {
  branchId: string
  periodId: string
  date: Date
  refType: string
  refId: string
  refNo?: string | null
  description?: string | null
  lines: JournalLineDraft[]
}

/**
 * Allocates voucher numbers as max existing `V-{periodKey}-#####` + 1.
 * Concurrency: two posters in the same transaction epoch can still collide on voucherNo;
 * the unique index on voucherNo plus DUPLICATE_VOUCHER_NO handling is the safety net.
 *
 * TODO: replace with VoucherCounter table, DB sequence, or transactional allocator.
 */
export async function allocateVoucherNo(
  tx: Prisma.TransactionClient,
  periodKey: string
): Promise<string> {
  const prefix = `V-${periodKey}-`
  const latest = await tx.voucher.findFirst({
    where: { voucherNo: { startsWith: prefix } },
    select: { voucherNo: true },
    orderBy: { voucherNo: "desc" },
  })

  let seq = 1
  if (latest) {
    const suffix = latest.voucherNo.slice(prefix.length)
    const parsed = Number.parseInt(suffix, 10)
    if (Number.isFinite(parsed)) {
      seq = parsed + 1
    }
  }

  return `${prefix}${String(seq).padStart(5, "0")}`
}

export async function createVoucherWithLines(
  tx: Prisma.TransactionClient,
  input: CreateVoucherWithLinesInput
): Promise<{ voucherId: string; voucherNo: string }> {
  const period = await tx.accountingPeriod.findUnique({
    where: { id: input.periodId },
  })
  if (!period) {
    throw new FinancePostingError("Accounting period not found", "PERIOD_NOT_FOUND")
  }

  assertPeriodOpen(period.status)

  const voucherNo = await allocateVoucherNo(tx, period.periodKey)
  const postedAt = new Date()

  let voucher
  try {
    voucher = await tx.voucher.create({
      data: {
        voucherNo,
        date: input.date,
        status: VoucherStatus.POSTED,
        branchId: input.branchId,
        legalEntityCode: period.legalEntityCode,
        periodId: input.periodId,
        refType: input.refType,
        refId: input.refId,
        refNo: input.refNo ?? null,
        description: input.description ?? null,
        postedAt,
        lines: {
          create: input.lines.map((line, index) => ({
            lineNo: index + 1,
            glAccountId: line.glAccountId,
            debit: toMoney(line.debit),
            credit: toMoney(line.credit),
            memo: line.memo ?? null,
          })),
        },
      },
    })
  } catch (err) {
    if (
      err instanceof PrismaNamespace.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new FinancePostingError(
        "Voucher number already exists",
        "DUPLICATE_VOUCHER_NO"
      )
    }
    throw err
  }

  return { voucherId: voucher.id, voucherNo: voucher.voucherNo }
}
