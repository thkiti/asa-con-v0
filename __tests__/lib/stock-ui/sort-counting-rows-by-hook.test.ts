import { sortCountingRowsByHookNo } from "@/lib/stock-ui/sort-counting-rows-by-hook"

describe("sortCountingRowsByHookNo", () => {
  it("sorts hook numbers ascending numerically", () => {
    const rows = [
      { key: "a", hookNo: 10 },
      { key: "b", hookNo: 2 },
      { key: "c", hookNo: 100 },
      { key: "d", hookNo: 1 },
    ]

    expect(sortCountingRowsByHookNo(rows).map((r) => r.hookNo)).toEqual([
      1, 2, 10, 100,
    ])
  })

  it("places null hook numbers last", () => {
    const rows = [
      { key: "a", hookNo: null },
      { key: "b", hookNo: 3 },
      { key: "c", hookNo: undefined },
      { key: "d", hookNo: 1 },
    ]

    const sorted = sortCountingRowsByHookNo(rows)
    expect(sorted.map((r) => r.key)).toEqual(["d", "b", "a", "c"])
  })

  it("preserves stable order for equal hook numbers", () => {
    const rows = [
      { key: "first", hookNo: 5 },
      { key: "second", hookNo: 5 },
      { key: "third", hookNo: 5 },
    ]

    expect(sortCountingRowsByHookNo(rows).map((r) => r.key)).toEqual([
      "first",
      "second",
      "third",
    ])
  })
})
