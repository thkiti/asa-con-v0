import { RefundKind } from "@/generated/prisma/client"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { buildRefundSlipText } from "@/lib/pos/refund-slip-format"
import { RECEIPT_COLUMNS } from "@/lib/pos/receipt-slip-format"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { THERMAL_COLUMNS } from "@/lib/thermal/format"

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
    originalReceiptTotal: "860.00",
    thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
    thermalLayout: resolveThermalLayout("REFUND", DEFAULT_THERMAL_LAYOUTS),
    ...overrides,
  }
}

describe("buildRefundSlipText", () => {
  it("uses operational document fields without duplicate refund title", () => {
    const text = buildRefundSlipText(sampleContext())
    expect(text).not.toContain("REFUND RECEIPT")
    expect(text).toMatch(/Ref\. No\.?\s+REF-SH001-202606-0001/)
    expect(text).not.toContain("Refund No")
  })

  it("includes original receipt and total amount for SALE_LINKED", () => {
    const text = buildRefundSlipText(sampleContext())
    expect(text).toContain("Original Receipt No.")
    expect(text).toContain("REC-SH001-202606-0001")
    expect(text).toContain("TOTAL AMOUNT")
    expect(text).toContain("860.00")
    expect(text).not.toContain("ORIGINAL RECEIPT NO")
  })

  it("includes reason and refund amount without type", () => {
    const text = buildRefundSlipText(
      sampleContext({
        reason: "ลูกค้าไม่รับ งานไม่เรียบร้อย",
      })
    )
    expect(text.replace(/\s+/g, "")).toContain("ลูกค้าไม่รับงานไม่เรียบร้อย")
    expect(text).toContain("REFUND AMOUNT")
    expect(text).toContain("50.00")
    expect(text).not.toContain("REFUND AMOUNT :")
    expect(text).not.toContain("SALE LINKED")
    expect(text).not.toContain("Type")
    expect(text).not.toContain("Reason\n")
  })

  it("formats staff with bullet separator and date label", () => {
    const text = buildRefundSlipText(sampleContext())
    expect(text).toContain("103 • Somsak Kamnuch")
    expect(text).toContain("Date:")
    expect(text).toContain("Staff:")
    expect(text).not.toContain("103-Somsak Kamnuch")
  })

  it("formats GOODWILL without original receipt line", () => {
    const text = buildRefundSlipText(
      sampleContext({
        kind: RefundKind.GOODWILL,
        saleId: null,
        originalReceiptId: null,
        originalReceiptNo: null,
        originalReceiptTotal: null,
        reason: "Customer goodwill",
      })
    )
    expect(text).not.toContain("GOODWILL")
    expect(text).toContain("Customer goodwill")
    expect(text).not.toContain("Original Rec. No.")
  })

  it("does not include sale line items, CASH, or CHANGE", () => {
    const text = buildRefundSlipText(sampleContext())
    expect(text).not.toContain("CASH")
    expect(text).not.toContain("CHANGE")
    expect(text).not.toContain("VAT 7%")
    expect(text).not.toContain("0101001")
    expect(text).not.toContain("Widget")
  })

  it("includes receipt sub-header from inherited layout before refund body", () => {
    const text = buildRefundSlipText(sampleContext())
    const subIdx = text.indexOf("ใบกำกับภาษีอย่างย่อ")
    const refIdx = text.search(/Ref\. No/)
    expect(refIdx).toBeGreaterThan(-1)
    expect(subIdx).toBeGreaterThan(refIdx)
  })

  it("wraps long reason text across multiple lines", () => {
    const text = buildRefundSlipText(
      sampleContext({
        reason: "A very long reason that should wrap cleanly on the slip",
        cashierDisplay: "999-Staff",
      })
    )
    expectSlipLinesWithinColumns(text)
    expect(text).toContain("REASON: A very long reason tha")
    expect(text).toContain("t should wrap cleanly")
    expect(text).toContain("slip")
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
    expect(text).toContain("REF-SH001-202606-0001")
    expect(text).not.toContain("REFUND RECEIPT")
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
    const amountIdx = text.indexOf("REFUND AMOUNT")
    const footerIdx = text.indexOf("Footer thanks")
    const phoneIdx = text.indexOf("Phone No.")
    const signIdx = text.indexOf("Sign")
    expect(amountIdx).toBeGreaterThan(-1)
    expect(footerIdx).toBeGreaterThan(amountIdx)
    expect(phoneIdx).toBeGreaterThan(footerIdx)
    expect(signIdx).toBeGreaterThan(phoneIdx)
  })

  it("includes customer acknowledgement with inline dotted guides and cut separator", () => {
    const text = buildRefundSlipText(sampleContext())
    const lines = text.split("\n")
    const phoneIdx = lines.findIndex((line) => line.startsWith("Phone No."))
    const signIdx = lines.findIndex((line) => line.startsWith("Sign"))
    const amountLineIdx = lines.findIndex((line) => line.includes("REFUND AMOUNT"))

    expect(phoneIdx).toBeGreaterThan(-1)
    expect(signIdx).toBeGreaterThan(phoneIdx)
    expect(phoneIdx).toBeGreaterThan(amountLineIdx)
    expect(lines[phoneIdx]).toMatch(/^Phone No\.\s+\.+/)
    expect(lines[signIdx]).toMatch(/^Sign\s+\.+/)
    expect(lines.at(-2)).toBe("-".repeat(THERMAL_COLUMNS))
  })
})
