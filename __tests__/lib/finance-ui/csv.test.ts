import {
  escapeCsvCell,
  rowsToCsvTable,
  sortByStableKey,
} from "@/lib/finance-ui/csv"

describe("csv helpers", () => {
  it("escapes quotes in cells", () => {
    expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""')
  })

  it("builds header-only table for empty rows", () => {
    expect(rowsToCsvTable(["a", "b"], [])).toBe('"a","b"')
  })

  it("sorts by stable key", () => {
    const sorted = sortByStableKey(
      [{ id: "b" }, { id: "a" }],
      (row) => row.id
    )
    expect(sorted.map((row) => row.id)).toEqual(["a", "b"])
  })
})
