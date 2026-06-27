import {
  READ_Z_GROUP_TABLE_HEADER_LABEL,
  formatReadZGroupCodeForDisplay,
  formatReadZGroupDisplayLeft,
} from "@/lib/thermal/read-z-group-display"

describe("read-z-group-display", () => {
  it("shortens group code by removing last 3 characters", () => {
    expect(formatReadZGroupCodeForDisplay("0101901")).toBe("0101")
    expect(formatReadZGroupCodeForDisplay("0102901")).toBe("0102")
    expect(formatReadZGroupCodeForDisplay("4100900")).toBe("4100")
    expect(formatReadZGroupCodeForDisplay("010")).toBe("010")
    expect(formatReadZGroupCodeForDisplay("")).toBe("")
  })

  it("formats displayLeft with shortened code and preserved name", () => {
    expect(formatReadZGroupDisplayLeft("0101901-Home Small")).toBe("0101-Home Small")
    expect(formatReadZGroupDisplayLeft("5100900-Ladies Heels")).toBe("5100-Ladies Heels")
  })

  it("uses the READ Z table header label", () => {
    expect(READ_Z_GROUP_TABLE_HEADER_LABEL).toBe("Group Code • Name")
  })
})
