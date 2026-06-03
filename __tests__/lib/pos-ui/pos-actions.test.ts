import {
  getPosActionKind,
  getPosPlaceholderTitle,
  isPosPlaceholderId,
  keypadDigitChar,
} from "@/lib/pos-ui/pos-actions"

describe("pos-ui/pos-actions", () => {
  it("classifies wired navigation actions", () => {
    expect(getPosActionKind("order")).toBe("wire-nav")
    expect(getPosActionKind("stock-count")).toBe("wire-nav")
  })

  it("classifies logout as wire-logout", () => {
    expect(getPosActionKind("logout")).toBe("wire-logout")
  })

  it("classifies checkout and reports as placeholder", () => {
    expect(getPosActionKind("checkout")).toBe("placeholder")
    expect(getPosActionKind("read-x")).toBe("placeholder")
    expect(isPosPlaceholderId("checkout")).toBe(true)
  })

  it("does not wire checkout", () => {
    expect(getPosActionKind("checkout")).not.toBe("wire-nav")
  })

  it("maps digit keys to characters", () => {
    expect(keypadDigitChar("digit-5")).toBe("5")
    expect(keypadDigitChar("digit-dot")).toBe(".")
    expect(keypadDigitChar("logout")).toBeNull()
  })

  it("provides human titles for placeholders", () => {
    expect(getPosPlaceholderTitle("worktime")).toBe("Worktime In/Out")
    expect(getPosPlaceholderTitle("checkout")).toBe("Checkout")
  })
})
