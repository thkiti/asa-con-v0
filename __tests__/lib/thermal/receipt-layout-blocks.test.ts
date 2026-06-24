import {
  blockLinesToLegacyHeader,
  legacyFooterLinesToBlock,
  legacyHeaderLinesToBlock,
  mergeReceiptBlockMutation,
  resolveFooterBlockLines,
  resolveHeaderBlockLines,
  resolveSubHeaderBlockLines,
  splitReceiptBlockLines,
} from "@/lib/thermal/receipt-layout-blocks"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"

describe("receipt-layout-blocks", () => {
  it("combines legacy header lines without blank gaps", () => {
    const block = legacyHeaderLinesToBlock({
      headerLine1: "ASA SERVICES",
      headerLine2: null,
      headerLine3: "Line three",
    })
    expect(block).toBe("ASA SERVICES\nLine three")
  })

  it("skips empty header block lines when rendering", () => {
    const lines = resolveHeaderBlockLines({
      headerBlockText: "Line one\n\n  \nLine two",
      headerLine1: null,
      headerLine2: null,
      headerLine3: null,
    })
    expect(lines).toEqual(["Line one", "Line two"])
  })

  it("returns no footer lines when footer block is empty", () => {
    expect(
      resolveFooterBlockLines({
        footerBlockText: null,
        footerLine1: null,
        footerLine2: null,
        footerLine3: null,
        footerLine4: null,
        footerLine5: null,
      })
    ).toEqual([])
  })

  it("falls back to legacy footer lines when block text is absent", () => {
    const lines = resolveFooterBlockLines({
      footerBlockText: null,
      footerLine1: "Thanks",
      footerLine2: null,
      footerLine3: "Visit again",
      footerLine4: null,
      footerLine5: null,
    })
    expect(lines).toEqual(["Thanks", "Visit again"])
  })

  it("splitReceiptBlockLines preserves user line breaks and skips empties", () => {
    expect(splitReceiptBlockLines("A\nB\n\nC")).toEqual(["A", "B", "C"])
  })

  it("mergeReceiptBlockMutation syncs legacy lines and stores footer block text", () => {
    const merged = mergeReceiptBlockMutation({
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      headerBlockText: "One\nTwo\nThree\nFour",
      footerBlockText: "Footer A\nFooter B",
      headerFontSize: 14,
      footerFontSize: 10,
    })
    expect(merged.headerLine1).toBe("One")
    expect(merged.headerLine2).toBe("Two")
    expect(merged.headerLine3).toBe("Three")
    expect(merged.footerLine1).toBe("Footer A")
    expect(merged.footerLine2).toBe("Footer B")
    expect(merged.footerBlockText).toBe("Footer A\nFooter B")
    expect(merged.headerFontSize).toBe(14)
    expect(merged.footerFontSize).toBe(10)
  })

  it("clears footer when block and legacy lines are empty on save", () => {
    const merged = mergeReceiptBlockMutation({
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      footerBlockText: null,
      footerLine1: null,
      footerLine2: null,
      footerLine3: null,
      footerLine4: null,
      footerLine5: null,
    })
    expect(merged.footerBlockText).toBeNull()
    expect(merged.footerLine1).toBeNull()
  })

  it("blockLinesToLegacyHeader maps up to three lines", () => {
    expect(blockLinesToLegacyHeader(["A", "B"])).toEqual({
      headerLine1: "A",
      headerLine2: "B",
      headerLine3: null,
    })
  })

  it("uses stored block text only when footerBlockText is present", () => {
    expect(
      resolveFooterBlockLines({
        footerBlockText: "",
        footerLine1: "Legacy footer",
        footerLine2: null,
        footerLine3: null,
        footerLine4: null,
        footerLine5: null,
      })
    ).toEqual([])
  })

  it("legacyFooterLinesToBlock omits empty legacy fields", () => {
    expect(
      legacyFooterLinesToBlock({
        footerLine1: "A",
        footerLine2: "",
        footerLine3: null,
        footerLine4: "B",
        footerLine5: null,
      })
    ).toBe("A\nB")
  })

  it("resolveSubHeaderBlockLines uses block text when present", () => {
    expect(
      resolveSubHeaderBlockLines({
        subHeaderBlockText: "TAX INVOICE (ABB)\nLine two",
        showAbbreviatedTaxTitle: false,
      })
    ).toEqual(["TAX INVOICE (ABB)", "Line two"])
  })

  it("resolveSubHeaderBlockLines falls back to legacy tax title flag", () => {
    expect(
      resolveSubHeaderBlockLines({
        subHeaderBlockText: null,
        showAbbreviatedTaxTitle: true,
      })
    ).toEqual(["ใบกำกับภาษีอย่างย่อ"])
  })

  it("resolveSubHeaderBlockLines returns empty when block and flag are off", () => {
    expect(
      resolveSubHeaderBlockLines({
        subHeaderBlockText: "  \n",
        showAbbreviatedTaxTitle: false,
      })
    ).toEqual([])
  })
})
