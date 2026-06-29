import {
  resolveRefundReceiptPrintBranchId,
  resolveSaleReceiptPrintBranchId,
} from "@/lib/shop/resolve-pos-origin-print-branch"

const hoFinance = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_FINANCE" as const,
  staffId: "001",
  name: "Finance",
  branchId: "ho-branch",
  branchCode: "HO999",
  branchName: "Head Office",
}

const shopStaff = {
  ...hoFinance,
  role: "SH_STAFF" as const,
  branchId: "shop-branch",
  branchCode: "SH001",
}

describe("resolveSaleReceiptPrintBranchId", () => {
  it("uses query branchId when provided for HO audit", async () => {
    const prisma = { sale: { findUnique: jest.fn() } }
    await expect(
      resolveSaleReceiptPrintBranchId(prisma, hoFinance, "sale-1", "branch-from-query")
    ).resolves.toBe("branch-from-query")
    expect(prisma.sale.findUnique).not.toHaveBeenCalled()
  })

  it("resolves branch from sale row for HO when query omitted (finance inquiry)", async () => {
    const prisma = {
      sale: {
        findUnique: jest.fn().mockResolvedValue({ branchId: "branch-sh001" }),
      },
    }
    await expect(
      resolveSaleReceiptPrintBranchId(prisma, hoFinance, "sale-1")
    ).resolves.toBe("branch-sh001")
  })

  it("keeps shop staff pinned to session branch", async () => {
    const prisma = { sale: { findUnique: jest.fn() } }
    await expect(
      resolveSaleReceiptPrintBranchId(prisma, shopStaff, "sale-1", "other-branch")
    ).resolves.toBe("shop-branch")
  })
})

describe("resolveRefundReceiptPrintBranchId", () => {
  it("resolves branch from refund row for HO finance audit", async () => {
    const prisma = {
      refund: {
        findUnique: jest.fn().mockResolvedValue({ branchId: "branch-sh002" }),
      },
    }
    await expect(
      resolveRefundReceiptPrintBranchId(prisma, hoFinance, "refund-1")
    ).resolves.toBe("branch-sh002")
  })
})
