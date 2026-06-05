import {
  allocateRefundNo,
  buildRefundNo,
  countRefundsInMonth,
} from "@/lib/pos/refund-receipt-no"

describe("refund receipt numbering", () => {
  const branchId = "branch-1"
  const june = new Date("2026-06-04T12:00:00.000Z")
  const july = new Date("2026-07-04T12:00:00.000Z")

  it("builds REF-SH001-202606-0001", () => {
    expect(buildRefundNo("SH001", june, 1)).toBe("REF-SH001-202606-0001")
    expect(buildRefundNo("SH001", june, 42)).toBe("REF-SH001-202606-0042")
  })

  it("uses uppercase branch code", () => {
    expect(buildRefundNo("sh001", june, 1)).toBe("REF-SH001-202606-0001")
  })

  it("increments to 0002 within same branch and month", async () => {
    const refunds: Array<{ branchId: string; createdAt: Date }> = []
    const tx = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({ code: "SH001" }),
      },
      refund: {
        count: jest.fn(async () => refunds.length),
      },
    }

    const no1 = await allocateRefundNo(tx as never, branchId, june)
    refunds.push({ branchId, createdAt: june })
    const no2 = await allocateRefundNo(tx as never, branchId, june)

    expect(no1).toBe("REF-SH001-202606-0001")
    expect(no2).toBe("REF-SH001-202606-0002")
  })

  it("resets sequence by calendar month", async () => {
    const refunds: Array<{ branchId: string; createdAt: Date }> = [
      { branchId, createdAt: june },
      { branchId, createdAt: june },
    ]
    const tx = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({ code: "SH001" }),
      },
      refund: {
        count: jest.fn(async ({ where }: { where: { createdAt: { gte: Date; lt: Date } } }) =>
          refunds.filter(
            (row) =>
              row.branchId === branchId &&
              row.createdAt >= where.createdAt.gte &&
              row.createdAt < where.createdAt.lt
          ).length
        ),
      },
    }

    const juneNext = await allocateRefundNo(tx as never, branchId, june)
    const julyFirst = await allocateRefundNo(tx as never, branchId, july)

    expect(juneNext).toBe("REF-SH001-202606-0003")
    expect(julyFirst).toBe("REF-SH001-202607-0001")
  })

  it("isolates sequence by branch", async () => {
    const refunds: Array<{ branchId: string; createdAt: Date }> = [
      { branchId: "branch-1", createdAt: june },
    ]
    const tx = {
      branch: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
          if (where.id === "branch-1") return { code: "SH001" }
          if (where.id === "branch-2") return { code: "SH002" }
          return null
        }),
      },
      refund: {
        count: jest.fn(async ({ where }: { where: { branchId: string; createdAt: { gte: Date; lt: Date } } }) =>
          refunds.filter(
            (row) =>
              row.branchId === where.branchId &&
              row.createdAt >= where.createdAt.gte &&
              row.createdAt < where.createdAt.lt
          ).length
        ),
      },
    }

    const branch1Next = await allocateRefundNo(tx as never, "branch-1", june)
    const branch2First = await allocateRefundNo(tx as never, "branch-2", june)

    expect(branch1Next).toBe("REF-SH001-202606-0002")
    expect(branch2First).toBe("REF-SH002-202606-0001")
  })

  it("countRefundsInMonth filters by branch and calendar month", async () => {
    const tx = {
      refund: {
        count: jest.fn().mockResolvedValue(3),
      },
    }

    const count = await countRefundsInMonth(tx as never, branchId, june)

    expect(count).toBe(3)
    expect(tx.refund.count).toHaveBeenCalledWith({
      where: {
        branchId,
        createdAt: {
          gte: new Date(2026, 5, 1),
          lt: new Date(2026, 6, 1),
        },
      },
    })
  })
})
