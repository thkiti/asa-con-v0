import {
  getPosActionKind,
  getPosPlaceholderTitle,
  isPosPlaceholderId,
  keypadDigitChar,
} from "@/lib/pos-ui/pos-actions"

describe("pos-ui/pos-actions", () => {
  it("classifies wired navigation and refund actions", () => {
    expect(getPosActionKind("refund")).toBe("wire-refund")
    expect(getPosActionKind("stock-count")).toBe("wire-nav")
    expect(getPosActionKind("target-vs-sales")).toBe("wire-target-vs-sales")
    expect(getPosActionKind("worktime")).toBe("wire-worktime")
  })

  it("classifies logout as wire-logout", () => {
    expect(getPosActionKind("logout")).toBe("wire-logout")
  })

  it("classifies checkout as wire-checkout and reports as placeholder", () => {
    expect(getPosActionKind("checkout")).toBe("wire-checkout")
    expect(getPosActionKind("read-x")).toBe("placeholder")
    expect(isPosPlaceholderId("checkout")).toBe(false)
    expect(isPosPlaceholderId("target-vs-sales")).toBe(false)
    expect(isPosPlaceholderId("worktime")).toBe(false)
  })

  it("maps digit keys to characters", () => {
    expect(keypadDigitChar("digit-5")).toBe("5")
    expect(keypadDigitChar("digit-dot")).toBe(".")
    expect(keypadDigitChar("logout")).toBeNull()
  })

  it("provides human titles for placeholders", () => {
    expect(getPosPlaceholderTitle("worktime")).toBe("Worktime In/Out")
  })
})
