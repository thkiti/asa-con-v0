import type { PrismaClient } from "@/generated/prisma/client"
import { toMoney } from "./decimal"
import { VoucherReadError } from "./voucher-read-errors"
import type {
  VoucherDetail,
  VoucherJournalDetail,
  VoucherLineDetail,
} from "./voucher-read-types"

export type {
  VoucherDetail,
  VoucherDetailResult,
  VoucherJournalDetail,
  VoucherLineDetail,
} from "./voucher-read-types"

export type VoucherReadPrisma = Pick<PrismaClient, "voucher">

function mapLine(line: {
  id: string
  lineNo: number
  debit: Parameters<typeof toMoney>[0]
  credit: Parameters<typeof toMoney>[0]
  memo: string | null
  glAccount: { code: string; name: string }
}): VoucherLineDetail {
  return {
    id: line.id,
    lineNo: line.lineNo,
    accountCode: line.glAccount.code,
    accountName: line.glAccount.name,
    debit: toMoney(line.debit).toString(),
    credit: toMoney(line.credit).toString(),
    memo: line.memo,
  }
}

export async function getVoucherDetailById(
  prisma: VoucherReadPrisma,
  id: string
): Promise<VoucherDetail> {
  const voucher = await prisma.voucher.findUnique({
    where: { id },
    select: {
      id: true,
      voucherNo: true,
      date: true,
      status: true,
      branchId: true,
      refType: true,
      refId: true,
      refNo: true,
      description: true,
      postedAt: true,
      lines: {
        orderBy: { lineNo: "asc" },
        select: {
          id: true,
          lineNo: true,
          debit: true,
          credit: true,
          memo: true,
          glAccount: { select: { code: true, name: true } },
        },
      },
      journalEntry: {
        select: {
          id: true,
          postedAt: true,
          lines: {
            orderBy: { lineNo: "asc" },
            select: {
              id: true,
              lineNo: true,
              debit: true,
              credit: true,
              memo: true,
              glAccount: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
  })

  if (!voucher) {
    throw new VoucherReadError("Voucher not found", "NOT_FOUND")
  }

  const journal: VoucherJournalDetail | null = voucher.journalEntry
    ? {
        id: voucher.journalEntry.id,
        postedAt: voucher.journalEntry.postedAt.toISOString(),
        lines: voucher.journalEntry.lines.map(mapLine),
      }
    : null

  return {
    id: voucher.id,
    voucherNo: voucher.voucherNo,
    date: voucher.date.toISOString(),
    status: voucher.status,
    branchId: voucher.branchId,
    refType: voucher.refType,
    refId: voucher.refId,
    refNo: voucher.refNo,
    description: voucher.description,
    postedAt: voucher.postedAt?.toISOString() ?? null,
    lines: voucher.lines.map(mapLine),
    journal,
  }
}
