import {
  assertPosKeypadLayoutComplete,
  getPosKeypadButtonIds,
  POS_KEYPAD_BUTTONS,
} from "@/lib/pos-ui/keypad-layout"

describe("pos-ui/keypad-layout", () => {
  it("includes all required function buttons", () => {
    const ids = new Set(getPosKeypadButtonIds())
    for (const id of [
      "worktime",
      "target-vs-sales",
      "collector",
      "logout",
      "order",
      "stock-count",
      "read-x",
      "read-z",
      "repair-ticket",
      "print-report",
      "checkout",
    ]) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it("uses a 7-column grid with 28 cells worth of placements", () => {
    expect(POS_KEYPAD_BUTTONS.length).toBeGreaterThanOrEqual(24)
    assertPosKeypadLayoutComplete()
  })
})
