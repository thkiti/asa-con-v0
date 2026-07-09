import { Prisma } from "@/generated/prisma/client"
import type { ManualJournalEntryWithLines } from "@/lib/finance/manual-journal-entry/manual-journal-entry-types"
import {
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import {
  createManualJournalEntryDraft,
  updateManualJournalEntryDraft,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-save"

type GlAccountRow = {
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
function nextId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}`
}

function createSaveMockTx(initialAccounts: GlAccountRow[]) {
  const accounts = [...initialAccounts]
  const entries: ManualJournalEntryWithLines[] = []
  const lines: LineRow[] = []
  const vouchers: unknown[] = []
  const journals: unknown[] = []

  const tx = {
    glAccount: {
      findMany: jest.fn(async ({ where }: {
        where: { OR?: Array<{ id?: { in: string[] }; code?: { in: string[] } }> }
      }) => {
        const ids = new Set(
          where.OR?.flatMap((clause) => clause.id?.in ?? []) ?? []
        )
        const codes = new Set(
          where.OR?.flatMap((clause) => clause.code?.in ?? []) ?? []
        )
        return accounts.filter(
          (account) => ids.has(account.id) || codes.has(account.code)
        )
      }),
    },
    manualJournalEntry: {
      count: jest.fn(async ({ where }: {
        where: {
          legalEntityCode: string
          entryType: string
          entryDate: { gte: Date; lt: Date }
        }
      }) => {
        return entries.filter(
          (entry) =>
            entry.legalEntityCode === where.legalEntityCode &&
            entry.entryType === where.entryType &&
            entry.entryDate >= where.entryDate.gte &&
            entry.entryDate < where.entryDate.lt
        ).length
      }),
      findMany: jest.fn(async ({ where, select }: {
        where: {
          legalEntityCode: string
          entryType: string
          entryNo?: { startsWith: string }
        }
        select: { entryNo: true }
      }) => {
        return entries
          .filter(
            (entry) =>
              entry.legalEntityCode === where.legalEntityCode &&
              entry.entryType === where.entryType &&
              (!where.entryNo?.startsWith ||
                entry.entryNo.startsWith(where.entryNo.startsWith))
          )
          .map((entry) => ({ entryNo: entry.entryNo }))
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
        const duplicate = entries.some(
          (entry) =>
            entry.legalEntityCode === data.legalEntityCode &&
            entry.entryNo === data.entryNo
        )
        if (duplicate) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          })
        }

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
        include?: { lines?: { orderBy?: { lineNo: "asc" } } }
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

        if (include?.lines) {
          const entryLines = lines
            .filter((line) => line.manualJournalEntryId === entry.id)
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
          return { ...entry, lines: entryLines }
        }

        return { ...entry }
      }),
      findFirst: jest.fn(async ({ where, select, include }: {
        where: { id?: string; legalEntityCode?: string }
        select?: Record<string, boolean>
        include?: { lines?: { orderBy?: { lineNo: "asc" } } }
      }) => {
        const entry = entries.find((row) => {
          if (where.id && row.id !== where.id) return false
          if (where.legalEntityCode && row.legalEntityCode !== where.legalEntityCode) {
            return false
          }
          return true
        })
        if (!entry) return null

        if (select) {
          const picked: Record<string, unknown> = {}
          for (const key of Object.keys(select)) {
            picked[key] = entry[key as keyof ManualJournalEntryWithLines]
          }
          return picked
        }

        if (include?.lines) {
          const entryLines = lines
            .filter((line) => line.manualJournalEntryId === entry.id)
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
          return { ...entry, lines: entryLines }
        }

        return { ...entry }
      }),
      update: jest.fn(async ({ where, data }: {
        where: { id: string }
        data: Partial<ManualJournalEntryWithLines>
      }) => {
        const index = entries.findIndex((row) => row.id === where.id)
        if (index < 0) throw new Error("entry missing")
        entries[index] = {
          ...entries[index],
          ...data,
          updatedAt: new Date("2026-06-02"),
        }
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
      createMany: jest.fn(async ({ data }: {
        data: Array<{
          manualJournalEntryId: string
          lineNo: number
          glAccountId: string
          debit: Prisma.Decimal
          credit: Prisma.Decimal
          memo: string | null
        }>
      }) => {
        for (const row of data) {
          lines.push({
            id: nextId("line"),
            ...row,
          })
        }
        return { count: data.length }
      }),
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
  }
}

const defaultAccounts: GlAccountRow[] = [
  { id: "acc-1100", code: "1100", isActive: true, deleted: false },
  { id: "acc-5000", code: "5000", isActive: true, deleted: false },
  { id: "acc-inactive", code: "1200", isActive: false, deleted: false },
]

describe("manual-journal-entry-save", () => {
  const entryDate = new Date("2026-06-14T12:00:00.000Z")

  beforeEach(() => {
    seq = 0
  })

  it("creates DRAFT with allocated entryNo", async () => {
    const { tx } = createSaveMockTx(defaultAccounts)

    const created = await createManualJournalEntryDraft({
      tx: tx as never,
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate,
      entryType: "MANUAL",
      description: "Test draft",
      createdByStaffId: "staff-1",
      lines: [{ accountCode: "1100", debit: 100, credit: 0 }],
    })

    expect(created.status).toBe("DRAFT")
    expect(created.entryNo).toBe("MJV-260001")
    expect(created.lines).toHaveLength(1)
    expect(created.lines[0].lineNo).toBe(1)
    expect(tx.voucher.create).not.toHaveBeenCalled()
    expect(tx.journalEntry.create).not.toHaveBeenCalled()
  })

  it("allows unbalanced single-line draft", async () => {
    const { tx } = createSaveMockTx(defaultAccounts)

    const created = await createManualJournalEntryDraft({
      tx: tx as never,
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate,
      entryType: "MANUAL",
      createdByStaffId: "staff-1",
      lines: [{ accountCode: "5000", debit: 250, credit: 0 }],
    })

    expect(created.lines).toHaveLength(1)
    expect(created.lines[0].debit).toEqual(new Prisma.Decimal(250))
  })

  it("allows unbalanced multi-line draft", async () => {
    const { tx } = createSaveMockTx(defaultAccounts)

    const created = await createManualJournalEntryDraft({
      tx: tx as never,
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate,
      entryType: "MANUAL",
      createdByStaffId: "staff-1",
      lines: [
        { accountCode: "1100", debit: 100, credit: 0 },
        { accountCode: "5000", debit: 50, credit: 0 },
      ],
    })

    expect(created.lines).toHaveLength(2)
    expect(created.lines[0].debit).toEqual(new Prisma.Decimal(100))
    expect(created.lines[1].debit).toEqual(new Prisma.Decimal(50))
  })

  it("update draft replaces lines with normalized lineNo", async () => {
    const { tx } = createSaveMockTx(defaultAccounts)

    const created = await createManualJournalEntryDraft({
      tx: tx as never,
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate,
      entryType: "MANUAL",
      createdByStaffId: "staff-1",
      lines: [{ accountCode: "1100", debit: 100, credit: 0 }],
    })

    const updated = await updateManualJournalEntryDraft({
      tx: tx as never,
      entryId: created.id,
      legalEntityCode: "AS",
      description: "Revised",
      lines: [
        { accountCode: "5000", debit: 0, credit: 40 },
        { accountCode: "1100", debit: 40, credit: 0 },
      ],
    })

    expect(updated.description).toBe("Revised")
    expect(updated.lines).toHaveLength(2)
    expect(updated.lines[0].lineNo).toBe(1)
    expect(updated.lines[1].lineNo).toBe(2)
    expect(updated.lines[0].glAccountId).toBe("acc-5000")
    expect(tx.manualJournalEntryLine.deleteMany).toHaveBeenCalled()
  })

  it.each([
    ["SUBMITTED", ManualJournalEntryErrorCodes.NOT_DRAFT],
    ["CONFIRMED", ManualJournalEntryErrorCodes.NOT_DRAFT],
    ["POSTED", ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY],
    ["CANCELLED", ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY],
  ] as const)("rejects update when status is %s", async (status, code) => {
    const { tx, entries } = createSaveMockTx(defaultAccounts)
    entries.push({
      id: "locked-entry",
      entryNo: "MJV-260099",
      entryType: "MANUAL",
      status,
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate,
      description: null,
      refNo: null,
      createdByStaffId: "staff-1",
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
      createdAt: new Date(),
      updatedAt: new Date(),
      lines: [],
    })

    await expect(
      updateManualJournalEntryDraft({
        tx: tx as never,
        entryId: "locked-entry",
        legalEntityCode: "AS",
        lines: [{ accountCode: "1100", debit: 10, credit: 0 }],
      })
    ).rejects.toMatchObject({ code })
  })

  it("allows ASAS to use MJV-260001 when ASAD already has MJV-260001", async () => {
    const { tx, entries } = createSaveMockTx(defaultAccounts)
    entries.push({
      id: "asad-entry",
      entryNo: "MJV-260001",
      entryType: "MANUAL",
      status: "POSTED",
      branchId: "branch-ad",
      legalEntityCode: "AD",
      entryDate,
      description: "ASAD opening",
      refNo: null,
      createdByStaffId: "staff-ad",
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
      createdAt: new Date(),
      updatedAt: new Date(),
      lines: [],
    })

    const created = await createManualJournalEntryDraft({
      tx: tx as never,
      branchId: "branch-as",
      legalEntityCode: "AS",
      entryDate: new Date("2026-01-01T12:00:00.000Z"),
      entryType: "MANUAL",
      createdByStaffId: "staff-as",
      lines: [{ accountCode: "1100", debit: 100, credit: 0 }],
    })

    expect(created.entryNo).toBe("MJV-260001")
    expect(created.legalEntityCode).toBe("AS")
    expect(entries.find((entry) => entry.id === "asad-entry")?.entryNo).toBe("MJV-260001")
  })

  it("advances ASAS sequence when the same legal entity already has the candidate number", async () => {
    const { tx, entries } = createSaveMockTx(defaultAccounts)
    entries.push({
      id: "as-entry-1",
      entryNo: "MJV-260001",
      entryType: "MANUAL",
      status: "POSTED",
      branchId: "branch-as",
      legalEntityCode: "AS",
      entryDate: new Date("2026-01-01T12:00:00.000Z"),
      description: null,
      refNo: null,
      createdByStaffId: "staff-as",
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
      createdAt: new Date(),
      updatedAt: new Date(),
      lines: [],
    })

    const created = await createManualJournalEntryDraft({
      tx: tx as never,
      branchId: "branch-as",
      legalEntityCode: "AS",
      entryDate: new Date("2026-01-01T12:00:00.000Z"),
      entryType: "MANUAL",
      createdByStaffId: "staff-as",
      lines: [{ accountCode: "1100", debit: 50, credit: 0 }],
    })

    expect(created.entryNo).toBe("MJV-260002")
  })

  it("returns a friendly allocation error after repeated entryNo collisions", async () => {
    const { tx } = createSaveMockTx(defaultAccounts)
    tx.manualJournalEntry.create.mockImplementation(async () => {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    })

    await expect(
      createManualJournalEntryDraft({
        tx: tx as never,
        branchId: "branch-as",
        legalEntityCode: "AS",
        entryDate,
        entryType: "MANUAL",
        createdByStaffId: "staff-as",
        lines: [{ accountCode: "1100", debit: 10, credit: 0 }],
      })
    ).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED,
      message:
        "Could not allocate a new manual journal number for ASAS. Please retry. If the problem continues, contact admin.",
    })
  })
})
