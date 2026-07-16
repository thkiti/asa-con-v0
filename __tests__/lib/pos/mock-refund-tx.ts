import { Prisma, RefundKind, SaleStatus } from "@/generated/prisma/client"
import type { Prisma as PrismaTypes } from "@/generated/prisma/client"
import type { PaymentMethod } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import {
  DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
  VAT_OUTPUT_STANDARD_TAX_CODE,
} from "@/lib/finance/tax-policy"
import { testVatEconomicsForGross } from "../finance/helpers/pos-vat-fixtures"
import { createMockTx, type MockTxState } from "../stock/helpers/mock-tx"

type SaleRow = {
  id: string
  branchId: string
  staffId: string | null
  total: Prisma.Decimal
  status: SaleStatus
  createdAt: Date
  vatRateBps?: number | null
  taxCode?: string | null
  outputVatAccountCode?: string | null
  netAmount?: Prisma.Decimal | null
  vatAmount?: Prisma.Decimal | null
}

type PaymentRow = {
  id: string
  saleId: string
  method: PaymentMethod
  amount: Prisma.Decimal
  change: Prisma.Decimal
}

type ReceiptRow = {
  id: string
  saleId: string
  branchId: string
  receiptNo: string
  issuedAt: Date
}

type RefundRow = {
  id: string
  refundNo: string
  kind: RefundKind
  saleId: string | null
  branchId: string
  staffId: string | null
  originalReceiptId: string | null
  amount: Prisma.Decimal
  reasonCode: string | null
  reason: string | null
  createdAt: Date
}

let seq = 0
function nextId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}`
}

type LegacyRefundRefRow = {
  id: string
  refundId: string
  sourceFileName: string
  legacyTransNo: string
  legacyBranchId: string
  legacyRefundDate: string
  legacyRefundTime: string | null
  sourceRowCount: number
  grossAmount: Prisma.Decimal
  netAmount: Prisma.Decimal
  vatAmount: Prisma.Decimal
  createdAt: Date
}

export type RefundMockState = MockTxState & {
  sales: SaleRow[]
  payments: PaymentRow[]
  receipts: ReceiptRow[]
  refunds: RefundRow[]
  legacyRefundReferences: LegacyRefundRefRow[]
}

const defaultBranchCodes: Record<string, string> = {
  "branch-1": "SH001",
  "branch-2": "SH002",
}

export function buildSaleVatSnapshotForGross(
  gross: number | string,
  rateBps = DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
  outputVatAccountCode = DEFAULT_ACCOUNT_CODES.OUTPUT_VAT
) {
  const economics = testVatEconomicsForGross(String(gross), rateBps, outputVatAccountCode)
  return {
    vatRateBps: rateBps,
    taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
    outputVatAccountCode,
    netAmount: new Prisma.Decimal(economics.net),
    vatAmount: new Prisma.Decimal(economics.vat),
  }
}

export function seedSaleWithReceipt(
  state: RefundMockState,
  args: {
    id?: string
    branchId: string
    total: number | string
    paymentAmount?: number | string
    change?: number | string
    receiptNo?: string
    /** Omit P1.25 VAT snapshot fields (for MISSING_VAT_SNAPSHOT negative tests). */
    skipVatSnapshot?: boolean
    vatRateBps?: number
    taxCode?: string
    outputVatAccountCode?: string
  }
): { saleId: string; receiptId: string } {
  const saleId = args.id ?? nextId("sale")
  const total = new Prisma.Decimal(String(args.total))
  const vatSnapshot = args.skipVatSnapshot
    ? {}
    : {
        ...buildSaleVatSnapshotForGross(
          args.total,
          args.vatRateBps ?? DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
          args.outputVatAccountCode ?? DEFAULT_ACCOUNT_CODES.OUTPUT_VAT
        ),
        ...(args.taxCode != null ? { taxCode: args.taxCode } : {}),
      }
  state.sales.push({
    id: saleId,
    branchId: args.branchId,
    staffId: "staff-1",
    total,
    status: SaleStatus.COMPLETED,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    ...vatSnapshot,
  })
  state.payments.push({
    id: nextId("pay"),
    saleId,
    method: "CASH" as PaymentMethod,
    amount: new Prisma.Decimal(String(args.paymentAmount ?? args.total)),
    change: new Prisma.Decimal(String(args.change ?? 0)),
  })
  const receiptId = nextId("rcpt")
  state.receipts.push({
    id: receiptId,
    saleId,
    branchId: args.branchId,
    receiptNo: args.receiptNo ?? "REC-SH001-202606-0001",
    issuedAt: new Date("2026-01-15T10:00:00.000Z"),
  })
  return { saleId, receiptId }
}

export function createRefundMockTx(initial?: Partial<MockTxState>) {
  seq = 0
  const { tx: baseTx, state: baseState } = createMockTx(initial)
  const state: RefundMockState = {
    ...baseState,
    sales: [],
    payments: [],
    receipts: [],
    refunds: [],
    legacyRefundReferences: [],
  }

  const tx = {
    ...baseTx,
    branch: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const code = defaultBranchCodes[where.id] ?? "SH001"
        return { code }
      },
    },
    sale: {
      findFirst: async ({
        where,
        include,
      }: {
        where: { id: string; branchId: string; status?: SaleStatus }
        include?: { receipt?: boolean; payment?: boolean }
      }) => {
        const sale = state.sales.find(
          (s) =>
            s.id === where.id &&
            s.branchId === where.branchId &&
            (where.status == null || s.status === where.status)
        )
        if (!sale) return null
        const receipt =
          include?.receipt === true
            ? state.receipts.find((r) => r.saleId === sale.id) ?? null
            : undefined
        const payment =
          include?.payment === true
            ? state.payments.find((p) => p.saleId === sale.id) ?? null
            : undefined
        return { ...sale, receipt, payment }
      },
    },
    legacyRefundReference: {
      findUnique: async ({
        where,
      }: {
        where: {
          sourceFileName_legacyBranchId_legacyRefundDate_legacyTransNo?: {
            sourceFileName: string
            legacyBranchId: string
            legacyRefundDate: string
            legacyTransNo: string
          }
        }
      }) => {
        const key = where.sourceFileName_legacyBranchId_legacyRefundDate_legacyTransNo
        if (!key) return null
        const row = state.legacyRefundReferences.find(
          (r) =>
            r.sourceFileName === key.sourceFileName &&
            r.legacyBranchId === key.legacyBranchId &&
            r.legacyRefundDate === key.legacyRefundDate &&
            r.legacyTransNo === key.legacyTransNo
        )
        if (!row) return null
        const refund = state.refunds.find((r) => r.id === row.refundId)
        return {
          ...row,
          refund: refund ? { refundNo: refund.refundNo } : null,
        }
      },
      create: async ({ data }: { data: Omit<LegacyRefundRefRow, "id" | "createdAt"> }) => {
        const row: LegacyRefundRefRow = {
          id: nextId("legref"),
          createdAt: new Date(),
          ...data,
        }
        state.legacyRefundReferences.push(row)
        return row
      },
    },
    refund: {
      count: async ({
        where,
      }: {
        where: {
          branchId: string
          createdAt: { gte: Date; lt: Date }
        }
      }) => {
        return state.refunds.filter(
          (row) =>
            row.branchId === where.branchId &&
            row.createdAt >= where.createdAt.gte &&
            row.createdAt < where.createdAt.lt
        ).length
      },
      aggregate: async ({
        where,
        _sum,
      }: {
        where: { saleId: string }
        _sum: { amount: boolean }
      }) => {
        void _sum
        let sum = new Prisma.Decimal(0)
        for (const row of state.refunds) {
          if (row.saleId === where.saleId) {
            sum = sum.plus(row.amount)
          }
        }
        return { _sum: { amount: sum } }
      },
      create: async ({
        data,
      }: {
        data: {
          refundNo: string
          kind: RefundKind
          saleId: string | null
          branchId: string
          staffId: string | null
          originalReceiptId: string | null
          amount: Prisma.Decimal
          reasonCode: string | null
          reason: string | null
          createdAt?: Date
        }
      }) => {
        const row: RefundRow = {
          id: nextId("refund"),
          createdAt: data.createdAt ?? new Date(),
          refundNo: data.refundNo,
          kind: data.kind,
          saleId: data.saleId,
          branchId: data.branchId,
          staffId: data.staffId,
          originalReceiptId: data.originalReceiptId,
          amount: data.amount,
          reasonCode: data.reasonCode,
          reason: data.reason,
        }
        state.refunds.push(row)
        return row
      },
    },
  } as unknown as PrismaTypes.TransactionClient

  return { tx, state }
}
