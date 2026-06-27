import { RefundKind } from "@/generated/prisma/client"
import { loadRefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"

describe("loadRefundReceiptPrintContext", () => {
  it("resolves company tax from HO999 and machine id from current branch", async () => {
    const refund = {
      id: "refund-1",
      refundNo: "REF-SH001-202606-0001",
      kind: RefundKind.SALE_LINKED,
      saleId: "sale-1",
      branchId: "branch-sh",
      staffId: "103",
      originalReceiptId: "rcpt-1",
      amount: { toFixed: () => "60.00" },
      reason: null,
      createdAt: new Date("2026-06-04T12:00:00.000Z"),
      branch: { code: "SH001", name: "Shop One" },
      originalReceipt: { id: "rcpt-1", receiptNo: "REC-SH001-202606-0001" },
      sale: { total: { toFixed: () => "860.00" } },
    }

    const db = {
      refund: {
        findFirst: jest.fn().mockResolvedValue(refund),
      },
      staff: {
        findUnique: jest.fn().mockResolvedValue({ name: "Somsak" }),
      },
      branch: {
        findUnique: jest.fn(({ where }: { where: { id?: string; code?: string } }) => {
          if (where.code === "HO999") {
            return Promise.resolve({ taxId: "COMP-TAX-99" })
          }
          if (where.id === "branch-sh") {
            return Promise.resolve({
              code: "SH001",
              address: "Addr",
              phone: "02-111",
              taxId: "MACH-01",
            })
          }
          return Promise.resolve(null)
        }),
      },
      thermalDocumentLayout: {
        findMany: jest.fn().mockResolvedValue([
          {
            documentType: "RECEIPT",
            headerLine1: "ASA SERVICES",
            headerLine2: null,
            headerLine3: null,
            footerLine1: null,
            footerLine2: null,
            footerLine3: null,
            footerLine4: null,
            footerLine5: null,
            showAbbreviatedTaxTitle: true,
            showVatIncludedMessage: true,
          },
        ]),
      },
    }

    const ctx = await loadRefundReceiptPrintContext(db as never, {
      refundId: "refund-1",
      branchId: "branch-sh",
    })

    expect(ctx.companyTaxId).toBe("COMP-TAX-99")
    expect(ctx.machineTaxId).toBe("MACH-01")
    expect(ctx.companyDisplayName).toBe("ASA SERVICES")
    expect(ctx.branchAddress).toBe("Addr")
    expect(ctx.branchPhone).toBe("02-111")
    expect(ctx.refundNo).toBe("REF-SH001-202606-0001")
    expect(ctx.originalReceiptNo).toBe("REC-SH001-202606-0001")
    expect(ctx.originalReceiptTotal).toBe("860.00")
  })

  it("omits machine id when current branch is HO999 and uses default thermal layout", async () => {
    const refund = {
      id: "refund-1",
      refundNo: "REF-HO999-202606-0001",
      kind: RefundKind.GOODWILL,
      saleId: null,
      branchId: "branch-ho",
      staffId: null,
      originalReceiptId: null,
      amount: { toFixed: () => "10.00" },
      reason: "Goodwill",
      createdAt: new Date(),
      branch: { code: "HO999", name: "Head Office" },
      originalReceipt: null,
    }

    const db = {
      refund: { findFirst: jest.fn().mockResolvedValue(refund) },
      staff: { findUnique: jest.fn() },
      branch: {
        findUnique: jest.fn(({ where }: { where: { id?: string; code?: string } }) => {
          if (where.code === "HO999") {
            return Promise.resolve({ taxId: "COMP-TAX" })
          }
          if (where.id === "branch-ho") {
            return Promise.resolve({
              code: "HO999",
              address: null,
              phone: null,
              taxId: "COMP-TAX",
            })
          }
          return Promise.resolve(null)
        }),
      },
      thermalDocumentLayout: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    }

    const ctx = await loadRefundReceiptPrintContext(db as never, {
      refundId: "refund-1",
      branchId: "branch-ho",
    })

    expect(ctx.machineTaxId).toBeNull()
    expect(ctx.thermalLayout).toEqual(
      resolveThermalLayout("REFUND", DEFAULT_THERMAL_LAYOUTS)
    )
    expect(ctx.originalReceiptNo).toBeNull()
  })
})
