import {
  ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET,
  planRepairAsasOpeningBalanceMjv,
  RepairAsasOpeningBalanceMjvError,
} from "@/lib/finance/manual-journal-entry/repair-asas-opening-balance-mjv"

function createMockTx(matches: unknown[], conflict: unknown = null) {
  return {
    manualJournalEntry: {
      findMany: jest.fn().mockResolvedValue(matches),
      findFirst: jest.fn().mockResolvedValue(conflict),
    },
    documentArchiveLink: {
      count: jest.fn().mockResolvedValue(0),
    },
  }
}

function confirmedTarget(overrides?: Partial<{ entryNo: string; status: string }>) {
  return {
    id: "entry-as-mjv-250001",
    entryNo: overrides?.entryNo ?? "MJV-250001",
    legalEntityCode: "AS",
    status: overrides?.status ?? "CONFIRMED",
    description: "Opening Balance 2026",
    postedVoucherId: null,
    postedJournalEntryId: null,
    pdfPath: null,
    pdfBlobUrl: null,
    postedVoucher: null,
  }
}

describe("planRepairAsasOpeningBalanceMjv", () => {
  it("aborts when multiple AS rows match source entry", async () => {
    const tx = createMockTx([confirmedTarget(), confirmedTarget({ entryNo: "MJV-250001" })])

    await expect(planRepairAsasOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "AMBIGUOUS_TARGET",
    })
  })

  it("aborts when AS already has MJV-260001", async () => {
    const tx = createMockTx([confirmedTarget()])
    tx.manualJournalEntry.findFirst.mockResolvedValue({
      id: "other",
      entryNo: "MJV-260001",
      status: "DRAFT",
    })

    await expect(planRepairAsasOpeningBalanceMjv(tx as never)).rejects.toMatchObject({
      code: "TARGET_ENTRY_NO_CONFLICT",
    })
  })

  it("plans rename from MJV-250001 to MJV-260001", async () => {
    const tx = createMockTx([confirmedTarget()])

    const audit = await planRepairAsasOpeningBalanceMjv(tx as never)

    expect(audit.oldEntryNo).toBe("MJV-250001")
    expect(audit.newEntryNo).toBe("MJV-260001")
    expect(audit.legalEntityCode).toBe(
      ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET.legalEntityCode
    )
    expect(audit.voucherRefNoUpdated).toBe(false)
  })

  it("is idempotent when already renamed", async () => {
    const tx = createMockTx([confirmedTarget({ entryNo: "MJV-260001" })])

    const audit = await planRepairAsasOpeningBalanceMjv(tx as never)

    expect(audit.oldEntryNo).toBe("MJV-260001")
    expect(audit.newEntryNo).toBe("MJV-260001")
  })

  it("aborts when source row is missing", async () => {
    const tx = createMockTx([])

    await expect(planRepairAsasOpeningBalanceMjv(tx as never)).rejects.toBeInstanceOf(
      RepairAsasOpeningBalanceMjvError
    )
  })
})
