import { RefundKind } from "@/generated/prisma/client"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { buildRefundSlipText } from "@/lib/pos/refund-slip-format"
import { RECEIPT_COLUMNS } from "@/lib/pos/receipt-slip-format"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"

function expectSlipLinesWithinColumns(text: string): void {
  for (const line of text.split("\n")) {
    if (!line.length) continue
    expect(line.length).toBeLessThanOrEqual(RECEIPT_COLUMNS)
  }
}

function sampleContext(
  overrides: Partial<RefundReceiptPrintContext> = {}
): RefundReceiptPrintContext {
  return {
    refundId: "refund-1",
    refundNo: "REF-SH001-202606-0001",
    issuedAt: "2026-06-04T12:00:00.000Z",
    kind: RefundKind.SALE_LINKED,
    amount: "50.00",
    reason: "Defective item",
    branchId: "branch-1",
    branchCode: "SH001",
    branchName: "Shop One",
    branchAddress: null,
    branchPhone: null,
    companyDisplayName: "ASA SERVICES",
    companyTaxId: "0123456789012",
    machineTaxId: "MACH-001",
    cashierDisplay: "103-Somsak Kamnuch",
    saleId: "sale-1",
    originalReceiptId: "rcpt-1",
    originalReceiptNo: "REC-SH001-202606-0001",
    thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
    thermalLayout: resolveThermalLayout("REFUND", DEFAULT_THERMAL_LAYOUTS),
    ...overrides,
  }
}

describe("buildRefundSlipText", () => {
  it("includes REFUND RECEIPT title and refundNo", () => {
    const text = buildRefundSlipText(sampleContext())
    expect(text).toContain("REFUND RECEIPT")
    expect(text).toContain("REF-SH001-202606-0001")
  })

  it("includes original receipt for SALE_LINKED", () => {
    const text = buildRefundSlipText(sampleContext())
    expect(text).toContain("ORIGINAL RECEIPT NO")
    expect(text).toContain("REC-SH001-202606-0001")
  })

  it("includes reason and refund amount", () => {
    const text = buildRefundSlipText(
      sampleContext({
        reason: "ผิดแบบ (Key Blank mistake) ใส่ไม่เข้า",
      })
    )
    expect(text).toContain("Reason")
    expect(text).toContain("ผิดแบบ (Key Blank mistake)")
    expect(text).toContain("REFUND")
    expect(text).toContain("50.00")
  })

  it("includes staff and type for SALE_LINKED", () => {
    const text = buildRefundSlipText(sampleContext())
    expect(text).toContain("103-Somsak Kamnuch")
    expect(text).toContain("SALE LINKED")
  })

  it("formats GOODWILL without original receipt line", () => {
    const text = buildRefundSlipText(
      sampleContext({
        kind: RefundKind.GOODWILL,
        saleId: null,
        originalReceiptId: null,
        originalReceiptNo: null,
        reason: "Customer goodwill",
      })
    )
    expect(text).toContain("GOODWILL")
    expect(text).toContain("Customer goodwill")
    expect(text).not.toContain("ORIGINAL RECEIPT NO")
  })

  it("does not include sale line items, CASH, or CHANGE", () => {
    const text = buildRefundSlipText(sampleContext())
    expect(text).not.toContain("CASH")
    expect(text).not.toContain("CHANGE")
    expect(text).not.toContain("TOTAL")
    expect(text).not.toContain("VAT 7%")
    expect(text).not.toContain("0101001")
    expect(text).not.toContain("Widget")
  })

  it("includes receipt sub-header from inherited layout before refund body", () => {
    const text = buildRefundSlipText(sampleContext())
    const subIdx = text.indexOf("ใบกำกับภาษีอย่างย่อ")
    const refundTitleIdx = text.indexOf("REFUND RECEIPT")
    expect(subIdx).toBeGreaterThan(-1)
    expect(refundTitleIdx).toBeGreaterThan(subIdx)
  })

  it("keeps lines within receipt column width", () => {
    const text = buildRefundSlipText(
      sampleContext({
        reason: "A very long reason that should truncate cleanly on the slip",
        cashierDisplay: "999-Extra Long Staff Name Here",
      })
    )
    expectSlipLinesWithinColumns(text)
  })

  it("reuses footer block from receipt layout", () => {
    const layouts = {
      ...DEFAULT_THERMAL_LAYOUTS,
      RECEIPT: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        footerBlockText: "Thank you",
      },
      REFUND: DEFAULT_THERMAL_LAYOUTS.REFUND,
    }
    const text = buildRefundSlipText(
      sampleContext({
        thermalLayouts: layouts,
      })
    )
    expect(text).toContain("Thank you")
  })

  it("inherits receipt header and sub-header blocks in print text", () => {
    const layouts = {
      ...DEFAULT_THERMAL_LAYOUTS,
      RECEIPT: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerBlockText: "ASA HEADER",
        subHeaderBlockText: "SUB HEADER LINE",
        footerBlockText: "ASA FOOTER",
        showAbbreviatedTaxTitle: false,
      },
      REFUND: DEFAULT_THERMAL_LAYOUTS.REFUND,
    }
    const text = buildRefundSlipText(
      sampleContext({
        thermalLayouts: layouts,
      })
    )
    expect(text).toContain("ASA HEADER")
    expect(text).toContain("SUB HEADER LINE")
    expect(text).toContain("ASA FOOTER")
    expect(text).toContain("REFUND RECEIPT")
    expect(text).toContain("REF-SH001-202606-0001")
  })

  it("places receipt footer before Phone No / Sign acknowledgement", () => {
    const layouts = {
      ...DEFAULT_THERMAL_LAYOUTS,
      RECEIPT: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        footerBlockText: "Footer thanks",
      },
      REFUND: DEFAULT_THERMAL_LAYOUTS.REFUND,
    }
    const text = buildRefundSlipText(
      sampleContext({
        thermalLayouts: layouts,
      })
    )
    const footerIdx = text.indexOf("Footer thanks")
    const phoneIdx = text.indexOf("Phone No")
    const signIdx = text.indexOf("Sign")
    expect(footerIdx).toBeGreaterThan(-1)
    expect(phoneIdx).toBeGreaterThan(footerIdx)
    expect(signIdx).toBeGreaterThan(phoneIdx)
  })

  it("includes customer acknowledgement section after footer", () => {
    const text = buildRefundSlipText(sampleContext())
    const phoneIdx = text.indexOf("Phone No")
    const signIdx = text.indexOf("Sign")
    const refundIdx = text.indexOf("REFUND")

    expect(phoneIdx).toBeGreaterThan(-1)
    expect(signIdx).toBeGreaterThan(phoneIdx)
    expect(phoneIdx).toBeGreaterThan(refundIdx)

    const dotLine = ".".repeat(30)
    const phoneBlock = text.slice(phoneIdx, signIdx)
    const signBlock = text.slice(signIdx)
    expect(phoneBlock.split(dotLine).length - 1).toBe(2)
    expect(signBlock.split(dotLine).length - 1).toBe(3)
  })
})
