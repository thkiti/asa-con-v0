import { mergeRefundLayoutFromReceipt, resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"

describe("resolveThermalLayout", () => {
  it("REFUND inherits empty header/footer from RECEIPT", () => {
    const layouts = {
      ...DEFAULT_THERMAL_LAYOUTS,
      RECEIPT: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerLine1: "ASA SERVICES",
        footerLine1: "Thank you",
      },
      REFUND: {
        ...DEFAULT_THERMAL_LAYOUTS.REFUND,
        headerLine1: null,
        footerLine1: null,
      },
    }

    const resolved = resolveThermalLayout("REFUND", layouts)
    expect(resolved.headerLine1).toBe("ASA SERVICES")
    expect(resolved.footerLine1).toBe("Thank you")
  })

  it("REFUND override wins when non-empty", () => {
    const layouts = {
      ...DEFAULT_THERMAL_LAYOUTS,
      RECEIPT: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerLine1: "ASA SERVICES",
        footerLine1: "Thank you",
      },
      REFUND: {
        ...DEFAULT_THERMAL_LAYOUTS.REFUND,
        headerLine1: "REFUND ONLY HEADER",
        footerLine1: null,
      },
    }

    const resolved = resolveThermalLayout("REFUND", layouts)
    expect(resolved.headerLine1).toBe("REFUND ONLY HEADER")
    expect(resolved.footerLine1).toBe("Thank you")
  })

  it("mergeRefundLayoutFromReceipt is explicit", () => {
    const merged = mergeRefundLayoutFromReceipt(
      {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerLine2: "Receipt line 2",
        footerLine3: "Footer 3",
      },
      DEFAULT_THERMAL_LAYOUTS.REFUND
    )
    expect(merged.headerLine2).toBe("Receipt line 2")
    expect(merged.footerLine3).toBe("Footer 3")
  })

  it("REFUND inherits sub-header block from RECEIPT when empty", () => {
    const layouts = {
      ...DEFAULT_THERMAL_LAYOUTS,
      RECEIPT: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        subHeaderBlockText: "TAX INVOICE (ABB)",
        subHeaderFontSize: 14,
        subHeaderBlockBold: false,
      },
      REFUND: {
        ...DEFAULT_THERMAL_LAYOUTS.REFUND,
        subHeaderBlockText: null,
      },
    }

    const resolved = resolveThermalLayout("REFUND", layouts)
    expect(resolved.subHeaderBlockText).toBe("TAX INVOICE (ABB)")
    expect(resolved.subHeaderFontSize).toBe(14)
    expect(resolved.subHeaderBlockBold).toBe(false)
  })
})
