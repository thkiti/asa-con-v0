import type { Prisma } from "@/generated/prisma/client"
import type { DocType, PaymentMethod } from "@/generated/prisma/client"

export const FINANCE_REF_TYPES = {
  POS_SALE: "POS_SALE",
  POS_REFUND: "POS_REFUND",
  STOCK_DOC_POST: "STOCK_DOC_POST",
} as const

export type FinanceRefType =
  (typeof FINANCE_REF_TYPES)[keyof typeof FINANCE_REF_TYPES]

export type JournalLineDraft = {
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo?: string
}

export type JournalLineCodeDraft = {
  accountCode: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo?: string
}

export type OperationalVoucherInput = {
  tx: Prisma.TransactionClient
  branchId: string
  date: Date
  refType: FinanceRefType | string
  refId: string
  refNo?: string | null
  description?: string | null
  lines: JournalLineDraft[]
}

export type PostedVoucherResult = {
  voucherId: string
  voucherNo: string
  journalEntryId: string
  alreadyPosted: boolean
}

export type PostSaleVoucherInput = {
  tx: Prisma.TransactionClient
  sale: {
    id: string
    branchId: string
    total: Prisma.Decimal | number | string
    paymentMethod: PaymentMethod
  }
  ledgerResult?: {
    cogsAmount?: Prisma.Decimal | number | string
  }
}

export type PostStockDocumentVoucherInput = {
  tx: Prisma.TransactionClient
  doc: {
    id: string
    refNo: string
    branchId: string
    docType: DocType
  }
  ledgerResult: {
    inboundValue: Prisma.Decimal | number | string
    outboundValue?: Prisma.Decimal | number | string
  }
}

export type PostRefundVoucherInput = {
  tx: Prisma.TransactionClient
  refund: {
    id: string
    branchId: string
    refundNo: string
    amount: Prisma.Decimal | number | string
    createdAt: Date
  }
  paymentMethod: PaymentMethod
}