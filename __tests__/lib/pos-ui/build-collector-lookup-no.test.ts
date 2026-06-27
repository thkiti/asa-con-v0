import {
  buildCollectorLookupNo,
  parseCollectorRunningSeq,
} from "@/lib/pos-ui/build-collector-lookup-no"

describe("buildCollectorLookupNo", () => {
  it("builds COL number from branch, year, month, and running", () => {
    expect(buildCollectorLookupNo("SH001", 2026, 6, "3")).toBe(
      "COL-SH001-202606-0003"
    )
    expect(buildCollectorLookupNo("SH001", 2026, 6, "0003")).toBe(
      "COL-SH001-202606-0003"
    )
  })

  it("returns null when inputs are invalid", () => {
    expect(buildCollectorLookupNo("", 2026, 6, "1")).toBeNull()
    expect(buildCollectorLookupNo("SH001", 2026, 6, "")).toBeNull()
  })
})

describe("parseCollectorRunningSeq", () => {
  it("extracts running sequence from collect number", () => {
    expect(parseCollectorRunningSeq("COL-SH001-202606-0003")).toBe("0003")
    expect(parseCollectorRunningSeq("invalid")).toBeNull()
  })
})
