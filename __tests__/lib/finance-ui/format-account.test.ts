import {
  formatAccountDisplay,
  ACCOUNT_DISPLAY_BULLET,
  ACCOUNT_DISPLAY_SEPARATOR,
  FINANCE_ACCOUNT_CODE_WIDTH,
  FINANCE_ACCOUNT_CODE_SLOT_CHARS,
} from "@/lib/finance-ui/format-account"

describe("formatAccountDisplay", () => {
  it("joins code and name with spaced bullet separator", () => {
    expect(ACCOUNT_DISPLAY_SEPARATOR).toBe(` ${ACCOUNT_DISPLAY_BULLET} `)
    expect(formatAccountDisplay("101", "สำรองตามกฎหมาย")).toBe(
      `101${ACCOUNT_DISPLAY_SEPARATOR}สำรองตามกฎหมาย`
    )
  })

  it("returns em dash when both empty", () => {
    expect(formatAccountDisplay("", "")).toBe("—")
  })

  it("returns code or name alone when one side missing", () => {
    expect(formatAccountDisplay("1021", "")).toBe("1021")
    expect(formatAccountDisplay("", "Cash")).toBe("Cash")
  })
})

describe("FINANCE_ACCOUNT_CODE_WIDTH", () => {
  it("reserves fixed 8-character slot for hierarchy growth (not data-driven)", () => {
    expect(FINANCE_ACCOUNT_CODE_SLOT_CHARS).toBe(8)
    expect(FINANCE_ACCOUNT_CODE_WIDTH).toBe("8ch")
  })
})
