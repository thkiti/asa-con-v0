import { formatShopBranchCode } from "@/lib/import/validation/branch-code"
import { decodeTis620 } from "@/lib/import/tis620"

describe("branch mapping", () => {
  it("formats shop branch code as SH-{S_ID}", () => {
    expect(formatShopBranchCode("001")).toBe("SH001")
    expect(formatShopBranchCode(12)).toBe("SH012")
  })

  it("returns empty code for blank S_ID", () => {
    expect(formatShopBranchCode("")).toBe("")
    expect(formatShopBranchCode(null)).toBe("")
  })

  it("decodes TIS-620 Thai text from binary buffer input", () => {
    const encoded = Buffer.from([0xb9, 0xf7, 0xb9, 0xe9, 0xcd, 0xc1, 0xcb])
    expect(decodeTis620(encoded)).toBeTruthy()
  })
})
