import {
  Prisma,
} from "@/generated/prisma/client"
import {
  ASAD_OPENING_BALANCE_REPAIR_TARGET,
  planRepairAsadOpeningBalanceMjv,
  RepairAsadOpeningBalanceError,
} from "@/lib/finance/manual-journal-entry/repair-asad-opening-balance-mjv"

const d = (n: string) => new Prisma.Decimal(n)

function postedTarget(overrides?: {
  entryDate?: Date
  periodKey?: string
  debit?: string
  credit?: string
  legalEntityCode?: string
  status?: string
}) {
  const entryDate = overrides?.entryDate ?? new Date("2026-01-01T00:00:00.000Z")
  const periodKey = overrides?.periodKey ?? "2026-01"
  const legalEntityCode = overrides?.legalEntityCode ?? "AD"
  const debit = overrides?.debit ?? "2000000"
  const credit = overrides?.credit ?? "2000000"

  return {
    id: "entry-ad-mjv-260001",
    entryNo: "MJV-260001",
    legalEntityCode,
    status: overrides?.status ?? "POSTED",
    entryDate,
    description: "Opening Balance 2026",
    postedJournalEntryId: "journal-ad-1",
    postedVoucherId: "voucher-ad-1",
    pdfPath: "manual-journal/entry-ad-mjv-260001.pdf",
    pdfBlobUrl: null,
    branchId: "branch-ho999-internal",
    lines: [{ debit: d(debit), credit: d("0") }, { debit: d("0"), credit: d(credit) }],
    postedJournalEntry: {
      id: "journal-ad-1",
      date: entryDate,
      periodId: "period-ad-2026-01",
      legalEntityCode,
      period: {
        id: "period-ad-2026-01",
        periodKey,
        legalEntityCode,
      },
    },
    postedVoucher: {
      id: "voucher-ad-1",
      date: entryDate,
      periodId: "period-ad-2026-01",
      legalEntityCode,
      voucherNo: "MJV-260001",
    },
  }
}

function createMockTx(matches: unknown[]) {
  return {
    manualJournalEntry: {
      findMany: jest.fn().mockResolvedValue(matches),
    },
    accountingPeriod: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  }
}

describe("planRepairAsadOpeningBalanceMjv", () => {
  it("aborts when multiple AD rows match MJV-260001", async () => {
    const tx = createMockTx([postedTarget(), { ...postedTarget(), id: "dup" }])

    await expect(planRepairAsadOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "AMBIGUOUS_TARGET",
    })
  })

  it("aborts when posted journal entry is not AD", async () => {
    const row = postedTarget()
    row.postedJournalEntry!.legalEntityCode = "AS"
    const tx = createMockTx([row])

    await expect(planRepairAsadOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "WRONG_JOURNAL_ENTITY",
    })
  })

  it("aborts when journal lines do not balance", async () => {
    const tx = createMockTx([postedTarget({ debit: "1000", credit: "999" })])

    await expect(planRepairAsadOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "UNBALANCED_JOURNAL",
    })
  })

  it("plans bootstrap of AD 2025-12 when missing", async () => {
    const tx = createMockTx([postedTarget()])

    const audit = await planRepairAsadOpeningBalanceMjv(tx as never)

    expect(audit.oldPeriodKey).toBe("2026-01")
    expect(audit.newPeriodKey).toBe("2025-12")
    expect(audit.oldEntryDate).toContain("2026-01-01")
    expect(audit.newEntryDate).toContain("2025-12-31")
    expect(audit.periodBootstrapped).toBe(true)
    expect(audit.pdfCleared).toBe(true)
    expect(audit.postedJournalEntryId).toBe("journal-ad-1")
  })

  it("does not bootstrap when AD 2025-12 already exists", async () => {
    const tx = createMockTx([postedTarget()])
    tx.accountingPeriod.findUnique.mockResolvedValue({
      id: "period-ad-2025-12",
      periodKey: "2025-12",
    })

    const audit = await planRepairAsadOpeningBalanceMjv(tx as never)

    expect(audit.periodBootstrapped).toBe(false)
    expect(audit.newPeriodId).toBe("period-ad-2025-12")
  })

  it("uses explicit AD period lookup without AS fallback", async () => {
    const tx = createMockTx([postedTarget()])

    await planRepairAsadOpeningBalanceMjv(tx as never)

    expect(tx.accountingPeriod.findUnique).toHaveBeenCalledWith({
      where: {
        legalEntityCode_periodKey: {
          legalEntityCode: ASAD_OPENING_BALANCE_REPAIR_TARGET.legalEntityCode,
          periodKey: ASAD_OPENING_BALANCE_REPAIR_TARGET.targetPeriodKey,
        },
      },
      select: { id: true, periodKey: true },
    })
  })
})

describe("RepairAsadOpeningBalanceError", () => {
  it("exposes stable error codes", () => {
    const err = new RepairAsadOpeningBalanceError("test", "NOT_FOUND")
    expect(err.code).toBe("NOT_FOUND")
    expect(err).toBeInstanceOf(Error)
  })
})
