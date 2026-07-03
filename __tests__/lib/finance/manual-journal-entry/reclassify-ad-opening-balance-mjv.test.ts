import { Prisma } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  AD_OPENING_BALANCE_RECLASSIFY_TARGET,
  planReclassifyAdOpeningBalanceMjv,
  ReclassifyAdOpeningBalanceError,
} from "@/lib/finance/manual-journal-entry/reclassify-ad-opening-balance-mjv"

const d = (n: string) => new Prisma.Decimal(n)

function postedTarget(overrides?: {
  entryType?: string
  voucherRefType?: string
  entryDate?: Date
  periodKey?: string
  debit?: string
  credit?: string
  status?: string
  id?: string
}) {
  const entryDate =
    overrides?.entryDate ?? AD_OPENING_BALANCE_RECLASSIFY_TARGET.targetEntryDate
  const periodKey =
    overrides?.periodKey ?? AD_OPENING_BALANCE_RECLASSIFY_TARGET.targetPeriodKey
  const debit = overrides?.debit ?? "2000000"
  const credit = overrides?.credit ?? "2000000"

  return {
    id: overrides?.id ?? "entry-ad-mjv-260001",
    entryNo: "MJV-260001",
    entryType: overrides?.entryType ?? "MANUAL",
    legalEntityCode: "AD",
    status: overrides?.status ?? "POSTED",
    entryDate,
    description: "Opening Balance 2026",
    postedJournalEntryId: "journal-ad-1",
    postedVoucherId: "voucher-ad-1",
    lines: [{ debit: d(debit), credit: d("0") }, { debit: d("0"), credit: d(credit) }],
    postedJournalEntry: {
      id: "journal-ad-1",
      date: entryDate,
      periodId: "period-ad-2025-12",
      legalEntityCode: "AD",
      period: {
        id: "period-ad-2025-12",
        periodKey,
        legalEntityCode: "AD",
      },
      _count: { lines: 2 },
    },
    postedVoucher: {
      id: "voucher-ad-1",
      date: entryDate,
      periodId: "period-ad-2025-12",
      legalEntityCode: "AD",
      voucherNo: "V-2026-01-00001",
      refType: overrides?.voucherRefType ?? FINANCE_REF_TYPES.MANUAL_JOURNAL,
      refId: overrides?.id ?? "entry-ad-mjv-260001",
      refNo: "MJV-260001",
      period: { periodKey },
    },
  }
}

function createMockTx(matches: unknown[]) {
  return {
    manualJournalEntry: {
      findMany: jest.fn().mockResolvedValue(matches),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    voucher: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  }
}

describe("planReclassifyAdOpeningBalanceMjv", () => {
  it("plans MANUAL -> OPENING_BALANCE reclassify for AD MJV-260001", async () => {
    const tx = createMockTx([postedTarget()])

    const plan = await planReclassifyAdOpeningBalanceMjv(tx as never)

    expect(plan.unchanged).toBe(false)
    expect(plan.before.entryType).toBe("MANUAL")
    expect(plan.after.entryType).toBe("OPENING_BALANCE")
    expect(plan.before.voucher.refType).toBe(FINANCE_REF_TYPES.MANUAL_JOURNAL)
    expect(plan.after.voucher.refType).toBe(FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL)
    expect(plan.before.documentNo).toBe("MJV-260001")
    expect(plan.after.documentNo).toBe("MJV-260001")
    expect(plan.before.journalEntry.totalDebit).toBe(
      plan.before.journalEntry.totalCredit
    )
    expect(plan.accountingPeriodId).toBe("period-ad-2025-12")
  })

  it("is idempotent when already reclassified", async () => {
    const tx = createMockTx([
      postedTarget({
        entryType: "OPENING_BALANCE",
        voucherRefType: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
      }),
    ])

    const plan = await planReclassifyAdOpeningBalanceMjv(tx as never)

    expect(plan.unchanged).toBe(true)
    expect(plan.before.entryType).toBe("OPENING_BALANCE")
    expect(plan.after.entryType).toBe("OPENING_BALANCE")
  })

  it("aborts when multiple AD rows match MJV-260001", async () => {
    const tx = createMockTx([postedTarget(), { ...postedTarget(), id: "dup" }])

    await expect(planReclassifyAdOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "AMBIGUOUS_TARGET",
    })
  })

  it("aborts when journal lines do not balance", async () => {
    const tx = createMockTx([postedTarget({ debit: "1000", credit: "999" })])

    await expect(planReclassifyAdOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "UNBALANCED_JOURNAL",
    })
  })

  it("aborts when posted journal is not in 2025-12", async () => {
    const tx = createMockTx([postedTarget({ periodKey: "2026-01" })])

    await expect(planReclassifyAdOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "WRONG_PERIOD",
    })
  })

  it("aborts when another posted OPENING_BALANCE exists in 2025-12", async () => {
    const tx = createMockTx([postedTarget()])
    tx.manualJournalEntry.findFirst.mockResolvedValue({
      id: "other-opb",
      entryNo: "OPB-260099",
    })

    await expect(planReclassifyAdOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "DUPLICATE_OPENING_BALANCE",
    })
  })

  it("aborts when entry is not POSTED", async () => {
    const tx = createMockTx([postedTarget({ status: "DRAFT" })])

    await expect(planReclassifyAdOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "NOT_POSTED",
    })
  })
})

describe("ReclassifyAdOpeningBalanceError", () => {
  it("exposes stable error codes", () => {
    const err = new ReclassifyAdOpeningBalanceError("test", "NOT_FOUND")
    expect(err.code).toBe("NOT_FOUND")
    expect(err).toBeInstanceOf(Error)
  })
})
