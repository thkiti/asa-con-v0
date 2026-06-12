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
  legalEntityCode?: string
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
  legalEntityCode?: string
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
  legalEntityCode?: string
  periodId: string
  postedAt: Date
  createdAt: Date
  reversalOfJournalEntryId: string | null
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

type AccountingPeriodReopenRequestRow = {
  id: string
  requestNo: string
  periodId: string
  branchId: string
  periodKey: string
  fromStatus: string
  toStatus: string
  reason: string
  status: string
  requestedAt: Date
  requestedByStaffId: string
  requestedByName: string
  requestedByRole: string
  approvedAt: Date | null
  approvedByStaffId: string | null
  approvedByName: string | null
  approvedByRole: string | null
  approvalNote: string | null
  rejectedAt: Date | null
  rejectedByStaffId: string | null
  rejectedByName: string | null
  rejectedByRole: string | null
  rejectionNote: string | null
  cancelledAt: Date | null
  cancelledByStaffId: string | null
  cancelledByName: string | null
  cancelledByRole: string | null
  executedAt: Date | null
  reopenEvidenceId: string | null
  closeEvidenceId: string | null
  policyKey: string
  payloadVersion: number
  payload: unknown
  createdAt: Date
}

export type FinanceMockState = MockTxState & {
  glAccounts: GlAccountRow[]
  accountingPeriods: AccountingPeriodRow[]
  accountingPeriodCloseEvidence: AccountingPeriodCloseEvidenceRow[]
  accountingPeriodReopenEvidence: AccountingPeriodReopenEvidenceRow[]
  accountingPeriodReopenRequest: AccountingPeriodReopenRequestRow[]
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
    accountingPeriodReopenRequest: [],
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
        orderBy,
      }: {
        where?: {
          code?: { in: string[] }
          accountType?: { in: string[] }
          deleted?: boolean
          isActive?: boolean
        }
        orderBy?:
          | Array<{ accountType?: "asc" | "desc"; code?: "asc" | "desc" }>
          | { accountType?: "asc" | "desc"; code?: "asc" | "desc" }
      }) => {
        let rows = state.glAccounts.filter((a) => {
          if (where?.deleted !== undefined && a.deleted !== where.deleted) return false
          if (where?.isActive !== undefined && a.isActive !== where.isActive) return false
          if (where?.code?.in && !where.code.in.includes(a.code)) return false
          if (
            where?.accountType?.in &&
            !where.accountType.in.includes(a.accountType)
          ) {
            return false
          }
          return true
        })
        const orderRules = Array.isArray(orderBy)
          ? orderBy
          : orderBy
            ? [orderBy]
            : []
        if (orderRules.length) {
          rows = [...rows].sort((a, b) => {
            for (const ob of orderRules) {
              if (ob.accountType) {
                const diff = a.accountType.localeCompare(b.accountType)
                if (diff !== 0) return ob.accountType === "desc" ? -diff : diff
              }
              if (ob.code) {
                const diff = a.code.localeCompare(b.code)
                if (diff !== 0) return ob.code === "desc" ? -diff : diff
              }
            }
            return 0
          })
        }
        return rows
      },
    },
    accountingPeriod: {
      findUnique: async ({
        where,
        include,
      }: {
        where: {
          id?: string
          legalEntityCode_periodKey?: { legalEntityCode: string; periodKey: string }
        }
        include?: {
          closeEvidence?: { orderBy?: { closedAt: "asc" | "desc" } }
          reopenEvidence?: { orderBy?: { reopenedAt: "asc" | "desc" } }
          reopenRequests?: { orderBy?: { requestedAt: "asc" | "desc" } }
        }
      }) => {
        let period: AccountingPeriodRow | null = null
        if (where.id) {
          period = state.accountingPeriods.find((p) => p.id === where.id) ?? null
        } else if (where.legalEntityCode_periodKey) {
          const { legalEntityCode, periodKey } = where.legalEntityCode_periodKey
          period =
            state.accountingPeriods.find(
              (p) =>
                (p.legalEntityCode ?? "AS") === legalEntityCode &&
                p.periodKey === periodKey
            ) ?? null
        }
        if (!period || !include) {
          return period
        }
        const result = { ...period } as AccountingPeriodRow & {
          closeEvidence?: AccountingPeriodCloseEvidenceRow[]
          reopenEvidence?: AccountingPeriodReopenEvidenceRow[]
          reopenRequests?: AccountingPeriodReopenRequestRow[]
        }
        if (include.closeEvidence) {
          let rows = state.accountingPeriodCloseEvidence.filter(
            (row) => row.periodId === period.id
          )
          const closedOrder = include.closeEvidence.orderBy?.closedAt
          if (closedOrder === "asc") {
            rows = [...rows].sort(
              (a, b) => a.closedAt.getTime() - b.closedAt.getTime()
            )
          } else if (closedOrder === "desc") {
            rows = [...rows].sort(
              (a, b) => b.closedAt.getTime() - a.closedAt.getTime()
            )
          }
          result.closeEvidence = rows
        }
        if (include.reopenEvidence) {
          let rows = state.accountingPeriodReopenEvidence.filter(
            (row) => row.periodId === period.id
          )
          const reopenedOrder = include.reopenEvidence.orderBy?.reopenedAt
          if (reopenedOrder === "asc") {
            rows = [...rows].sort(
              (a, b) => a.reopenedAt.getTime() - b.reopenedAt.getTime()
            )
          } else if (reopenedOrder === "desc") {
            rows = [...rows].sort(
              (a, b) => b.reopenedAt.getTime() - a.reopenedAt.getTime()
            )
          }
          result.reopenEvidence = rows
        }
        if (include.reopenRequests) {
          let rows = state.accountingPeriodReopenRequest.filter(
            (row) => row.periodId === period.id
          )
          const requestedOrder = include.reopenRequests.orderBy?.requestedAt
          if (requestedOrder === "asc") {
            rows = [...rows].sort(
              (a, b) => a.requestedAt.getTime() - b.requestedAt.getTime()
            )
          } else if (requestedOrder === "desc") {
            rows = [...rows].sort(
              (a, b) => b.requestedAt.getTime() - a.requestedAt.getTime()
            )
          }
          result.reopenRequests = rows
        }
        return result
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
          legalEntityCode?: string
          status: AccountingPeriodStatus
        }
      }) => {
        const row: AccountingPeriodRow = {
          id: nextId("period"),
          branchId: data.branchId,
          legalEntityCode: data.legalEntityCode ?? "AS",
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
      findFirst: async ({
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
          return (
            [...rows].sort(
              (a, b) => b.reopenedAt.getTime() - a.reopenedAt.getTime()
            )[0] ?? null
          )
        }
        return rows[0] ?? null
      },
    },
    accountingPeriodReopenRequest: {
      count: async ({ where }: { where?: { periodKey?: string } }) => {
        if (!where?.periodKey) {
          return state.accountingPeriodReopenRequest.length
        }
        return state.accountingPeriodReopenRequest.filter(
          (row) => row.periodKey === where.periodKey
        ).length
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        return (
          state.accountingPeriodReopenRequest.find((row) => row.id === where.id) ??
          null
        )
      },
      findFirst: async ({
        where,
        orderBy,
      }: {
        where: { periodId?: string; status?: string }
        orderBy?: { requestedAt: "desc" }
      }) => {
        let rows = state.accountingPeriodReopenRequest
        if (where.periodId) {
          rows = rows.filter((row) => row.periodId === where.periodId)
        }
        if (where.status) {
          rows = rows.filter((row) => row.status === where.status)
        }
        if (orderBy?.requestedAt === "desc") {
          return (
            [...rows].sort(
              (a, b) => b.requestedAt.getTime() - a.requestedAt.getTime()
            )[0] ?? null
          )
        }
        return rows[0] ?? null
      },
      findMany: async ({
        where,
        orderBy,
      }: {
        where?: { periodId?: string; status?: string }
        orderBy?: { requestedAt: "desc" }
      }) => {
        let rows = state.accountingPeriodReopenRequest
        if (where?.periodId) {
          rows = rows.filter((row) => row.periodId === where.periodId)
        }
        if (where?.status) {
          rows = rows.filter((row) => row.status === where.status)
        }
        if (orderBy?.requestedAt === "desc") {
          return [...rows].sort(
            (a, b) => b.requestedAt.getTime() - a.requestedAt.getTime()
          )
        }
        return rows
      },
      create: async ({
        data,
      }: {
        data: Omit<AccountingPeriodReopenRequestRow, "id" | "createdAt">
      }) => {
        const row: AccountingPeriodReopenRequestRow = {
          id: nextId("reopen-request"),
          createdAt: new Date(),
          ...data,
        }
        state.accountingPeriodReopenRequest.push(row)
        return row
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string }
        data: Partial<
          Omit<AccountingPeriodReopenRequestRow, "id" | "createdAt" | "requestNo">
        >
      }) => {
        const row = state.accountingPeriodReopenRequest.find((r) => r.id === where.id)
        if (!row) throw new Error(`reopen request not found: ${where.id}`)
        Object.assign(row, data)
        return { ...row }
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
        select,
      }: {
        where: {
          id?: string
          refType_refId?: { refType: string; refId: string }
        }
        include?: { journalEntry?: boolean }
        select?: { legalEntityCode?: boolean }
      }) => {
        let voucher: VoucherRow | null = null
        if (where.id) {
          voucher = state.vouchers.find((v) => v.id === where.id) ?? null
        } else if (where.refType_refId) {
          const { refType, refId } = where.refType_refId
          voucher =
            state.vouchers.find(
              (v) => v.refType === refType && v.refId === refId
            ) ?? null
        }
        if (!voucher) return null
        if (select?.legalEntityCode) {
          return {
            legalEntityCode: voucher.legalEntityCode ?? "AS",
          }
        }
        if (include?.journalEntry) {
          const journalEntry =
            state.journalEntries.find((j) => j.voucherId === voucher!.id) ?? null
          return { ...voucher, journalEntry }
        }
        return voucher
      },
      findMany: async ({
        where,
        orderBy,
        include,
      }: {
        where?: {
          periodId?: string
          refType?: string
        }
        orderBy?: { createdAt?: "asc" | "desc" }
        include?: {
          journalEntry?: {
            include?: {
              reversedBy?: { select: { id: boolean } }
              lines?: {
                orderBy?: { lineNo: "asc" | "desc" }
                include?: { glAccount?: { select: { code: boolean } } }
              }
            }
          }
        }
      }) => {
        let rows = state.vouchers.filter((voucher) => {
          if (where?.periodId && voucher.periodId !== where.periodId) return false
          if (where?.refType && voucher.refType !== where.refType) return false
          return true
        })

        if (orderBy?.createdAt === "asc") {
          rows = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        } else if (orderBy?.createdAt === "desc") {
          rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        }

        return rows.map((voucher) => {
          if (!include?.journalEntry) {
            return voucher
          }

          const journalEntry =
            state.journalEntries.find((entry) => entry.voucherId === voucher.id) ?? null
          if (!journalEntry) {
            return { ...voucher, journalEntry: null }
          }

          const reversedBy =
            state.journalEntries.find(
              (entry) => entry.reversalOfJournalEntryId === journalEntry.id
            ) ?? null

          let lines = state.journalEntryLines.filter(
            (line) => line.journalEntryId === journalEntry.id
          )
          if (include.journalEntry.include?.lines?.orderBy?.lineNo === "asc") {
            lines = [...lines].sort((a, b) => a.lineNo - b.lineNo)
          }

          const mappedLines = lines.map((line) => {
            const account = state.glAccounts.find((a) => a.id === line.glAccountId)!
            return {
              ...line,
              glAccount: { code: account.code },
            }
          })

          return {
            ...voucher,
            journalEntry: {
              ...journalEntry,
              reversedBy: reversedBy ? { id: reversedBy.id } : null,
              lines: mappedLines,
            },
          }
        })
      },
      create: async ({
        data,
      }: {
        data: {
          voucherNo: string
          date: Date
          status: VoucherStatus
          branchId: string
          legalEntityCode?: string
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
        const period = state.accountingPeriods.find((p) => p.id === data.periodId)
        const voucher: VoucherRow = {
          id: nextId("voucher"),
          voucherNo: data.voucherNo,
          date: data.date,
          status: data.status,
          branchId: data.branchId,
          legalEntityCode: data.legalEntityCode ?? period?.legalEntityCode ?? "AS",
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
    },
    journalEntry: {
      findUnique: async ({
        where,
        include,
        select,
      }: {
        where: { voucherId?: string; id?: string }
        include?: {
          lines?: { orderBy?: { lineNo: "asc" } }
          voucher?: { select: Record<string, boolean> }
          reversedBy?: { select: Record<string, unknown> }
          reverses?: { select: Record<string, unknown> }
        }
        select?: Record<string, unknown>
      }) => {
        let entry: JournalEntryRow | null = null
        if (where.voucherId) {
          entry =
            state.journalEntries.find((j) => j.voucherId === where.voucherId) ??
            null
        } else if (where.id) {
          entry = state.journalEntries.find((j) => j.id === where.id) ?? null
        }
        if (!entry) return null

        const buildLine = (line: JournalEntryLineRow) => {
          const account = state.glAccounts.find((a) => a.id === line.glAccountId)!
          return {
            ...line,
            glAccount: { code: account.code, name: account.name },
          }
        }

        const buildVoucher = (voucherId: string, voucherSelect?: Record<string, boolean>) => {
          const voucher = state.vouchers.find((v) => v.id === voucherId)!
          if (!voucherSelect) return voucher
          const result: Record<string, unknown> = {}
          for (const key of Object.keys(voucherSelect)) {
            if (voucherSelect[key]) {
              result[key] = voucher[key as keyof VoucherRow]
            }
          }
          return result
        }

        if (select) {
          const result: Record<string, unknown> = {}
          for (const key of Object.keys(select)) {
            if (key === "lines") {
              let lines = state.journalEntryLines.filter(
                (l) => l.journalEntryId === entry!.id
              )
              const orderBy = (select.lines as { orderBy?: { lineNo: "asc" } })?.orderBy
              if (orderBy?.lineNo === "asc") {
                lines = [...lines].sort((a, b) => a.lineNo - b.lineNo)
              }
              const lineSelect = (select.lines as { select?: Record<string, unknown> })
                ?.select
              result.lines = lines.map((line) => {
                if (!lineSelect) return line
                const row: Record<string, unknown> = {}
                for (const lk of Object.keys(lineSelect)) {
                  if (lk === "glAccount") {
                    const account = state.glAccounts.find((a) => a.id === line.glAccountId)!
                    row.glAccount = { code: account.code, name: account.name }
                  } else {
                    row[lk] = line[lk as keyof JournalEntryLineRow]
                  }
                }
                return row
              })
            } else if (key === "voucher") {
              const voucherSelect = (select.voucher as { select?: Record<string, boolean> })
                ?.select
              result.voucher = buildVoucher(entry.voucherId, voucherSelect)
            } else if (key === "reverses" || key === "reversedBy") {
              const relSelect = (select[key] as { select?: Record<string, unknown> })?.select
              const relEntry =
                key === "reverses"
                  ? entry!.reversalOfJournalEntryId
                    ? (state.journalEntries.find(
                        (j) => j.id === entry!.reversalOfJournalEntryId
                      ) ?? null)
                    : null
                  : state.journalEntries.find(
                      (j) => j.reversalOfJournalEntryId === entry!.id
                    ) ?? null
              if (!relEntry) {
                result[key] = null
              } else if (!relSelect) {
                result[key] = relEntry
              } else {
                const row: Record<string, unknown> = {}
                for (const rk of Object.keys(relSelect)) {
                  if (rk === "voucher") {
                    const vs = (relSelect.voucher as { select?: Record<string, boolean> })
                      ?.select
                    row.voucher = buildVoucher(relEntry.voucherId, vs)
                  } else {
                    row[rk] = relEntry[rk as keyof JournalEntryRow]
                  }
                }
                result[key] = row
              }
            } else {
              result[key] = entry[key as keyof JournalEntryRow]
            }
          }
          return result
        }

        if (!include) return entry

        const result: Record<string, unknown> = { ...entry }
        if (include.lines) {
          let lines = state.journalEntryLines.filter(
            (l) => l.journalEntryId === entry!.id
          )
          if (include.lines.orderBy?.lineNo === "asc") {
            lines = [...lines].sort((a, b) => a.lineNo - b.lineNo)
          }
          result.lines = lines.map(buildLine)
        }
        if (include.voucher) {
          result.voucher = buildVoucher(
            entry.voucherId,
            include.voucher.select as Record<string, boolean> | undefined
          )
        }
        if (include.reversedBy) {
          const reversedBy =
            state.journalEntries.find(
              (j) => j.reversalOfJournalEntryId === entry!.id
            ) ?? null
          if (reversedBy) {
            const row: Record<string, unknown> = { id: reversedBy.id }
            const sel = include.reversedBy.select as Record<string, unknown> | undefined
            if (sel?.voucher) {
              const vs = (sel.voucher as { select?: Record<string, boolean> }).select
              row.voucher = buildVoucher(reversedBy.voucherId, vs)
            }
            result.reversedBy = row
          } else {
            result.reversedBy = null
          }
        }
        if (include.reverses) {
          const reverses = entry.reversalOfJournalEntryId
            ? (state.journalEntries.find((j) => j.id === entry!.reversalOfJournalEntryId) ??
              null)
            : null
          if (reverses) {
            const row: Record<string, unknown> = { ...reverses }
            const sel = include.reverses.select as Record<string, unknown> | undefined
            if (sel?.voucher) {
              const vs = (sel.voucher as { select?: Record<string, boolean> }).select
              row.voucher = buildVoucher(reverses.voucherId, vs)
            }
            result.reverses = row
          } else {
            result.reverses = null
          }
        }
        return result
      },
      findMany: async ({
        where,
        orderBy,
        take,
        skip,
        select,
      }: {
        where?: {
          branchId?: string
          periodId?: string
          date?: { gte?: Date; lte?: Date }
          voucher?: { refType?: { in: string[] } }
        }
        orderBy?: Array<{ date?: "desc" | "asc"; createdAt?: "desc" | "asc" }>
        take?: number
        skip?: number
        select?: Record<string, unknown>
      }) => {
        let rows = state.journalEntries.filter((entry) => {
          if (where?.branchId && entry.branchId !== where.branchId) return false
          if (where?.periodId && entry.periodId !== where.periodId) return false
          if (where?.date) {
            if (where.date.gte && entry.date.getTime() < where.date.gte.getTime()) {
              return false
            }
            if (where.date.lt && entry.date.getTime() >= where.date.lt.getTime()) {
              return false
            }
            if (where.date.lte && entry.date.getTime() > where.date.lte.getTime()) {
              return false
            }
          }
          if (where?.voucher?.refType?.in) {
            const voucher = state.vouchers.find((v) => v.id === entry.voucherId)
            if (!voucher || !where.voucher.refType.in.includes(voucher.refType)) {
              return false
            }
          }
          return true
        })

        if (orderBy?.length) {
          rows = [...rows].sort((a, b) => {
            for (const ob of orderBy) {
              if (ob.date) {
                const diff = a.date.getTime() - b.date.getTime()
                if (diff !== 0) return ob.date === "desc" ? -diff : diff
              }
              if (ob.createdAt) {
                const diff = a.createdAt.getTime() - b.createdAt.getTime()
                if (diff !== 0) return ob.createdAt === "desc" ? -diff : diff
              }
            }
            return 0
          })
        }

        if (skip) rows = rows.slice(skip)
        if (take != null) rows = rows.slice(0, take)

        if (!select) return rows

        return rows.map((entry) => {
          const result: Record<string, unknown> = {}
          for (const key of Object.keys(select)) {
            if (key === "voucher") {
              const voucherSelect = (select.voucher as { select?: Record<string, boolean> })
                ?.select
              const voucher = state.vouchers.find((v) => v.id === entry.voucherId)!
              if (!voucherSelect) {
                result.voucher = voucher
              } else {
                const row: Record<string, unknown> = {}
                for (const vk of Object.keys(voucherSelect)) {
                  row[vk] = voucher[vk as keyof VoucherRow]
                }
                result.voucher = row
              }
            } else if (key === "lines") {
              const lineSelect = (select.lines as { select?: Record<string, boolean> })?.select
              const lines = state.journalEntryLines.filter(
                (l) => l.journalEntryId === entry.id
              )
              result.lines = lines.map((line) => {
                if (!lineSelect) return line
                const row: Record<string, unknown> = {}
                for (const lk of Object.keys(lineSelect)) {
                  row[lk] = line[lk as keyof JournalEntryLineRow]
                }
                return row
              })
            } else if (key === "reversedBy") {
              const reversedBy =
                state.journalEntries.find(
                  (j) => j.reversalOfJournalEntryId === entry.id
                ) ?? null
              if (!reversedBy) {
                result.reversedBy = null
              } else {
                const relSelect = (select.reversedBy as { select?: Record<string, unknown> })
                  ?.select
                const row: Record<string, unknown> = { id: reversedBy.id }
                if (relSelect?.voucher) {
                  const vs = (relSelect.voucher as { select?: Record<string, boolean> }).select
                  const voucher = state.vouchers.find((v) => v.id === reversedBy.voucherId)!
                  const vr: Record<string, unknown> = {}
                  if (vs) {
                    for (const vk of Object.keys(vs)) {
                      vr[vk] = voucher[vk as keyof VoucherRow]
                    }
                  }
                  row.voucher = vr
                }
                result.reversedBy = row
              }
            } else {
              result[key] = entry[key as keyof JournalEntryRow]
            }
          }
          return result
        })
      },
      count: async ({
        where,
      }: {
        where?: {
          branchId?: string
          periodId?: string
          date?: { gte?: Date; lte?: Date }
          voucher?: { refType?: { in: string[] } }
        }
      }) => {
        let rows = state.journalEntries
        if (where) {
          rows = rows.filter((entry) => {
            if (where.branchId && entry.branchId !== where.branchId) return false
            if (where.periodId && entry.periodId !== where.periodId) return false
            if (where.date) {
              if (where.date.gte && entry.date.getTime() < where.date.gte.getTime()) {
                return false
              }
              if (where.date.lte && entry.date.getTime() > where.date.lte.getTime()) {
                return false
              }
            }
            if (where.voucher?.refType?.in) {
              const voucher = state.vouchers.find((v) => v.id === entry.voucherId)
              if (!voucher || !where.voucher.refType.in.includes(voucher.refType)) {
                return false
              }
            }
            return true
          })
        }
        return rows.length
      },
      create: async ({
        data,
      }: {
        data: {
          voucherId: string
          date: Date
          branchId: string
          legalEntityCode?: string
          periodId: string
          reversalOfJournalEntryId?: string | null
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
        const voucher = state.vouchers.find((v) => v.id === data.voucherId)
        const entry: JournalEntryRow = {
          id: nextId("journal"),
          voucherId: data.voucherId,
          date: data.date,
          branchId: data.branchId,
          legalEntityCode: data.legalEntityCode ?? voucher?.legalEntityCode ?? "AS",
          periodId: data.periodId,
          postedAt: new Date(),
          createdAt: new Date(),
          reversalOfJournalEntryId: data.reversalOfJournalEntryId ?? null,
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
        select,
      }: {
        where?: {
          glAccountId?: string | { in: string[] }
          journalEntry?: {
            branchId?: string
            periodId?: string
            date?: { gte?: Date; lt?: Date; lte?: Date }
          }
        }
        select?: Record<string, unknown>
      }) => {
        const lines = state.journalEntryLines.filter((line) => {
          if (where?.glAccountId) {
            if (typeof where.glAccountId === "string") {
              if (line.glAccountId !== where.glAccountId) return false
            } else if (!where.glAccountId.in.includes(line.glAccountId)) {
              return false
            }
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
            if (
              where.journalEntry.periodId &&
              entry.periodId !== where.journalEntry.periodId
            ) {
              return false
            }
            if (where.journalEntry.date) {
              const { gte, lt, lte } = where.journalEntry.date
              if (gte && entry.date.getTime() < gte.getTime()) return false
              if (lt && entry.date.getTime() >= lt.getTime()) return false
              if (lte && entry.date.getTime() > lte.getTime()) return false
            }
          }
          return true
        })

        if (!select) return lines

        return lines.map((line) => {
          const entry = state.journalEntries.find((j) => j.id === line.journalEntryId)!
          const voucher = state.vouchers.find((v) => v.id === entry.voucherId)
          const result: Record<string, unknown> = {}
          for (const key of Object.keys(select)) {
            if (key === "journalEntry") {
              const entrySelect = (select.journalEntry as { select?: Record<string, unknown> })
                ?.select
              const entryRow: Record<string, unknown> = {}
              if (entrySelect) {
                for (const ek of Object.keys(entrySelect)) {
                  if (ek === "voucher") {
                    const voucherSelect = (
                      entrySelect.voucher as { select?: Record<string, boolean> }
                    )?.select
                    if (voucher && voucherSelect) {
                      const voucherRow: Record<string, unknown> = {}
                      for (const vk of Object.keys(voucherSelect)) {
                        voucherRow[vk] = voucher[vk as keyof VoucherRow]
                      }
                      entryRow.voucher = voucherRow
                    } else {
                      entryRow.voucher = voucher
                    }
                  } else {
                    entryRow[ek] = entry[ek as keyof JournalEntryRow]
                  }
                }
              } else {
                Object.assign(entryRow, entry)
              }
              result.journalEntry = entryRow
            } else {
              result[key] = line[key as keyof JournalEntryLineRow]
            }
          }
          return result
        })
      },
    },
  } as unknown as PrismaTypes.TransactionClient

  return { tx, state, branchId }
}