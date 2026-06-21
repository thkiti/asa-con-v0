import { Prisma } from "@/generated/prisma/client"
import type { ManualJournalEntryWithLines } from "@/lib/finance/manual-journal-entry/manual-journal-entry-types"

export type GlAccountRow = {
  id: string
  code: string
  isActive: boolean
  deleted: boolean
}

type LineRow = {
  id: string
  manualJournalEntryId: string
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
}

let seq = 0
export function resetManualJournalMockSeq() {
  seq = 0
}

function nextId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}`
}

export function createManualJournalMockTx(initialAccounts: GlAccountRow[]) {
  const accounts = [...initialAccounts]
  const entries: ManualJournalEntryWithLines[] = []
  const lines: LineRow[] = []
  const vouchers: unknown[] = []
  const journals: unknown[] = []

  function entryLines(entryId: string) {
    return lines
      .filter((line) => line.manualJournalEntryId === entryId)
      .sort((a, b) => a.lineNo - b.lineNo)
      .map((line) => ({
        id: line.id,
        manualJournalEntryId: line.manualJournalEntryId,
        lineNo: line.lineNo,
        glAccountId: line.glAccountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      }))
  }

  const tx = {
    glAccount: {
      findMany: jest.fn(async ({ where }: {
        where: {
          OR?: Array<{ id?: { in: string[] }; code?: { in: string[] } }>
          id?: { in: string[] }
        }
      }) => {
        const ids = new Set<string>()
        const codes = new Set<string>()

        if (where.id?.in) {
          for (const id of where.id.in) ids.add(id)
        }
        for (const clause of where.OR ?? []) {
          for (const id of clause.id?.in ?? []) ids.add(id)
          for (const code of clause.code?.in ?? []) codes.add(code)
        }

        return accounts.filter(
          (account) => ids.has(account.id) || codes.has(account.code)
        )
      }),
    },
    manualJournalEntry: {
      count: jest.fn(async ({ where }: {
        where?: {
          legalEntityCode?: string
          entryType?: string
          entryDate?: { gte: Date; lt: Date }
        }
      }) => {
        if (!where?.legalEntityCode || !where.entryType || !where.entryDate) {
          return entries.length
        }
        return entries.filter(
          (entry) =>
            entry.legalEntityCode === where.legalEntityCode &&
            entry.entryType === where.entryType &&
            entry.entryDate >= where.entryDate!.gte &&
            entry.entryDate < where.entryDate!.lt
        ).length
      }),
      create: jest.fn(async ({ data, include }: {
        data: {
          entryNo: string
          entryType: string
          status: string
          branchId: string
          legalEntityCode: string
          entryDate: Date
          description: string | null
          refNo: string | null
          createdByStaffId: string
          lines: { create: Array<{
            lineNo: number
            glAccountId: string
            debit: Prisma.Decimal
            credit: Prisma.Decimal
            memo: string | null
          }> }
        }
        include?: { lines: boolean }
      }) => {
        const id = nextId("entry")
        const createdAt = new Date("2026-06-01")
        const entry: ManualJournalEntryWithLines = {
          id,
          entryNo: data.entryNo,
          entryType: data.entryType as ManualJournalEntryWithLines["entryType"],
          status: data.status as ManualJournalEntryWithLines["status"],
          branchId: data.branchId,
          legalEntityCode: data.legalEntityCode,
          entryDate: data.entryDate,
          description: data.description,
          refNo: data.refNo,
          createdByStaffId: data.createdByStaffId,
          submittedAt: null,
          submittedByStaffId: null,
          confirmedAt: null,
          confirmedByStaffId: null,
          postedAt: null,
          postedByStaffId: null,
          cancelledAt: null,
          cancelledByStaffId: null,
          cancelReason: null,
          postedVoucherId: null,
          postedJournalEntryId: null,
          reversalJournalEntryId: null,
          pdfPath: null,
          pdfBlobUrl: null,
          pdfGeneratedAt: null,
          createdAt,
          updatedAt: createdAt,
          lines: [],
        }

        for (const line of data.lines.create) {
          const lineRow = {
            id: nextId("line"),
            manualJournalEntryId: id,
            lineNo: line.lineNo,
            glAccountId: line.glAccountId,
            debit: line.debit,
            credit: line.credit,
            memo: line.memo,
          }
          lines.push(lineRow)
          if (include?.lines) {
            entry.lines.push({
              id: lineRow.id,
              manualJournalEntryId: id,
              lineNo: line.lineNo,
              glAccountId: line.glAccountId,
              debit: line.debit,
              credit: line.credit,
              memo: line.memo,
            })
          }
        }

        entries.push(entry)
        return entry
      }),
      findUnique: jest.fn(async ({ where, select, include }: {
        where: { id: string }
        select?: Record<string, boolean>
        include?: { lines?: boolean | { orderBy?: { lineNo: "asc" } } }
      }) => {
        const entry = entries.find((row) => row.id === where.id)
        if (!entry) return null

        if (select) {
          const picked: Record<string, unknown> = {}
          for (const key of Object.keys(select)) {
            picked[key] = entry[key as keyof ManualJournalEntryWithLines]
          }
          return picked
        }

        const withLines = include?.lines
          ? {
              ...entry,
              lines: entryLines(entry.id).map((line) => {
                const nestedInclude =
                  typeof include.lines === "object" &&
                  include.lines !== null &&
                  "include" in include.lines
                    ? (include.lines as { include?: { glAccount?: boolean } }).include
                    : undefined
                if (nestedInclude?.glAccount) {
                  const account = accounts.find((row) => row.id === line.glAccountId)
                  return {
                    ...line,
                    glAccount: {
                      code: account?.code ?? line.glAccountId,
                      name: account?.code ?? line.glAccountId,
                    },
                  }
                }
                return line
              }),
            }
          : { ...entry }

        return withLines
      }),
      update: jest.fn(async ({ where, data, include }: {
        where: { id: string; pdfPath?: null }
        data: Partial<ManualJournalEntryWithLines>
        include?: { lines?: boolean }
      }) => {
        const index = entries.findIndex((row) => {
          if (row.id !== where.id) return false
          if (where.pdfPath === null && row.pdfPath != null) return false
          return true
        })
        if (index < 0) throw new Error("entry missing")
        entries[index] = {
          ...entries[index],
          ...data,
          updatedAt: new Date("2026-06-02"),
        }
        const updated = entries[index]
        return include?.lines
          ? { ...updated, lines: entryLines(updated.id) }
          : updated
      }),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        const index = entries.findIndex((row) => row.id === where.id)
        if (index < 0) throw new Error("entry missing")
        entries.splice(index, 1)
        return entries[index]
      }),
    },
    manualJournalEntryLine: {
      deleteMany: jest.fn(async ({ where }: { where: { manualJournalEntryId: string } }) => {
        const removed = lines.filter(
          (line) => line.manualJournalEntryId === where.manualJournalEntryId
        )
        for (const line of removed) {
          const index = lines.indexOf(line)
          if (index >= 0) lines.splice(index, 1)
        }
        return { count: removed.length }
      }),
      createMany: jest.fn(),
    },
    voucher: {
      create: jest.fn(async (args: unknown) => {
        vouchers.push(args)
        return { id: "voucher-1" }
      }),
    },
    journalEntry: {
      create: jest.fn(async (args: unknown) => {
        journals.push(args)
        return { id: "journal-1" }
      }),
    },
  }

  return {
    tx,
    entries,
    lines,
    vouchers,
    journals,
    seedEntry: (entry: ManualJournalEntryWithLines, entryLines: LineRow[] = []) => {
      entries.push({ ...entry, lines: entryLines.map((line) => ({
        id: line.id,
        manualJournalEntryId: line.manualJournalEntryId,
        lineNo: line.lineNo,
        glAccountId: line.glAccountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      })) })
      for (const line of entryLines) {
        lines.push(line)
      }
    },
  }
}

export function balancedDraftLines(): LineRow[] {
  return [
    {
      id: "line-1",
      manualJournalEntryId: "entry-seed",
      lineNo: 1,
      glAccountId: "acc-1100",
      debit: new Prisma.Decimal(100),
      credit: new Prisma.Decimal(0),
      memo: null,
    },
    {
      id: "line-2",
      manualJournalEntryId: "entry-seed",
      lineNo: 2,
      glAccountId: "acc-5000",
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(100),
      memo: null,
    },
  ]
}

export function draftEntry(
  partial: Partial<ManualJournalEntryWithLines> &
    Pick<ManualJournalEntryWithLines, "id" | "status">
): ManualJournalEntryWithLines {
  const now = new Date("2026-06-01")
  return {
    id: partial.id,
    entryNo: partial.entryNo ?? "MJV-260001",
    entryType: partial.entryType ?? "MANUAL",
    status: partial.status,
    branchId: partial.branchId ?? "branch-1",
    legalEntityCode: partial.legalEntityCode ?? "ASAS",
    entryDate: partial.entryDate ?? new Date("2026-06-14"),
    description: partial.description ?? null,
    refNo: partial.refNo ?? null,
    createdByStaffId: partial.createdByStaffId ?? "staff-create",
    submittedAt: partial.submittedAt ?? null,
    submittedByStaffId: partial.submittedByStaffId ?? null,
    confirmedAt: partial.confirmedAt ?? null,
    confirmedByStaffId: partial.confirmedByStaffId ?? null,
    postedAt: partial.postedAt ?? null,
    postedByStaffId: partial.postedByStaffId ?? null,
    cancelledAt: partial.cancelledAt ?? null,
    cancelledByStaffId: partial.cancelledByStaffId ?? null,
    cancelReason: partial.cancelReason ?? null,
    postedVoucherId: partial.postedVoucherId ?? null,
    postedJournalEntryId: partial.postedJournalEntryId ?? null,
    reversalJournalEntryId: partial.reversalJournalEntryId ?? null,
    pdfPath: partial.pdfPath ?? null,
    pdfBlobUrl: partial.pdfBlobUrl ?? null,
    pdfGeneratedAt: partial.pdfGeneratedAt ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    lines: partial.lines ?? [],
  }
}
