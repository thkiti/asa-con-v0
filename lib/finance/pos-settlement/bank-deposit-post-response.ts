import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { roundMoney, toMoney } from "@/lib/finance/decimal"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { PSV_BANK_DEPOSIT_DOCUMENT_CODE } from "./constants"

export type BankDepositSettlementLineSummary = {
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type BankDepositSettlementPostResult = {
  voucherId: string
  voucherNo: string
  refNo: string
  collectNo: string
  collectorReportId: string
  amount: string
  documentCode: typeof PSV_BANK_DEPOSIT_DOCUMENT_CODE
  refType: typeof FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT
  legalEntityCode: DocumentEntityCode
  lines: BankDepositSettlementLineSummary[]
}

type BankDepositResponseDb = Pick<PrismaClient, "voucher">

export async function buildBankDepositSettlementPostResult(
  db: BankDepositResponseDb,
  input: {
    voucherId: string
    collectorReportId: string
    collectNo: string
    amount: Parameters<typeof toMoney>[0]
    legalEntityCode: DocumentEntityCode
  }
): Promise<BankDepositSettlementPostResult> {
  const voucher = await db.voucher.findUnique({
    where: { id: input.voucherId },
    include: {
      journalEntry: {
        include: {
          lines: {
            orderBy: { lineNo: "asc" },
            include: {
              glAccount: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
  })

  if (!voucher?.journalEntry) {
    throw new Error("Posted bank deposit voucher journal entry not found")
  }

  const lines: BankDepositSettlementLineSummary[] =
    voucher.journalEntry.lines.map((line) => ({
      accountCode: line.glAccount.code,
      accountName: line.glAccount.name,
      debit: roundMoney(toMoney(line.debit)).toFixed(2),
      credit: roundMoney(toMoney(line.credit)).toFixed(2),
      memo: line.memo,
    }))

  return {
    voucherId: voucher.id,
    voucherNo: voucher.voucherNo,
    refNo: voucher.refNo ?? input.collectNo,
    collectNo: input.collectNo,
    collectorReportId: input.collectorReportId,
    amount: roundMoney(toMoney(input.amount)).toFixed(2),
    documentCode: PSV_BANK_DEPOSIT_DOCUMENT_CODE,
    refType: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
    legalEntityCode: input.legalEntityCode,
    lines,
  }
}

export type ExecuteBankDepositSettlementPostInput = {
  collectorReportId: string
  legalEntityCode: DocumentEntityCode
  tx?: Prisma.TransactionClient
}
