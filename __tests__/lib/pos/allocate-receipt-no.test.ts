import { allocateReceiptNo } from "@/lib/pos/receipt"

describe("allocateReceiptNo", () => {
  const branchId = "branch-1"
  const at = new Date("2026-06-04T12:00:00.000Z")

  it("allocates monthly sequence using branch code", async () => {
    const receipts: Array<{ branchId: string; issuedAt: Date }> = []
    const tx = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({ code: "SH001" }),
      },
      receipt: {
        count: jest.fn(async () => receipts.length),
        create: jest.fn(),
      },
    }

    const no1 = await allocateReceiptNo(tx as never, branchId, at)
    receipts.push({ branchId, issuedAt: at })
    const no2 = await allocateReceiptNo(tx as never, branchId, at)

    expect(no1).toBe("REC-SH001-202606-0001")
    expect(no2).toBe("REC-SH001-202606-0002")
    expect(tx.receipt.count).toHaveBeenCalledWith({
      where: {
        branchId,
        issuedAt: {
          gte: new Date(2026, 5, 1),
          lt: new Date(2026, 6, 1),
        },
      },
    })
  })
})
