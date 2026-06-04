import { previewNextReceiptNo } from "@/lib/pos/receipt"

describe("previewNextReceiptNo", () => {
  const branchId = "branch-1"
  const at = new Date("2026-06-04T12:00:00.000Z")

  it("returns next sequence without creating a receipt row", async () => {
    const tx = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({ code: "SH001" }),
      },
      receipt: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
    }

    const preview = await previewNextReceiptNo(tx as never, branchId, at)

    expect(preview).toBe("REC-SH001-202606-0001")
    expect(tx.receipt.create).not.toHaveBeenCalled()
  })

  it("matches allocate sequence when one receipt exists in month", async () => {
    const tx = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({ code: "SH001" }),
      },
      receipt: {
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn(),
      },
    }

    const preview = await previewNextReceiptNo(tx as never, branchId, at)
    expect(preview).toBe("REC-SH001-202606-0002")
  })
})
