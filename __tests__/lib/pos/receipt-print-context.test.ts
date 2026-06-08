import { loadReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"

describe("loadReceiptPrintContext", () => {
  it("resolves company tax from HO999 and machine id from current branch", async () => {
    const sale = {
      id: "sale-1",
      branchId: "branch-sh",
      staffId: "103",
      total: { toFixed: () => "60.00" },
      branch: { code: "SH001", name: "Shop One" },
      items: [],
      payment: { method: "CASH", amount: { toFixed: () => "60.00" }, change: { toFixed: () => "0.00" } },
      receipt: { receiptNo: "REC-SH001-202606-0001", issuedAt: new Date("2026-06-04T12:00:00.000Z") },
    }

    const db = {
      sale: {
        findFirst: jest.fn().mockResolvedValue(sale),
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

    const ctx = await loadReceiptPrintContext(db as never, {
      saleId: "sale-1",
      branchId: "branch-sh",
    })

    expect(ctx.companyTaxId).toBe("COMP-TAX-99")
    expect(ctx.machineTaxId).toBe("MACH-01")
    expect(ctx.companyDisplayName).toBe("ASA SERVICES")
    expect(ctx.branchAddress).toBe("Addr")
    expect(ctx.branchPhone).toBe("02-111")
    expect(ctx.thermalLayout.headerLine1).toBe("ASA SERVICES")
  })

  it("omits machine id when current branch is HO999", async () => {
    const sale = {
      id: "sale-1",
      branchId: "branch-ho",
      staffId: null,
      total: { toFixed: () => "10.00" },
      branch: { code: "HO999", name: "Head Office" },
      items: [],
      payment: { method: "CASH", amount: { toFixed: () => "10.00" }, change: { toFixed: () => "0.00" } },
      receipt: { receiptNo: "REC-HO999-202606-0001", issuedAt: new Date() },
    }

    const db = {
      sale: { findFirst: jest.fn().mockResolvedValue(sale) },
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

    const ctx = await loadReceiptPrintContext(db as never, {
      saleId: "sale-1",
      branchId: "branch-ho",
    })

    expect(ctx.machineTaxId).toBeNull()
    expect(ctx.thermalLayout).toEqual(DEFAULT_THERMAL_LAYOUTS.RECEIPT)
  })
})
