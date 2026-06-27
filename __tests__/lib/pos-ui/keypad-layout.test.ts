import {
  assertPosKeypadLayoutComplete,
  getPosKeypadButtonIds,
  getPosKeypadButtonPlacement,
  POS_KEYPAD_COL_COUNT,
  POS_KEYPAD_DOCUMENTS_COLUMN,
  POS_KEYPAD_MESSAGE_SLOT,
  POS_KEYPAD_NUMERIC_CONTROL_COLUMN,
  POS_KEYPAD_NUMERIC_FIRST_COLUMN,
  POS_KEYPAD_PLACEHOLDER_CELLS,
  POS_KEYPAD_ROW_COUNT,
  POS_KEYPAD_SHOP_TOOLS_COLUMN,
  POS_KEYPAD_SHOP_TOOLS_TOP_SLOT,
  POS_KEYPAD_STAFF_COLUMN,
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
      "receipt-lookup",
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

  it("places shop tools in col 2 between staff and numeric keypad", () => {
    expect(POS_KEYPAD_ROW_COUNT).toBe(5)
    expect(POS_KEYPAD_COL_COUNT).toBe(7)
    expect(POS_KEYPAD_STAFF_COLUMN).toBe(1)
    expect(POS_KEYPAD_SHOP_TOOLS_COLUMN).toBe(2)
    expect(POS_KEYPAD_NUMERIC_FIRST_COLUMN).toBe(3)
    expect(POS_KEYPAD_NUMERIC_CONTROL_COLUMN).toBe(6)
    expect(POS_KEYPAD_DOCUMENTS_COLUMN).toBe(7)
    expect(POS_KEYPAD_BUTTONS.length).toBeGreaterThanOrEqual(24)
    assertPosKeypadLayoutComplete()

    expect(getPosKeypadButtonPlacement("worktime")).toMatchObject({ col: 1, row: 1 })
    expect(getPosKeypadButtonPlacement("target-vs-sales")).toMatchObject({ col: 1, row: 2 })
    expect(getPosKeypadButtonPlacement("collector")).toMatchObject({ col: 1, row: 3 })
    expect(getPosKeypadButtonPlacement("logout")).toMatchObject({ col: 1, row: 4 })

    expect(POS_KEYPAD_SHOP_TOOLS_TOP_SLOT).toEqual({ col: 2, row: 1 })
    expect(getPosKeypadButtonPlacement("staff-evidence")).toMatchObject({ col: 2, row: 1 })
    expect(getPosKeypadButtonPlacement("print-report")).toMatchObject({ col: 2, row: 1 })
    expect(getPosKeypadButtonPlacement("order")).toMatchObject({ col: 2, row: 2 })
    expect(getPosKeypadButtonPlacement("stock-count")).toMatchObject({ col: 2, row: 3 })
    expect(getPosKeypadButtonPlacement("repair-ticket")).toMatchObject({ col: 2, row: 4 })

    expect(getPosKeypadButtonPlacement("digit-7")).toMatchObject({ col: 3, row: 1 })
    expect(getPosKeypadButtonPlacement("digit-9")).toMatchObject({ col: 5, row: 1 })
    expect(getPosKeypadButtonPlacement("backspace")).toMatchObject({ col: 6, row: 1 })
    expect(getPosKeypadButtonPlacement("enter")).toMatchObject({ col: 6, row: 3, rowSpan: 2 })

    expect(getPosKeypadButtonPlacement("read-x")).toMatchObject({ col: 7, row: 1 })
    expect(getPosKeypadButtonPlacement("read-z")).toMatchObject({ col: 7, row: 2 })
    expect(getPosKeypadButtonPlacement("refund")).toMatchObject({ col: 7, row: 3 })
    expect(getPosKeypadButtonPlacement("receipt-lookup")).toMatchObject({ col: 7, row: 4 })

    expect(getPosKeypadButtonPlacement("checkout")).toMatchObject({
      col: 6,
      row: 5,
      colSpan: 2,
    })
    expect(POS_KEYPAD_PLACEHOLDER_CELLS).toEqual([{ col: 2, row: 1 }])
    expect(POS_KEYPAD_MESSAGE_SLOT).toEqual({ col: 1, row: 5, colSpan: 5 })
  })
})
