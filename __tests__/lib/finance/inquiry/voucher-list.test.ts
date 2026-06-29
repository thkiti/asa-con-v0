import { Prisma } from "@/generated/prisma/client"
import { listFinanceVouchers } from "@/lib/finance/inquiry/voucher-list"

const baseRow = {
  id: "voucher-1",
  voucherNo: "V-2026-06-00001",
  date: new Date("2026-06-14"),
  legalEntityCode: "AS",
  refType: "POS_SETTLEMENT_COLLECTOR_PICKUP",
  refNo: "COL-260001",
  description: "Collector pickup",
  status: "POSTED",
  period: { periodKey: "2026-06" },
  journalEntry: {
    lines: [
      { debit: new Prisma.Decimal("1000"), credit: new Prisma.Decimal("0") },
      { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("1000") },
    ],
  },
  lines: [],
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
          refType: { in: expect.arrayContaining(["MANUAL_JOURNAL", "OPENING_BALANCE_JOURNAL"]) },
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
          refNo: { contains: "COL-", mode: "insensitive" },
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

  it("maps list rows with journal debit/credit totals", async () => {
    const findMany = jest.fn().mockResolvedValue([baseRow])
    const count = jest.fn().mockResolvedValue(1)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
    }

    const result = await listFinanceVouchers(prisma, { legalEntityCode: "AS" })

    expect(result.total).toBe(1)
    expect(result.vouchers[0]).toMatchObject({
      id: "voucher-1",
      voucherNo: "V-2026-06-00001",
      legalEntityCode: "AS",
      periodKey: "2026-06",
      refType: "POS_SETTLEMENT_COLLECTOR_PICKUP",
      refNo: "COL-260001",
      totalDebit: "1000",
      totalCredit: "1000",
    })
  })
})
