import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type { DocType, PaymentMethod } from "@/generated/prisma/client"

export const FINANCE_REF_TYPES = {
  POS_SALE: "POS_SALE",
  POS_REFUND: "POS_REFUND",
  STOCK_DOC_POST: "STOCK_DOC_POST",
  MANUAL_JOURNAL: "MANUAL_JOURNAL",
  MANUAL_JOURNAL_REVERSAL: "MANUAL_JOURNAL_REVERSAL",
  OPENING_BALANCE_JOURNAL: "OPENING_BALANCE_JOURNAL",
  ADJUSTMENT_JOURNAL: "ADJUSTMENT_JOURNAL",
  RECLASS_JOURNAL: "RECLASS_JOURNAL",
  ACCRUAL_JOURNAL: "ACCRUAL_JOURNAL",
  AUDITOR_ADJUSTMENT_JOURNAL: "AUDITOR_ADJUSTMENT_JOURNAL",
  PAYMENT_VOUCHER: "PAYMENT_VOUCHER",
  PETTY_CASH_VOUCHER: "PETTY_CASH_VOUCHER",
  REVENUE_VOUCHER: "REVENUE_VOUCHER",
  INVOICE_VOUCHER: "INVOICE_VOUCHER",
  PERIOD_CLOSING_ENTRY: "PERIOD_CLOSING_ENTRY",
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
  legalEntityCode?: DocumentEntityCode | null
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

export type ManualJournalLineInput = {
  accountCode: string
  debit: Prisma.Decimal | number | string
  credit: Prisma.Decimal | number | string
  memo?: string | null
}

export type PostManualJournalVoucherInput = {
  tx: Prisma.TransactionClient
  branchId: string
  date: Date
  description?: string | null
  refNo?: string | null
  idempotencyKey: string
  lines: ManualJournalLineInput[]
}

export type PostJournalReversalInput = {
  tx: Prisma.TransactionClient
  journalEntryId: string
  reversalDate: Date
  reason: string
}

export type PostClosingEntryVoucherInput = {
  tx: Prisma.TransactionClient
  branchId: string
  periodId: string
  periodKey: string
  date: Date
  refId: string
  lines: ManualJournalLineInput[]
  description?: string | null
  legalEntityCode?: DocumentEntityCode | null
}