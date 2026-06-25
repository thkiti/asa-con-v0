import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import {
  buildReceiptSlipText,
  centerReceiptLine,
  computeReceiptMaxAmountWidth,
  formatReceiptAmountLine,
  formatReceiptCompactUnitPrice,
  formatReceiptItemDetailLine,
  formatReceiptMoney,
  padReceiptLine,
  RECEIPT_AMOUNT_MIN_GAP,
  RECEIPT_COLUMNS,
  RECEIPT_PRINT_COLUMNS,
  truncateReceiptText,
  wrapReceiptProductName,
} from "@/lib/pos/receipt-slip-format"
import { calculateReceiptVat7FromInclusive } from "@/lib/pos/receipt-vat-display"

function expectAmountInColumn(
  line: string,
  amount: string,
  amountWidth: number
): void {
  expect(line.length).toBe(RECEIPT_COLUMNS)
  expect(line.slice(-amountWidth)).toBe(amount.padStart(amountWidth, " "))
  expect(amount).toMatch(/\.\d{2}$/)
  expect(line).not.toMatch(/,\d{2}$/)
  const gapRegion = line.slice(0, line.length - amountWidth)
  expect(gapRegion.length - gapRegion.trimEnd().length).toBeGreaterThanOrEqual(
    RECEIPT_AMOUNT_MIN_GAP
  )
}

function expectLineCentered(line: string, snippet: string): void {
  expect(line.length).toBe(RECEIPT_COLUMNS)
  const start = line.indexOf(snippet)
  expect(start).toBeGreaterThanOrEqual(0)
  const endPad = RECEIPT_COLUMNS - start - snippet.length
  expect(Math.abs(start - endPad)).toBeLessThanOrEqual(1)
}

function expectSlipLinesWithinColumns(text: string): void {
  for (const line of text.split("\n")) {
    if (!line.length) continue
    expect(line.length).toBeLessThanOrEqual(RECEIPT_COLUMNS)
  }
}

function sampleContext(overrides: Partial<ReceiptPrintContext> = {}): ReceiptPrintContext {
  return {
    saleId: "sale-1",
    receiptNo: "REC-SH001-202606-0001",
    issuedAt: "2026-01-15T10:30:00.000Z",
    branchCode: "SH001",
    branchName: "Shop One",
    branchAddress: null,
    branchPhone: null,
    companyDisplayName: "ASA SERVICES",
    companyTaxId: "0123456789012",
    machineTaxId: "MACH-001",
    cashierDisplay: "103-Somsak Kamnuch",
    lines: [
      {
        name: "Widget",
        code: "0101001",
        qty: 1,
        unitPrice: "60.00",
        lineTotal: "60.00",
      },
    ],
    total: "60.00",
    paymentMethod: "CASH",
    cashAmount: "60.00",
    change: "0.00",
    thermalLayouts: {
      ...DEFAULT_THERMAL_LAYOUTS,
      RECEIPT: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerLine1: "ASA SERVICES",
      },
    },
    thermalLayout: {
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      headerLine1: "ASA SERVICES",
    },
    ...overrides,
  }
}

describe("formatReceiptMoney", () => {
  it("always uses two decimal places", () => {
    expect(formatReceiptMoney(60)).toBe("60.00")
    expect(formatReceiptMoney(100)).toBe("100.00")
    expect(formatReceiptMoney(4.7)).toBe("4.70")
    expect(formatReceiptMoney(1250)).toBe("1250.00")
    expect(formatReceiptMoney(99999.99)).toBe("99999.99")
  })

  it("never removes the decimal point from formatted output", () => {
    for (const value of [0, 4.7, 60, 100, 1234.5, "99.99"]) {
      const formatted = formatReceiptMoney(value)
      expect(formatted).toContain(".")
      expect(formatted).toMatch(/\.\d{2}$/)
    }
  })
})

describe("receipt-slip-format", () => {
  it("uses RECEIPT_COLUMNS for slip width (30 on TM-U220 @ 14px)", () => {
    expect(RECEIPT_COLUMNS).toBe(30)
    expect(RECEIPT_PRINT_COLUMNS).toBe(RECEIPT_COLUMNS)
  })

  it("pads label lines to fixed column width", () => {
    const line = padReceiptLine("TOTAL", "123.45")
    expect(line.length).toBe(RECEIPT_COLUMNS)
    expect(line.endsWith("123.45")).toBe(true)
  })

  it("aligns 60.00 and 120.00 in a stable amount column", () => {
    const amountWidth = 6
    const line1 = formatReceiptAmountLine("0101001=1x60", "60.00", RECEIPT_COLUMNS, amountWidth)
    const line2 = formatReceiptAmountLine("0101002=2x60", "120.00", RECEIPT_COLUMNS, amountWidth)
    expectAmountInColumn(line1, "60.00", amountWidth)
    expectAmountInColumn(line2, "120.00", amountWidth)
    expect(line1.slice(-amountWidth)).toBe(" 60.00")
    expect(line2.slice(-amountWidth)).toBe("120.00")
  })

  it("aligns 60.00 and 1250.00 in a stable amount column", () => {
    const amountWidth = 7
    const line1 = formatReceiptAmountLine("0101001=1x60", "60.00", RECEIPT_COLUMNS, amountWidth)
    const line2 = formatReceiptAmountLine("0102001=1x1250", "1250.00", RECEIPT_COLUMNS, amountWidth)
    expectAmountInColumn(line1, "60.00", amountWidth)
    expectAmountInColumn(line2, "1250.00", amountWidth)
  })

  it("prints 60.00, 120.00, 180.00, and 1250.00 fully at RECEIPT_COLUMNS", () => {
    const receipt = sampleContext({
      lines: [
        {
          name: "Item A",
          code: "0101001",
          qty: 1,
          unitPrice: "60",
          lineTotal: "60.00",
        },
        {
          name: "Item B",
          code: "0101002",
          qty: 2,
          unitPrice: "60",
          lineTotal: "120.00",
        },
        {
          name: "Item C",
          code: "0102001",
          qty: 1,
          unitPrice: "1250",
          lineTotal: "1250.00",
        },
      ],
      total: "1430.00",
      cashAmount: "1430.00",
      change: "0.00",
    })
    const amountWidth = computeReceiptMaxAmountWidth(receipt)
    expect(amountWidth).toBe(7)

    const lines = buildReceiptSlipText(receipt).split("\n")
    const item1 = lines.find((l) => l.includes("0101001=1x60"))!
    const item2 = lines.find((l) => l.includes("0101002=2x60"))!
    const item3 = lines.find((l) => l.includes("0102001=1x1250"))!
    const total = lines.find((l) => l.startsWith("TOTAL"))!

    expectAmountInColumn(item1, "60.00", amountWidth)
    expectAmountInColumn(item2, "120.00", amountWidth)
    expectAmountInColumn(item3, "1250.00", amountWidth)
    expectAmountInColumn(total, "1430.00", amountWidth)
    expect(item1).toContain(".00")
    expect(item3).toContain("1250.00")
  })

  it("uses same amount column width on items and totals in buildReceiptSlipText", () => {
    const receipt = sampleContext({
      lines: [
        {
          name: "A",
          code: "0101001",
          qty: 1,
          unitPrice: "60",
          lineTotal: "60.00",
        },
        {
          name: "B",
          code: "0101002",
          qty: 2,
          unitPrice: "60",
          lineTotal: "120.00",
        },
      ],
      total: "180.00",
      cashAmount: "180.00",
      change: "0.00",
    })
    const amountWidth = computeReceiptMaxAmountWidth(receipt)
    expect(amountWidth).toBe(6)

    const lines = buildReceiptSlipText(receipt).split("\n")
    const item1 = lines.find((l) => l.includes("0101001=1x60"))!
    const item2 = lines.find((l) => l.includes("0101002=2x60"))!
    const total = lines.find((l) => l.startsWith("TOTAL"))!
    const vat = lines.find((l) => l.startsWith("VAT 7%"))!
    const cash = lines.find((l) => l.startsWith("CASH"))!
    const change = lines.find((l) => l.startsWith("CHANGE"))!

    for (const line of [item1, item2, total, vat, cash, change]) {
      expect(line.length).toBe(RECEIPT_COLUMNS)
      expect(line.slice(-amountWidth)).toMatch(/^\s*\d+\.\d{2}$/)
    }
    expect(item1.slice(-amountWidth)).toBe(" 60.00")
    expect(item2.slice(-amountWidth)).toBe("120.00")
    expect(total.slice(-amountWidth)).toBe("180.00")
    expect(vat.slice(-amountWidth)).toBe(calculateReceiptVat7FromInclusive("180.00").padStart(6, " "))
    expect(change.slice(-amountWidth)).toBe("  0.00")
  })

  it.each(["60.00", "180.00", "1250.00", "99999.99"])(
    "protects full amount %s with shared column width",
    (amount) => {
      const amountWidth = amount.length
      const itemLine = formatReceiptItemDetailLine(
        {
          code: "0101001",
          qty: 1,
          unitPrice: "60",
          lineTotal: amount,
        },
        RECEIPT_COLUMNS,
        amountWidth
      )
      expectAmountInColumn(itemLine, amount, amountWidth)

      const totalLine = formatReceiptAmountLine("TOTAL", amount, RECEIPT_COLUMNS, amountWidth)
      expectAmountInColumn(totalLine, amount, amountWidth)
    }
  )

  it("skips empty header and footer blocks in slip text", () => {
    const text = buildReceiptSlipText(
      sampleContext({
        thermalLayout: {
          ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
          headerBlockText: null,
          footerBlockText: null,
          headerLine1: null,
          footerLine1: null,
        },
      })
    )
    expect(text).not.toContain("ASA SERVICES")
    expect(text).toContain("REC-SH001-202606-0001")
    expect(text).not.toMatch(/Thank you/i)
  })

  it("renders header block line breaks", () => {
    const text = buildReceiptSlipText(
      sampleContext({
        thermalLayout: {
          ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
          headerBlockText: "Line one\nLine two",
          footerBlockText: null,
        },
      })
    )
    expect(text).toContain("Line one")
    expect(text).toContain("Line two")
  })

  it("centers footer and abbreviated tax title", () => {
    const footerText = "Thank you for shopping"
    const text = buildReceiptSlipText(
      sampleContext({
        thermalLayout: {
          ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
          headerLine1: "ASA SERVICES",
          footerLine1: footerText,
          showAbbreviatedTaxTitle: true,
          showVatIncludedMessage: true,
        },
      })
    )
    const lines = text.split("\n").filter((l) => l.length > 0)
    const taxHeader = lines.find((l) => l.includes("ใบกำกับภาษีอย่างย่อ"))!
    const footer = lines.find((l) => l.includes("Thank you"))!

    expectLineCentered(taxHeader, "ใบกำกับภาษีอย่างย่อ")
    expect(text).not.toContain("ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว")
    expectLineCentered(footer, footerText)
    expect(centerReceiptLine(footerText, RECEIPT_COLUMNS)).toBe(footer)
  })

  it("keeps every slip line within RECEIPT_COLUMNS", () => {
    const text = buildReceiptSlipText(
      sampleContext({
        lines: [
          {
            name: "กุญแจ(เล็ก)บ้านธรรมดา K extra long product name",
            code: "0101001",
            qty: 1,
            unitPrice: "60",
            lineTotal: "60.00",
          },
        ],
        thermalLayout: {
          ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
          headerLine1: "ASA SERVICES",
          footerLine1: "Centered footer message",
          showAbbreviatedTaxTitle: true,
          showVatIncludedMessage: true,
        },
      })
    )
    expectSlipLinesWithinColumns(text)
  })

  it("truncates long Thai product name to one line with ellipsis", () => {
    const longName =
      "กุญแจ(เล็ก)บ้านธรรมดา K extra text that exceeds printable width"
    const lines = wrapReceiptProductName(longName)
    expect(lines).toHaveLength(1)
    expect(lines[0].length).toBeLessThanOrEqual(RECEIPT_COLUMNS)
    expect(lines[0]).toMatch(/\.\.\.$/)
    expect(truncateReceiptText(longName, RECEIPT_COLUMNS)).toBe(lines[0])

    const slip = buildReceiptSlipText(
      sampleContext({
        lines: [
          {
            name: longName,
            code: "0101001",
            qty: 3,
            unitPrice: "60",
            lineTotal: "180.00",
          },
        ],
        total: "180.00",
        cashAmount: "180.00",
        change: "0.00",
      })
    )
    const slipLines = slip.split("\n")
    const nameLine = slipLines.find((l) => l.includes("กุญแจ"))!
    const detailLine = slipLines.find((l) => l.includes("0101001=3x60"))!
    expect(nameLine.length).toBeLessThanOrEqual(RECEIPT_COLUMNS)
    expect(nameLine.startsWith("ก")).toBe(true)
    expect(nameLine).toMatch(/\.\.\.$/)
    expect(detailLine.length).toBe(RECEIPT_COLUMNS)
    expectAmountInColumn(detailLine, "180.00", 6)
    expect(detailLine).not.toMatch(/\n/)
  })

  it("places abbreviated tax title after ref/staff, before item lines", () => {
    const text = buildReceiptSlipText(
      sampleContext({
        branchPhone: "02-111-2222",
        thermalLayout: {
          ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
          headerLine1: "ASA SERVICES",
          showAbbreviatedTaxTitle: true,
          showVatIncludedMessage: true,
        },
      })
    )
    const lines = text.split("\n")
    const taxTitleIdx = lines.findIndex((l) => l.includes("ใบกำกับภาษีอย่างย่อ"))
    const refIdx = lines.findIndex((l) => l.includes("Ref.") || l.includes("REC-SH001"))
    const changeIdx = lines.findIndex((l) => l.startsWith("CHANGE") || l.includes("CHANGE"))
    expect(taxTitleIdx).toBeGreaterThan(-1)
    expect(refIdx).toBeGreaterThan(-1)
    expect(refIdx).toBeLessThan(taxTitleIdx)
    expect(text).not.toContain("ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว")
    expect(lines.filter((l) => l.includes("ใบกำกับภาษีอย่างย่อ")).length).toBe(1)
    const afterTotals = lines.slice(changeIdx)
    expect(afterTotals.some((l) => l.includes("ใบกำกับภาษีอย่างย่อ"))).toBe(false)
  })

  it("uses thermal footer lines and omits hard-coded legal text when disabled", () => {
    const text = buildReceiptSlipText(
      sampleContext({
        thermalLayout: {
          ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
          headerLine1: "ASA SERVICES",
          footerLine1: "Thank you",
          subHeaderBlockText: null,
          showAbbreviatedTaxTitle: false,
          showVatIncludedMessage: false,
        },
      })
    )
    expect(text).toContain("Thank you")
    expect(text).not.toContain("ใบกำกับภาษีอย่างย่อ")
    expect(text).not.toContain("ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว")
  })

  it("prints company tax and machine no from context", () => {
    const text = buildReceiptSlipText(sampleContext())
    expect(text).toContain("Tax ID 0123456789012")
    expect(text).toContain("M/C No. MACH-001")
    expect(text).toContain("SH001 • Shop One")
    expect(text).toContain("REC-SH001-202606-0001")
    expect(text).toContain("Ref.")
    expect(text).toContain("Staff")
  })

  it("calculates VAT via total minus taxable", () => {
    expect(calculateReceiptVat7FromInclusive("107.00")).toBe("7.00")
  })

  it("omits empty tax and footer lines", () => {
    const text = buildReceiptSlipText(
      sampleContext({
        companyDisplayName: "Shop Co",
        companyTaxId: null,
        machineTaxId: null,
        thermalLayout: {
          ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
          footerLine1: "  ",
          footerLine2: "Only footer",
          showAbbreviatedTaxTitle: false,
          showVatIncludedMessage: false,
        },
      })
    )
    expect(text).not.toContain("Tax ID")
    expect(text).not.toContain("M/C No.")
    expect(text).toContain("Only footer")
  })

  it.each([
    ["CASH", "CASH"],
    ["CARD", "CARD"],
    ["BANK_TRANSFER", "BANK TRANSFER"],
    ["OTHER", "PROMPT PAY"],
    ["QR", "QR CODE"],
    ["TRANSFER", "TRANSFER"],
  ] as const)("prints %s payment line as %s", (paymentMethod, expectedLabel) => {
    const text = buildReceiptSlipText(
      sampleContext({
        paymentMethod,
        cashAmount: "60.00",
        change: "0.00",
      })
    )
    const paymentLine = text.split("\n").find((line) => line.trimStart().startsWith(expectedLabel))
    expect(paymentLine).toBeDefined()
    expect(paymentLine).toContain("60.00")
    if (paymentMethod !== "CASH") {
      expect(text.split("\n").some((line) => line.trimStart().startsWith("CASH "))).toBe(false)
    }
  })
})
