import type { PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import { toMoney } from "./decimal"
import {
  resolveFinanceDocumentHeaderContext,
  type FinanceDocumentInquiryLink,
} from "./finance-document-inquiry-header"
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

export type VoucherReadPrisma = Pick<PrismaClient, "voucher" | "manualJournalEntry">

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
  id: string,
  legalEntityCode: DocumentEntityCode
): Promise<VoucherDetail> {
  const scoped = entityScopedIdWhere(id, legalEntityCode)
  const voucher = await prisma.voucher.findFirst({
    where: scoped,
    select: {
      id: true,
      voucherNo: true,
      legalEntityCode: true,
      date: true,
      status: true,
      branchId: true,
      refType: true,
      refId: true,
      refNo: true,
      description: true,
      postedAt: true,
      period: { select: { periodKey: true } },
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

  const inquiryLink: FinanceDocumentInquiryLink = {
    legalEntityCode: voucher.legalEntityCode,
    refType: voucher.refType,
    refId: voucher.refId,
    refNo: voucher.refNo,
    entryDate: voucher.date.toISOString(),
    description: voucher.description,
    postedAt: voucher.postedAt?.toISOString() ?? journal?.postedAt ?? voucher.date.toISOString(),
  }

  const documentHeader = await resolveFinanceDocumentHeaderContext(prisma, inquiryLink)

  return {
    id: voucher.id,
    voucherNo: voucher.voucherNo,
    legalEntityCode: voucher.legalEntityCode,
    periodKey: voucher.period.periodKey,
    date: voucher.date.toISOString(),
    status: voucher.status,
    branchId: voucher.branchId,
    refType: voucher.refType,
    refId: voucher.refId,
    refNo: voucher.refNo,
    description: voucher.description,
    postedAt: voucher.postedAt?.toISOString() ?? null,
    documentHeader,
    lines: voucher.lines.map(mapLine),
    journal,
  }
}
