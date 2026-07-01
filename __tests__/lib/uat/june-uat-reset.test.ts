import {
  DEFAULT_UAT_RESET_BEFORE,
  DEFAULT_UAT_RESET_FROM,
  executeUatReset,
  isInstantInUatResetRange,
  isWorkDateInUatResetRange,
  JUNE_UAT_RESET_CONFIRM_TOKEN,
  parseUatResetArgs,
  parseUatResetDateRange,
  PROTECTED_MASTER_DELETE_KEYS,
  validateUatResetExecute,
} from "@/lib/uat/june-uat-reset"

describe("june-uat-reset", () => {
  const range = parseUatResetDateRange(DEFAULT_UAT_RESET_FROM, DEFAULT_UAT_RESET_BEFORE)

  it("defaults to dry run without execute flag", () => {
    const cli = parseUatResetArgs([])
    expect(cli.execute).toBe(false)
    expect(cli.fromDateKey).toBe(DEFAULT_UAT_RESET_FROM)
    expect(cli.beforeDateKey).toBe(DEFAULT_UAT_RESET_BEFORE)
  })

  it("parses execute, confirm, and date bounds from argv", () => {
    const cli = parseUatResetArgs([
      "--execute",
      "--confirm=JUNE_UAT_RESET_CONFIRMED",
      "--from=2026-06-01",
      "--before=2026-07-01",
    ])
    expect(cli.execute).toBe(true)
    expect(cli.confirm).toBe(JUNE_UAT_RESET_CONFIRM_TOKEN)
    expect(cli.fromDateKey).toBe("2026-06-01")
    expect(cli.beforeDateKey).toBe("2026-07-01")
  })

  it("uses half-open Bangkok date bounds [from, before)", () => {
    expect(range.fromDateKey).toBe("2026-06-01")
    expect(range.beforeDateKey).toBe("2026-07-01")
    expect(range.periodKey).toBe("2026-06")
    expect(range.periodCounter).toBe("202606")

    expect(isInstantInUatResetRange(new Date("2026-05-31T23:59:59.999+07:00"), range)).toBe(
      false
    )
    expect(isInstantInUatResetRange(new Date("2026-06-01T00:00:00+07:00"), range)).toBe(true)
    expect(isInstantInUatResetRange(new Date("2026-06-30T23:59:59.999+07:00"), range)).toBe(
      true
    )
    expect(isInstantInUatResetRange(new Date("2026-07-01T00:00:00+07:00"), range)).toBe(false)

    expect(isWorkDateInUatResetRange("2026-05-31", range)).toBe(false)
    expect(isWorkDateInUatResetRange("2026-06-01", range)).toBe(true)
    expect(isWorkDateInUatResetRange("2026-06-30", range)).toBe(true)
    expect(isWorkDateInUatResetRange("2026-07-01", range)).toBe(false)
  })

  it("rejects invalid or inverted date bounds", () => {
    expect(() => parseUatResetDateRange("2026-07-01", "2026-06-01")).toThrow(
      /must be strictly before/
    )
    expect(() => parseUatResetDateRange("bad-date", "2026-07-01")).toThrow(/Invalid date key/)
  })

  it("requires confirm token for remote execute", () => {
    expect(() =>
      validateUatResetExecute(
        { execute: true, confirm: "WRONG", fromDateKey: DEFAULT_UAT_RESET_FROM, beforeDateKey: DEFAULT_UAT_RESET_BEFORE },
        "postgresql://user:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
      )
    ).toThrow(JUNE_UAT_RESET_CONFIRM_TOKEN)

    expect(() =>
      validateUatResetExecute(
        {
          execute: true,
          confirm: JUNE_UAT_RESET_CONFIRM_TOKEN,
          fromDateKey: DEFAULT_UAT_RESET_FROM,
          beforeDateKey: DEFAULT_UAT_RESET_BEFORE,
        },
        "postgresql://user:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
      )
    ).not.toThrow()
  })

  it("allows localhost execute without confirm token", () => {
    expect(() =>
      validateUatResetExecute(
        { execute: true, confirm: "", fromDateKey: DEFAULT_UAT_RESET_FROM, beforeDateKey: DEFAULT_UAT_RESET_BEFORE },
        "postgresql://user:secret@127.0.0.1:5432/postgres"
      )
    ).not.toThrow()
  })

  it("does not delete protected master-data delegates", async () => {
    const protectedDeletes = Object.fromEntries(
      PROTECTED_MASTER_DELETE_KEYS.map((key) => [key, jest.fn()])
    ) as Record<(typeof PROTECTED_MASTER_DELETE_KEYS)[number], jest.Mock>

    const tx = {
      ...protectedDeletes,
      posPayInEvidence: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      journalEntry: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      voucher: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      documentArchiveLink: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      receipt: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      documentArchive: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      collectorReport: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      refund: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      stockTransaction: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      stockDocument: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      sale: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      reconciliationSnapshot: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      workTimeEntry: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      documentCounter: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    }

    await executeUatReset(
      tx as never,
      {
        saleIds: [],
        refundIds: [],
        collectorReportIds: [],
        stockDocumentIds: [],
        voucherIds: [],
        archiveIds: [],
      },
      range
    )

    for (const key of PROTECTED_MASTER_DELETE_KEYS) {
      expect(protectedDeletes[key]).not.toHaveBeenCalled()
    }
    expect(tx.reconciliationSnapshot.deleteMany).toHaveBeenCalled()
    expect(tx.workTimeEntry.deleteMany).toHaveBeenCalled()
    expect(tx.documentCounter.deleteMany).toHaveBeenCalledWith({
      where: { period: "202606" },
    })
  })
})
