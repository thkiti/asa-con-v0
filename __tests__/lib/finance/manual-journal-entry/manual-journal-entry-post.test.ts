import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import {
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import {
  financeRefTypeForManualJournalEntryType,
  postManualJournalEntry,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-post"
import {
  createManualJournalEntryDraft,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-save"
import {
  confirmManualJournalEntry,
  submitManualJournalEntry,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-workflow"
import { createFinanceMockTx } from "../mock-finance-tx"
import {
  createManualJournalMockTx,
  draftEntry,
  resetManualJournalMockSeq,
} from "./mock-manual-journal-tx"

function attachManualJournalToFinanceTx(
  finance: ReturnType<typeof createFinanceMockTx>
) {
  const accounts = finance.state.glAccounts.map((account) => ({
    id: account.id,
    code: account.code,
    isActive: account.isActive,
    deleted: account.deleted,
  }))
  const manual = createManualJournalMockTx(accounts)
  finance.tx.manualJournalEntry = manual.tx.manualJournalEntry
  finance.tx.manualJournalEntryLine = manual.tx.manualJournalEntryLine
  return { manual, finance }
}

async function seedOpenPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  branchId: string,
  legalEntityCode: "AS" | "AD" = "AS"
) {
  await tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey: "2026-06",
      legalEntityCode,
      status: AccountingPeriodStatus.OPEN,
    },
  })
}

async function createConfirmedEntry(
  env: ReturnType<typeof attachManualJournalToFinanceTx>
) {
  const entryDate = new Date("2026-06-14T12:00:00.000Z")
  const draft = await createManualJournalEntryDraft({
    tx: env.finance.tx as never,
    branchId: "branch-1",
    legalEntityCode: "AS",
    entryDate,
    entryType: "MANUAL",
    createdByStaffId: "staff-create",
    lines: [
      { accountCode: "1100", debit: 100, credit: 0 },
      { accountCode: "5000", debit: 0, credit: 100 },
    ],
  })
  const submitted = await submitManualJournalEntry({
    tx: env.finance.tx as never,
    entryId: draft.id,
    legalEntityCode: "AS",
    submittedByStaffId: "staff-submit",
  })
  return confirmManualJournalEntry({
    tx: env.finance.tx as never,
    entryId: submitted.id,
    legalEntityCode: "AS",
    confirmedByStaffId: "staff-confirm",
  })
}

describe("manual-journal-entry-post", () => {
  beforeEach(() => {
    resetManualJournalMockSeq()
  })

  it("posts CONFIRMED entry to POSTED with voucher and journal links", async () => {
    const finance = createFinanceMockTx()
    const env = attachManualJournalToFinanceTx(finance)
    await seedOpenPeriod(env.finance.tx, "branch-1")
    const confirmed = await createConfirmedEntry(env)

    const { entry: posted, pdfSnapshot } = await postManualJournalEntry({
      tx: env.finance.tx as never,
      entryId: confirmed.id,
      legalEntityCode: "AS",
      postedByStaffId: "staff-post",
    })

    expect(posted.status).toBe("POSTED")
    expect(pdfSnapshot).not.toBeNull()
    expect(pdfSnapshot?.entryId).toBe(confirmed.id)
    expect(posted.postedByStaffId).toBe("staff-post")
    expect(posted.postedAt).toBeInstanceOf(Date)
    expect(posted.postedVoucherId).toBeTruthy()
    expect(posted.postedJournalEntryId).toBeTruthy()
    expect(env.finance.state.vouchers).toHaveLength(1)
    expect(env.finance.state.journalEntries).toHaveLength(1)
    expect(env.finance.state.vouchers[0]?.refType).toBe(
      FINANCE_REF_TYPES.MANUAL_JOURNAL
    )
    expect(env.finance.state.vouchers[0]?.refId).toBe(confirmed.id)
  })

  it("is idempotent on retry", async () => {
    const finance = createFinanceMockTx()
    const env = attachManualJournalToFinanceTx(finance)
    await seedOpenPeriod(env.finance.tx, "branch-1")
    const confirmed = await createConfirmedEntry(env)

    const { entry: first } = await postManualJournalEntry({
      tx: env.finance.tx as never,
      entryId: confirmed.id,
      legalEntityCode: "AS",
      postedByStaffId: "staff-post",
    })
    const { entry: second, pdfSnapshot } = await postManualJournalEntry({
      tx: env.finance.tx as never,
      entryId: confirmed.id,
      legalEntityCode: "AS",
      postedByStaffId: "staff-post",
    })

    expect(second.status).toBe("POSTED")
    expect(second.postedVoucherId).toBe(first.postedVoucherId)
    expect(second.postedJournalEntryId).toBe(first.postedJournalEntryId)
    expect(pdfSnapshot).not.toBeNull()
    expect(env.finance.state.vouchers).toHaveLength(1)
    expect(env.finance.state.journalEntries).toHaveLength(1)
  })

  it("rejects post from DRAFT", async () => {
    const finance = createFinanceMockTx()
    const env = attachManualJournalToFinanceTx(finance)
    await seedOpenPeriod(env.finance.tx, "branch-1")
    const entryDate = new Date("2026-06-14T12:00:00.000Z")
    const draft = await createManualJournalEntryDraft({
      tx: env.finance.tx as never,
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate,
      entryType: "MANUAL",
      createdByStaffId: "staff-create",
      lines: [
        { accountCode: "1100", debit: 100, credit: 0 },
        { accountCode: "5000", debit: 0, credit: 100 },
      ],
    })

    await expect(
      postManualJournalEntry({
        tx: env.finance.tx as never,
        entryId: draft.id,
        legalEntityCode: "AS",
        postedByStaffId: "staff-post",
      })
    ).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.INVALID_TRANSITION,
    })
  })

  it("rejects post from SUBMITTED", async () => {
    const finance = createFinanceMockTx()
    const env = attachManualJournalToFinanceTx(finance)
    await seedOpenPeriod(env.finance.tx, "branch-1")
    const entryDate = new Date("2026-06-14T12:00:00.000Z")
    const draft = await createManualJournalEntryDraft({
      tx: env.finance.tx as never,
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate,
      entryType: "MANUAL",
      createdByStaffId: "staff-create",
      lines: [
        { accountCode: "1100", debit: 100, credit: 0 },
        { accountCode: "5000", debit: 0, credit: 100 },
      ],
    })
    const submitted = await submitManualJournalEntry({
      tx: env.finance.tx as never,
      entryId: draft.id,
      legalEntityCode: "AS",
      submittedByStaffId: "staff-submit",
    })

    await expect(
      postManualJournalEntry({
        tx: env.finance.tx as never,
        entryId: submitted.id,
        legalEntityCode: "AS",
        postedByStaffId: "staff-post",
      })
    ).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.INVALID_TRANSITION,
    })
  })

  it("rejects post from CANCELLED", async () => {
    const finance = createFinanceMockTx()
    const env = attachManualJournalToFinanceTx(finance)
    env.manual.seedEntry(draftEntry({ id: "cancelled-entry", status: "CANCELLED" }))

    await expect(
      postManualJournalEntry({
        tx: env.finance.tx as never,
        entryId: "cancelled-entry",
        legalEntityCode: "AS",
        postedByStaffId: "staff-post",
      })
    ).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.INVALID_TRANSITION,
    })
  })

  it("rejects post when accounting period is closed", async () => {
    const finance = createFinanceMockTx()
    const env = attachManualJournalToFinanceTx(finance)
    await env.finance.tx.accountingPeriod.create({
      data: {
        branchId: "branch-1",
        periodKey: "2026-06",
        legalEntityCode: "AS",
        status: AccountingPeriodStatus.SOFT_CLOSED,
      },
    })
    const confirmed = await createConfirmedEntry(env)

    await expect(
      postManualJournalEntry({
        tx: env.finance.tx as never,
        entryId: confirmed.id,
        legalEntityCode: "AS",
        postedByStaffId: "staff-post",
      })
    ).rejects.toBeInstanceOf(FinancePostingError)
  })

  it("maps entry types to finance ref types", () => {
    expect(financeRefTypeForManualJournalEntryType("MANUAL")).toBe(
      FINANCE_REF_TYPES.MANUAL_JOURNAL
    )
    expect(financeRefTypeForManualJournalEntryType("OPENING_BALANCE")).toBe(
      FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL
    )
    expect(financeRefTypeForManualJournalEntryType("ADJUSTMENT")).toBe(
      FINANCE_REF_TYPES.ADJUSTMENT_JOURNAL
    )
    expect(financeRefTypeForManualJournalEntryType("RECLASS")).toBe(
      FINANCE_REF_TYPES.RECLASS_JOURNAL
    )
    expect(financeRefTypeForManualJournalEntryType("ACCRUAL")).toBe(
      FINANCE_REF_TYPES.ACCRUAL_JOURNAL
    )
    expect(financeRefTypeForManualJournalEntryType("AUDITOR_ADJUSTMENT")).toBe(
      FINANCE_REF_TYPES.AUDITOR_ADJUSTMENT_JOURNAL
    )
  })
})
