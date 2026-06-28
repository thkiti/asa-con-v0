import { AccountingPeriodStatus, Prisma } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  postJournalReversal,
  postManualJournalVoucher,
} from "@/lib/finance/posting"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { getJournalInquiryById } from "@/lib/finance/journal-inquiry"
import { listJournalEntries } from "@/lib/finance/journal-list"
import { createFinanceMockTx } from "./mock-finance-tx"

async function seedOpenPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  branchId: string,
  date: Date
) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  await tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey: `${y}-${m}`,
      status: AccountingPeriodStatus.OPEN,
    },
  })
}

async function seedClosedPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  branchId: string,
  date: Date
) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  await tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey: `${y}-${m}`,
      status: AccountingPeriodStatus.SOFT_CLOSED,
    },
  })
}

describe("manual journal posting", () => {
  const branchId = "branch-1"
  const postingDate = new Date("2026-05-15T12:00:00.000Z")

  it("posts balanced manual journal with voucher, journal, and lines", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, postingDate)

    const result = await postManualJournalVoucher({
      tx,
      branchId,
      date: postingDate,
      description: "Office supplies",
      idempotencyKey: "manual-1",
      lines: [
        { accountCode: "5000", debit: "100", credit: "0", memo: "Supplies" },
        { accountCode: "1100", debit: "0", credit: "100" },
      ],
    })

    expect(result.alreadyPosted).toBe(false)
    expect(state.vouchers).toHaveLength(1)
    expect(state.journalEntries).toHaveLength(1)
    expect(state.journalEntryLines).toHaveLength(2)
    expect(state.vouchers[0]?.refType).toBe(FINANCE_REF_TYPES.MANUAL_JOURNAL)
    expect(state.journalEntries[0]?.voucherId).toBe(result.voucherId)
    expect(result.journalEntryId).toBe(state.journalEntries[0]?.id)
  })

  it("rejects unbalanced journal", async () => {
    const { tx } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, postingDate)

    await expect(
      postManualJournalVoucher({
        tx,
        branchId,
        date: postingDate,
        idempotencyKey: "manual-unbalanced",
        lines: [
          { accountCode: "5000", debit: "100", credit: "0" },
          { accountCode: "1100", debit: "0", credit: "90" },
        ],
      })
    ).rejects.toMatchObject({
      code: "UNBALANCED_JOURNAL",
    } satisfies Partial<FinancePostingError>)
  })

  it("rejects unknown account", async () => {
    const { tx } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, postingDate)

    await expect(
      postManualJournalVoucher({
        tx,
        branchId,
        date: postingDate,
        idempotencyKey: "manual-unknown",
        lines: [
          { accountCode: "9999", debit: "50", credit: "0" },
          { accountCode: "1100", debit: "0", credit: "50" },
        ],
      })
    ).rejects.toMatchObject({ code: "ACCOUNT_NOT_FOUND" })
  })

  it("rejects inactive account", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, postingDate)
    const cash = state.glAccounts.find((a) => a.code === DEFAULT_ACCOUNT_CODES.CASH)!
    cash.isActive = false

    await expect(
      postManualJournalVoucher({
        tx,
        branchId,
        date: postingDate,
        idempotencyKey: "manual-inactive",
        lines: [
          { accountCode: "5000", debit: "50", credit: "0" },
          { accountCode: "1100", debit: "0", credit: "50" },
        ],
      })
    ).rejects.toMatchObject({ code: "ACCOUNT_INACTIVE" })
  })

  it("rejects posting to closed period", async () => {
    const { tx } = createFinanceMockTx()
    await seedClosedPeriod(tx, branchId, postingDate)

    await expect(
      postManualJournalVoucher({
        tx,
        branchId,
        date: postingDate,
        idempotencyKey: "manual-closed",
        lines: [
          { accountCode: "5000", debit: "25", credit: "0" },
          { accountCode: "1100", debit: "0", credit: "25" },
        ],
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })
  })
})

describe("journal reversal", () => {
  const branchId = "branch-1"
  const postingDate = new Date("2026-05-15T12:00:00.000Z")
  const reversalDate = new Date("2026-05-16T12:00:00.000Z")

  async function postSampleManualJournal(tx: ReturnType<typeof createFinanceMockTx>["tx"]) {
    return postManualJournalVoucher({
      tx,
      branchId,
      date: postingDate,
      description: "Accrual entry",
      idempotencyKey: crypto.randomUUID(),
      lines: [
        { accountCode: "5000", debit: "200", credit: "0" },
        { accountCode: "1100", debit: "0", credit: "200" },
      ],
    })
  }

  it("creates reversal voucher and journal with swapped debit/credit", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, postingDate)
    await seedOpenPeriod(tx, branchId, reversalDate)

    const original = await postSampleManualJournal(tx)
    const originalEntry = state.journalEntries.find((j) => j.id === original.journalEntryId)!
    const originalLines = state.journalEntryLines
      .filter((l) => l.journalEntryId === original.journalEntryId)
      .sort((a, b) => a.lineNo - b.lineNo)

    const reversal = await postJournalReversal({
      tx,
      journalEntryId: original.journalEntryId,
      reversalDate,
      reason: "Posted in error",
    })

    expect(state.vouchers).toHaveLength(2)
    expect(state.journalEntries).toHaveLength(2)
    const reversalEntry = state.journalEntries.find((j) => j.id === reversal.journalEntryId)!
    expect(reversalEntry.reversalOfJournalEntryId).toBe(original.journalEntryId)
    expect(originalEntry.reversalOfJournalEntryId).toBeNull()

    const reversalLines = state.journalEntryLines
      .filter((l) => l.journalEntryId === reversal.journalEntryId)
      .sort((a, b) => a.lineNo - b.lineNo)

    expect(reversalLines[0]?.debit).toEqual(originalLines[0]?.credit)
    expect(reversalLines[0]?.credit).toEqual(originalLines[0]?.debit)
    expect(reversalLines[1]?.debit).toEqual(originalLines[1]?.credit)
    expect(reversalLines[1]?.credit).toEqual(originalLines[1]?.debit)

    const reversalVoucher = state.vouchers.find((v) => v.id === reversal.voucherId)!
    expect(reversalVoucher.refType).toBe(FINANCE_REF_TYPES.MANUAL_JOURNAL_REVERSAL)
  })

  it("blocks reversing the same journal twice", async () => {
    const { tx } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, postingDate)
    await seedOpenPeriod(tx, branchId, reversalDate)

    const original = await postSampleManualJournal(tx)
    await postJournalReversal({
      tx,
      journalEntryId: original.journalEntryId,
      reversalDate,
      reason: "First reversal",
    })

    await expect(
      postJournalReversal({
        tx,
        journalEntryId: original.journalEntryId,
        reversalDate,
        reason: "Second reversal",
      })
    ).rejects.toMatchObject({ code: "JOURNAL_ALREADY_REVERSED" })
  })

  it("blocks reversing a reversal journal", async () => {
    const { tx } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, postingDate)
    await seedOpenPeriod(tx, branchId, reversalDate)

    const original = await postSampleManualJournal(tx)
    const reversal = await postJournalReversal({
      tx,
      journalEntryId: original.journalEntryId,
      reversalDate,
      reason: "Undo",
    })

    await expect(
      postJournalReversal({
        tx,
        journalEntryId: reversal.journalEntryId,
        reversalDate,
        reason: "Cannot reverse reversal",
      })
    ).rejects.toMatchObject({ code: "REVERSAL_NOT_ALLOWED" })
  })
})

describe("journal list and inquiry", () => {
  const branchId = "branch-1"
  const postingDate = new Date("2026-05-15T12:00:00.000Z")
  const reversalDate = new Date("2026-05-16T12:00:00.000Z")

  it("lists manual journals and exposes lineage in inquiry", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, postingDate)
    await seedOpenPeriod(tx, branchId, reversalDate)

    const original = await postManualJournalVoucher({
      tx,
      branchId,
      date: postingDate,
      idempotencyKey: "list-1",
      lines: [
        { accountCode: "5000", debit: "75", credit: "0" },
        { accountCode: "1100", debit: "0", credit: "75" },
      ],
    })

    const reversal = await postJournalReversal({
      tx,
      journalEntryId: original.journalEntryId,
      reversalDate,
      reason: "Correction",
    })

    const list = await listJournalEntries(
      tx as unknown as Parameters<typeof listJournalEntries>[0],
      { branchId, limit: 20 }
    )
    expect(list.total).toBe(2)
    expect(list.journals.some((j) => j.isReversal)).toBe(true)
    expect(list.journals.some((j) => j.isReversed)).toBe(true)

    const inquiry = await getJournalInquiryById(
      tx as unknown as Parameters<typeof getJournalInquiryById>[0],
      original.journalEntryId,
      "AS"
    )
    expect(inquiry.isReversed).toBe(true)
    expect(inquiry.reversedBy?.id).toBe(reversal.journalEntryId)

    const reversalInquiry = await getJournalInquiryById(
      tx as unknown as Parameters<typeof getJournalInquiryById>[0],
      reversal.journalEntryId,
      "AS"
    )
    expect(reversalInquiry.isReversal).toBe(true)
    expect(reversalInquiry.reverses?.id).toBe(original.journalEntryId)
    expect(state.journalEntries).toHaveLength(2)
  })
})
