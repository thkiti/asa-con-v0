import {
  assertPosKeypadLayoutComplete,
  getPosKeypadButtonIds,
  getPosKeypadButtonPlacement,
  POS_KEYPAD_COL_COUNT,
  POS_KEYPAD_MESSAGE_SLOT,
  POS_KEYPAD_PLACEHOLDER_CELLS,
  POS_KEYPAD_ROW_COUNT,
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
      "refund",
      "order",
      "stock-count",
      "read-x",
      "read-z",
      "staff-evidence",
      "repair-ticket",
      "print-report",
      "checkout",
    ]) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it("uses a 7-column 5-row grid with locked action stack", () => {
    expect(POS_KEYPAD_ROW_COUNT).toBe(5)
    expect(POS_KEYPAD_COL_COUNT).toBe(7)
    expect(POS_KEYPAD_BUTTONS.length).toBeGreaterThanOrEqual(24)
    assertPosKeypadLayoutComplete()

    expect(getPosKeypadButtonPlacement("order")).toMatchObject({ col: 6, row: 2 })
    expect(getPosKeypadButtonPlacement("stock-count")).toMatchObject({ col: 6, row: 3 })
    expect(getPosKeypadButtonPlacement("repair-ticket")).toMatchObject({
      col: 6,
      row: 4,
    })
    expect(getPosKeypadButtonPlacement("checkout")).toMatchObject({
      col: 6,
      row: 5,
      colSpan: 2,
    })
    expect(getPosKeypadButtonPlacement("read-x")).toMatchObject({ col: 7, row: 1 })
    expect(getPosKeypadButtonPlacement("read-z")).toMatchObject({ col: 7, row: 2 })
    expect(getPosKeypadButtonPlacement("staff-evidence")).toMatchObject({
      col: 7,
      row: 3,
      multiline: true,
    })
    expect(getPosKeypadButtonPlacement("print-report")).toMatchObject({
      col: 7,
      row: 4,
    })
    expect(POS_KEYPAD_PLACEHOLDER_CELLS).toEqual([])
    expect(POS_KEYPAD_MESSAGE_SLOT).toEqual({ col: 1, row: 5, colSpan: 5 })
  })
})
