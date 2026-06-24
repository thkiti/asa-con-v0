import {
  DEFAULT_RECEIPT_BLOCK_FONT_PX,
  normalizeReceiptBlockFontPx,
  stepReceiptBlockFontPx,
} from "@/lib/thermal/receipt-block-font-size"

describe("receipt-block-font-size", () => {
  it("normalizes legacy enum values to px", () => {
    expect(normalizeReceiptBlockFontPx("small")).toBe(10)
    expect(normalizeReceiptBlockFontPx("normal")).toBe(12)
    expect(normalizeReceiptBlockFontPx("large")).toBe(14)
  })

  it("normalizes numeric storage strings", () => {
    expect(normalizeReceiptBlockFontPx("15")).toBe(15)
    expect(normalizeReceiptBlockFontPx(16)).toBe(16)
  })

  it("steps font size by 1px without preset clamp", () => {
    let px = DEFAULT_RECEIPT_BLOCK_FONT_PX
    for (let i = 0; i < 5; i += 1) {
      px = stepReceiptBlockFontPx(px, "increase")
    }
    expect(px).toBe(17)

    for (let i = 0; i < 20; i += 1) {
      px = stepReceiptBlockFontPx(px, "increase")
    }
    expect(px).toBe(37)
  })

  it("does not go below 1px", () => {
    expect(stepReceiptBlockFontPx(1, "decrease")).toBe(1)
  })
})
