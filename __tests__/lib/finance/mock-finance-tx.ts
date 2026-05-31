import { Prisma } from "@/generated/prisma/client"
import type { Prisma as PrismaTypes } from "@/generated/prisma/client"
import {
  AccountingPeriodStatus,
  GlAccountType,
  VoucherStatus,
} from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { createMockTx, type MockTxState } from "../stock/helpers/mock-tx"

type GlAccountRow = {
  id: string
  code: string
  name: string
  accountType: GlAccountType
  isActive: boolean
  deleted: boolean
}

type AccountingPeriodRow = {
  id: string
  periodKey: string
  branchId: string
  status: AccountingPeriodStatus
  openedAt: Date
  closedAt: Date | null
}

type VoucherLineRow = {
  id: string
  voucherId: string
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
}

type VoucherRow = {
  id: string
  voucherNo: string
  date: Date
  status: VoucherStatus
  branchId: string
  periodId: string
  refType: string
  refId: string
  refNo: string | null
  description: string | null
  postedAt: Date | null
  createdAt: Date
}

type JournalEntryLineRow = {
  id: string
  journalEntryId: string
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
}

type JournalEntryRow = {
  id: string
  voucherId: string
  date: Date
  branchId: string
  periodId: string
  postedAt: Date
  createdAt: Date
}

let seq = 0
function nextId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}`
}

type AccountingPeriodCloseEvidenceRow = {
  id: string
  periodId: string
  branchId: string
  periodKey: string
  closeMode: string
  closedAt: Date
  closedByStaffId: string
  closedByName: string
  closedByRole: string
  readinessStatus: string
  gatePolicyKey: string
  reconciliationSnapshotId: string | null
  priorSnapshotId: string | null
  payloadVersion: number
  payload: unknown
  createdAt: Date
}

type AccountingPeriodReopenEvidenceRow = {
  id: string
  periodId: string
  branchId: string
  periodKey: string
  fromStatus: string
  toStatus: string
  reopenedAt: Date
  reopenedByStaffId: string
  reopenedByName: string
  reopenedByRole: string
  reason: string
  closeEvidenceId: string | null
  payloadVersion: number
  payload: unknown
  createdAt: Date
}

export type FinanceMockState = MockTxState & {
  glAccounts: GlAccountRow[]
  accountingPeriods: AccountingPeriodRow[]
  accountingPeriodCloseEvidence: AccountingPeriodCloseEvidenceRow[]
  accountingPeriodReopenEvidence: AccountingPeriodReopenEvidenceRow[]
  vouchers: VoucherRow[]
  voucherLines: VoucherLineRow[]
  journalEntries: JournalEntryRow[]
  journalEntryLines: JournalEntryLineRow[]
}

const DEFAULT_CHART: { code: string; name: string; accountType: GlAccountType }[] = [
  { code: DEFAULT_ACCOUNT_CODES.INVENTORY, name: "Inventory", accountType: GlAccountType.ASSET },
  { code: DEFAULT_ACCOUNT_CODES.CASH, name: "Cash", accountType: GlAccountType.ASSET },
  { code: DEFAULT_ACCOUNT_CODES.CARD_CLEARING, name: "Card clearing", accountType: GlAccountType.ASSET },
  { code: DEFAULT_ACCOUNT_CODES.REVENUE, name: "Revenue", accountType: GlAccountType.REVENUE },
  { code: DEFAULT_ACCOUNT_CODES.COGS, name: "COGS", accountType: GlAccountType.EXPENSE },
  { code: DEFAULT_ACCOUNT_CODES.AP, name: "Accounts payable", accountType: GlAccountType.LIABILITY },
]

export function createFinanceMockTx(branchId = "branch-1") {
  seq = 0
  const { tx: baseTx, state: baseState } = createMockTx()
  const state: FinanceMockState = {
    ...baseState,
    glAccounts: DEFAULT_CHART.map((row) => ({
      id: nextId("gl"),
      code: row.code,
      name: row.name,
      accountType: row.accountType,
      isActive: true,
      deleted: false,
    })),
    accountingPeriods: [],
    accountingPeriodCloseEvidence: [],
    accountingPeriodReopenEvidence: [],
    vouchers: [],
    voucherLines: [],
    journalEntries: [],
    journalEntryLines: [],
  }

  const tx = {
    ...baseTx,
    glAccount: {
      findMany: async ({
        where,
      }: {
        where?: {
          code?: { in: string[] }
          deleted?: boolean
          isActive?: boolean
        }
      }) => {
        return state.glAccounts.filter((a) => {
          if (where?.deleted !== undefined && a.deleted !== where.deleted) return false
          if (where?.isActive !== undefined && a.isActive !== where.isActive) return false
          if (where?.code?.in && !where.code.in.includes(a.code)) return false
          return true
        })
      },
    },
    accountingPeriod: {
      findUnique: async ({
        where,
      }: {
        where: { id?: string; branchId_periodKey?: { branchId: string; periodKey: string } }
      }) => {
        if (where.id) {
          return state.accountingPeriods.find((p) => p.id === where.id) ?? null
        }
        if (where.branchId_periodKey) {
          const { branchId: b, periodKey } = where.branchId_periodKey
          return (
            state.accountingPeriods.find(
              (p) => p.branchId === b && p.periodKey === periodKey
            ) ?? null
          )
        }
        return null
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string }
        data: { status?: AccountingPeriodStatus; closedAt?: Date | null }
      }) => {
        const period = state.accountingPeriods.find((p) => p.id === where.id)
        if (!period) throw new Error(`period not found: ${where.id}`)
        if (data.status !== undefined) period.status = data.status
        if (data.closedAt !== undefined) period.closedAt = data.closedAt
        return { ...period }
      },
      create: async ({
        data,
      }: {
        data: {
          branchId: string
          periodKey: string
          status: AccountingPeriodStatus
        }
      }) => {
        const row: AccountingPeriodRow = {
          id: nextId("period"),
          branchId: data.branchId,
          periodKey: data.periodKey,
          status: data.status,
          openedAt: new Date(),
          closedAt: null,
        }
        state.accountingPeriods.push(row)
        return row
      },
    },
    accountingPeriodCloseEvidence: {
      findUnique: async ({
        where,
      }: {
        where: { periodId?: string; id?: string }
      }) => {
        if (where.id) {
          return (
            state.accountingPeriodCloseEvidence.find((row) => row.id === where.id) ??
            null
          )
        }
        return null
      },
      findFirst: async ({
        where,
        orderBy,
      }: {
        where: { periodId: string }
        orderBy?: { closedAt: "desc" }
      }) => {
        const rows = state.accountingPeriodCloseEvidence
          .filter((row) => row.periodId === where.periodId)
          .sort((a, b) => {
            if (orderBy?.closedAt === "desc") {
              return b.closedAt.getTime() - a.closedAt.getTime()
            }
            return 0
          })
        return rows[0] ?? null
      },
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { periodId: string }
        orderBy?: { closedAt: "desc" }
      }) => {
        const rows = state.accountingPeriodCloseEvidence.filter(
          (row) => row.periodId === where.periodId
        )
        if (orderBy?.closedAt === "desc") {
          return [...rows].sort(
            (a, b) => b.closedAt.getTime() - a.closedAt.getTime()
          )
        }
        return rows
      },
      create: async ({
        data,
      }: {
        data: Omit<AccountingPeriodCloseEvidenceRow, "id" | "createdAt">
      }) => {
        const row: AccountingPeriodCloseEvidenceRow = {
          id: nextId("close-evidence"),
          createdAt: new Date(),
          ...data,
        }
        state.accountingPeriodCloseEvidence.push(row)
        return row
      },
    },
    accountingPeriodReopenEvidence: {
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { periodId: string }
        orderBy?: { reopenedAt: "desc" }
      }) => {
        const rows = state.accountingPeriodReopenEvidence.filter(
          (row) => row.periodId === where.periodId
        )
        if (orderBy?.reopenedAt === "desc") {
          return [...rows].sort(
            (a, b) => b.reopenedAt.getTime() - a.reopenedAt.getTime()
          )
        }
        return rows
      },
      create: async ({
        data,
      }: {
        data: Omit<AccountingPeriodReopenEvidenceRow, "id" | "createdAt">
      }) => {
        const row: AccountingPeriodReopenEvidenceRow = {
          id: nextId("reopen-evidence"),
          createdAt: new Date(),
          ...data,
        }
        state.accountingPeriodReopenEvidence.push(row)
        return row
      },
    },
    voucher: {
      count: async ({
        where,
      }: {
        where?: { period?: { periodKey?: string } }
      }) => {
        if (!where?.period?.periodKey) return state.vouchers.length
        const periodIds = state.accountingPeriods
          .filter((p) => p.periodKey === where.period!.periodKey)
          .map((p) => p.id)
        return state.vouchers.filter((v) => periodIds.includes(v.periodId)).length
      },
      findUnique: async ({
        where,
        include,
      }: {
        where: {
          refType_refId?: { refType: string; refId: string }
        }
        include?: { journalEntry?: boolean }
      }) => {
        if (!where.refType_refId) return null
        const { refType, refId } = where.refType_refId
        const voucher = state.vouchers.find(
          (v) => v.refType === refType && v.refId === refId
        )
        if (!voucher) return null
        if (include?.journalEntry) {
          const journalEntry =
            state.journalEntries.find((j) => j.voucherId === voucher.id) ?? null
          return { ...voucher, journalEntry }
        }
        return voucher
      },
      create: async ({
        data,
      }: {
        data: {
          voucherNo: string
          date: Date
          status: VoucherStatus
          branchId: string
          periodId: string
          refType: string
          refId: string
          refNo?: string | null
          description?: string | null
          postedAt?: Date | null
          lines: {
            create: {
              lineNo: number
              glAccountId: string
              debit: Prisma.Decimal
              credit: Prisma.Decimal
              memo?: string | null
            }[]
          }
        }
      }) => {
        if (state.vouchers.some((v) => v.voucherNo === data.voucherNo)) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          })
        }
        const voucher: VoucherRow = {
          id: nextId("voucher"),
          voucherNo: data.voucherNo,
          date: data.date,
          status: data.status,
          branchId: data.branchId,
          periodId: data.periodId,
          refType: data.refType,
          refId: data.refId,
          refNo: data.refNo ?? null,
          description: data.description ?? null,
          postedAt: data.postedAt ?? null,
          createdAt: new Date(),
        }
        state.vouchers.push(voucher)
        for (const line of data.lines.create) {
          state.voucherLines.push({
            id: nextId("vline"),
            voucherId: voucher.id,
            lineNo: line.lineNo,
            glAccountId: line.glAccountId,
            debit: line.debit,
            credit: line.credit,
            memo: line.memo ?? null,
          })
        }
        return voucher
      },
    },

    voucherLine: {
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { voucherId?: string }
        orderBy?: { lineNo?: "asc" | "desc" }
      }) => {
        let rows = state.voucherLines.filter((l) => {
          if (where.voucherId && l.voucherId !== where.voucherId) return false
          return true
        })
        if (orderBy?.lineNo === "asc") {
          rows = [...rows].sort((a, b) => a.lineNo - b.lineNo)
        }
        return rows
      },
    },    journalEntry: {
      findUnique: async ({ where }: { where: { voucherId?: string } }) => {
        if (where.voucherId) {
          return (
            state.journalEntries.find((j) => j.voucherId === where.voucherId) ??
            null
          )
        }
        return null
      },
      create: async ({
        data,
      }: {
        data: {
          voucherId: string
          date: Date
          branchId: string
          periodId: string
          lines: {
            create: {
              lineNo: number
              glAccountId: string
              debit: Prisma.Decimal
              credit: Prisma.Decimal
              memo?: string | null
            }[]
          }
        }
      }) => {
        const entry: JournalEntryRow = {
          id: nextId("journal"),
          voucherId: data.voucherId,
          date: data.date,
          branchId: data.branchId,
          periodId: data.periodId,
          postedAt: new Date(),
          createdAt: new Date(),
        }
        state.journalEntries.push(entry)
        for (const line of data.lines.create) {
          state.journalEntryLines.push({
            id: nextId("jline"),
            journalEntryId: entry.id,
            lineNo: line.lineNo,
            glAccountId: line.glAccountId,
            debit: line.debit,
            credit: line.credit,
            memo: line.memo ?? null,
          })
        }
        return entry
      },
    },
    journalEntryLine: {
      findMany: async ({
        where,
      }: {
        where?: {
          glAccountId?: { in: string[] }
          journalEntry?: {
            branchId?: string
            date?: { gte?: Date; lt?: Date }
          }
        }
      }) => {
        return state.journalEntryLines.filter((line) => {
          if (where?.glAccountId?.in && !where.glAccountId.in.includes(line.glAccountId)) {
            return false
          }
          if (where?.journalEntry) {
            const entry = state.journalEntries.find((j) => j.id === line.journalEntryId)
            if (!entry) return false
            if (
              where.journalEntry.branchId &&
              entry.branchId !== where.journalEntry.branchId
            ) {
              return false
            }
            if (where.journalEntry.date) {
              const { gte, lt } = where.journalEntry.date
              if (gte && entry.date.getTime() < gte.getTime()) return false
              if (lt && entry.date.getTime() >= lt.getTime()) return false
            }
          }
          return true
        })
      },
    },
  } as unknown as PrismaTypes.TransactionClient

  return { tx, state, branchId }
}