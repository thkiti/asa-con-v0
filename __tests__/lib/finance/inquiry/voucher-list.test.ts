import { Prisma } from "@/generated/prisma/client"
import { listFinanceVouchers } from "@/lib/finance/inquiry/voucher-list"

const baseRow = {
  id: "voucher-1",
  voucherNo: "V-2026-06-00001",
  date: new Date("2026-06-14"),
  legalEntityCode: "AS",
  refType: "POS_SETTLEMENT_COLLECTOR_PICKUP",
  refId: "collector-1",
  refNo: "COL-260001",
  description: "Collector pickup",
  status: "POSTED",
  branchId: "branch-1",
  branch: { code: "SH001", name: "Shop 1" },
  period: { periodKey: "2026-06" },
  journalEntry: {
    id: "journal-1",
    lines: [
      { debit: new Prisma.Decimal("1000"), credit: new Prisma.Decimal("0") },
      { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("1000") },
    ],
  },
  lines: [],
  manualJournalEntryPosted: null,
  paymentVoucherPosted: null,
  revenueVoucherPosted: null,
  pettyCashVoucherPosted: null,
}

describe("listFinanceVouchers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("scopes list to legal entity and applies full voucherNo filter", async () => {
    const findMany = jest.fn().mockResolvedValue([baseRow])
    const count = jest.fn().mockResolvedValue(1)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
    }

    await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      voucherNo: "V-2026-06-00001",
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          legalEntityCode: "AS",
          voucherNo: { contains: "V-2026-06-00001", mode: "insensitive" },
        }),
      })
    )
  })

  it("matches padded running number when period is selected", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: "period-1" })
    const findMany = jest.fn().mockResolvedValue([baseRow])
    const count = jest.fn().mockResolvedValue(1)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique },
    }

    await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      periodKey: "2026-06",
      voucherNo: "8",
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          periodId: "period-1",
          voucherNo: "V-2026-06-00008",
        }),
      })
    )
  })

  it("matches running number 1 as V-2026-06-00001 with period", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: "period-1" })
    const findMany = jest.fn().mockResolvedValue([])
    const count = jest.fn().mockResolvedValue(0)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique },
    }

    await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      periodKey: "2026-06",
      voucherNo: "1",
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          voucherNo: "V-2026-06-00001",
        }),
      })
    )
  })

  it("filters by refType and date range", async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const count = jest.fn().mockResolvedValue(0)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
    }

    await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      refType: "POS_SETTLEMENT_COLLECTOR_PICKUP",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          refType: "POS_SETTLEMENT_COLLECTOR_PICKUP",
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    )
  })

  it("expands MJV ref type shorthand to refTypeIn filter", async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const count = jest.fn().mockResolvedValue(0)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
    }

    await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      refType: "MJV",
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          refType: { in: expect.arrayContaining(["MANUAL_JOURNAL"]) },
        }),
      })
    )
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          refType: {
            in: expect.not.arrayContaining(["OPENING_BALANCE_JOURNAL"]),
          },
        }),
      })
    )
  })

  it("still supports refNo filter when provided", async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const count = jest.fn().mockResolvedValue(0)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
    }

    await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      refNo: "COL-",
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { refNo: { contains: "COL-", mode: "insensitive" } },
          ]),
        }),
      })
    )
  })

  it("resolves periodKey to periodId filter", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: "period-1" })
    const findMany = jest.fn().mockResolvedValue([baseRow])
    const count = jest.fn().mockResolvedValue(1)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique },
    }

    await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      periodKey: "2026-06",
    })

    expect(findUnique).toHaveBeenCalled()
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ periodId: "period-1" }),
      })
    )
  })

  it("returns empty result when periodKey does not resolve", async () => {
    const findUnique = jest.fn().mockResolvedValue(null)
    const findMany = jest.fn()
    const count = jest.fn()
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique },
    }

    const result = await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      periodKey: "2099-01",
    })

    expect(result).toEqual({ vouchers: [], total: 0 })
    expect(findMany).not.toHaveBeenCalled()
  })

  it("maps list rows with branch, journal entry id, and amount", async () => {
    const findMany = jest.fn().mockResolvedValue([baseRow])
    const count = jest.fn().mockResolvedValue(1)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
    }

    const result = await listFinanceVouchers(prisma, { legalEntityCode: "AS" })

    expect(result.vouchers[0]).toMatchObject({
      branchCode: "SH001",
      journalEntryId: "journal-1",
      amount: "1000",
      documentTypeCode: "COL",
    })
  })

  it("scopes list to legal entity and applies branchId with posted filter", async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const count = jest.fn().mockResolvedValue(0)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
    }

    await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      branchId: "branch-1",
      postingState: "posted",
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          legalEntityCode: "AS",
          branchId: "branch-1",
          status: "POSTED",
        }),
      })
    )
  })

  it("expands OPB document type to opening balance ref types only", async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const count = jest.fn().mockResolvedValue(0)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
    }

    await listFinanceVouchers(prisma, {
      legalEntityCode: "AS",
      refType: "OPB",
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          refType: { in: ["OPENING_BALANCE_JOURNAL"] },
        }),
      })
    )
  })
})
