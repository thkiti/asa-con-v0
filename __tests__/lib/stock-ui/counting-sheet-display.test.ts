import { formatHookNumber } from "@/lib/stock-ui/counting-sheet-display"

describe("formatHookNumber", () => {
  it("returns hook number only (ignores K. prefix labels used elsewhere)", () => {
    expect(formatHookNumber({ hookNo: 10 })).toBe("10")
    expect(formatHookNumber({ hookNo: 1 })).toBe("1")
  })

  it("returns em dash when hookNo is null", () => {
    expect(formatHookNumber({ hookNo: null })).toBe("—")
  })

  it("returns em dash when hookNo is undefined", () => {
    expect(formatHookNumber({})).toBe("—")
  })

  it("stringifies zero hook number", () => {
    expect(formatHookNumber({ hookNo: 0 })).toBe("0")
  })
})
