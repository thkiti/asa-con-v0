import { applyMarkupThenRound, roundToStep } from "@/lib/pricing/apply-markup-rounding"
import { defaultRoundingModeForClass } from "@/lib/pricing/rounding-defaults"

describe("roundToStep CENT_05", () => {
  const cent05 = (base: number) =>
    applyMarkupThenRound({
      baseCost: base,
      markupPercent: 0,
      roundingMode: "CENT_05",
    }).toString()

  it("rounds 4.71 to 4.70", () => {
    expect(cent05(4.71)).toBe("4.7")
  })

  it("rounds 4.72 to 4.70", () => {
    expect(cent05(4.72)).toBe("4.7")
  })

  it("rounds 4.73 to 4.75", () => {
    expect(cent05(4.73)).toBe("4.75")
  })

  it("rounds 4.74 to 4.75", () => {
    expect(cent05(4.74)).toBe("4.75")
  })

  it("rounds 4.725 to 4.75", () => {
    expect(cent05(4.725)).toBe("4.75")
  })
})

describe("applyMarkupThenRound modes", () => {
  it("CENT_01 rounds to nearest 0.01", () => {
    const result = applyMarkupThenRound({
      baseCost: 100,
      markupPercent: 0.05,
      roundingMode: "CENT_01",
    })
    expect(result.toString()).toBe("105")
  })

  it("BAHT_10 rounds to nearest 10 baht", () => {
    const result = applyMarkupThenRound({
      baseCost: 10006,
      markupPercent: 0,
      roundingMode: "BAHT_10",
    })
    expect(result.toString()).toBe("10010")
  })

  it("BAHT_100 rounds to nearest 100 baht", () => {
    const result = applyMarkupThenRound({
      baseCost: 10700,
      markupPercent: 0,
      roundingMode: "BAHT_100",
    })
    expect(result.toString()).toBe("10700")
  })

  it("NONE leaves markup result unrounded", () => {
    const result = applyMarkupThenRound({
      baseCost: 10,
      markupPercent: 0.055,
      roundingMode: "NONE",
    })
    expect(result.toString()).toBe("10.55")
  })
})

describe("defaultRoundingModeForClass", () => {
  it("MATERIAL defaults to CENT_05", () => {
    expect(defaultRoundingModeForClass("MATERIAL")).toBe("CENT_05")
  })

  it("MACHINERY defaults to BAHT_10", () => {
    expect(defaultRoundingModeForClass("MACHINERY")).toBe("BAHT_10")
  })

  it("CONSUMABLE defaults to CENT_01", () => {
    expect(defaultRoundingModeForClass("CONSUMABLE")).toBe("CENT_01")
  })
})

describe("roundToStep", () => {
  it("rounds to 0.05 step", () => {
    const { toDec } = jest.requireActual("@/lib/stock/decimal")
    expect(roundToStep(toDec("4.73"), "0.05").toString()).toBe("4.75")
  })
})
