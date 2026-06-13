import {
  getPosActionKind,
  getPosPlaceholderTitle,
  isPosPlaceholderId,
  isPrintReportHighlighted,
  keypadDigitChar,
  shouldGhostPrintReportButton,
} from "@/lib/pos-ui/pos-actions"

describe("pos-ui/pos-actions", () => {
  it("classifies wired navigation and refund actions", () => {
    expect(getPosActionKind("refund")).toBe("wire-refund")
    expect(getPosActionKind("order")).toBe("wire-nav")
    expect(getPosActionKind("stock-count")).toBe("wire-nav")
    expect(getPosActionKind("target-vs-sales")).toBe("wire-target-vs-sales")
    expect(getPosActionKind("worktime")).toBe("wire-worktime")
  })

  it("classifies logout as wire-logout", () => {
    expect(getPosActionKind("logout")).toBe("wire-logout")
  })

  it("classifies checkout and POS report actions", () => {
    expect(getPosActionKind("checkout")).toBe("wire-checkout")
    expect(getPosActionKind("collector")).toBe("wire-collector")
    expect(getPosActionKind("repair-ticket")).toBe("wire-repair-ticket")
    expect(getPosActionKind("read-x")).toBe("wire-read-x")
    expect(getPosActionKind("read-z")).toBe("wire-read-z")
    expect(getPosActionKind("staff-evidence")).toBe("wire-staff-evidence")
    expect(getPosActionKind("print-report")).toBe("wire-print-report")
    expect(isPosPlaceholderId("read-x")).toBe(false)
  })

  it("maps digit keys to characters", () => {
    expect(keypadDigitChar("digit-5")).toBe("5")
    expect(keypadDigitChar("digit-dot")).toBe(".")
    expect(keypadDigitChar("logout")).toBeNull()
  })

  it("provides human titles for placeholder ids", () => {
    expect(getPosPlaceholderTitle("worktime")).toBe("Worktime In/Out")
  })

  it("highlights print only for Z and COLLECT reports", () => {
    expect(isPrintReportHighlighted("Z")).toBe(true)
    expect(isPrintReportHighlighted("COLLECT")).toBe(true)
    expect(isPrintReportHighlighted("X")).toBe(false)
    expect(isPrintReportHighlighted(null)).toBe(false)
  })

  it("ghosts print when side muted or READ X is open", () => {
    expect(
      shouldGhostPrintReportButton({ sideMuted: true, readReportMode: "Z" })
    ).toBe(true)
    expect(
      shouldGhostPrintReportButton({ sideMuted: false, readReportMode: "X" })
    ).toBe(true)
    expect(
      shouldGhostPrintReportButton({ sideMuted: false, readReportMode: "Z" })
    ).toBe(false)
  })
})
