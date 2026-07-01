import type { GlAccountListRow } from "@/lib/finance/gl-account-list"
import {
  filterAndSortGlAccountsForInquiry,
  glAccountInquiryMatchRank,
  isNumericOnlyGlAccountSearch,
} from "@/lib/finance-ui/gl-account-inquiry-search"

const sampleAccounts: GlAccountListRow[] = [
  row("1161", "ลูกหนี้อื่น"),
  row("1306", "สินค้าคงเหลือ"),
  row("1461", "ค่าใช้จ่ายจ่ายล่วงหน้า"),
  row("2236", "เจ้าหนี้อื่น"),
  row("2261", "ภาษีหัก ณ ที่จ่าย"),
  row("6003", "ต้นทุนขาย-วัสดุรองเท้า"),
  row("6100", "ค่าใช้จ่ายในการขาย"),
  row("6200", "ค่าใช้จ่ายในการบริหาร"),
  row("1021001", "เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266"),
]

function row(code: string, name: string): GlAccountListRow {
  return {
    id: `id-${code}`,
    code,
    name,
    accountType: "EXPENSE",
    parentId: null,
    parentCode: null,
    parentName: null,
    isActive: true,
    deleted: false,
    hasJournalLines: false,
    childCount: 0,
  }
}

describe("gl-account-inquiry-search", () => {
  it("treats digit-only input as numeric code-prefix search", () => {
    expect(isNumericOnlyGlAccountSearch("6")).toBe(true)
    expect(isNumericOnlyGlAccountSearch("60")).toBe(true)
    expect(isNumericOnlyGlAccountSearch("ต้นทุน")).toBe(false)
  })

  it('typing "6" returns only codes starting with 6', () => {
    const result = filterAndSortGlAccountsForInquiry(sampleAccounts, "6")
    expect(result.map((row) => row.code)).toEqual(["6003", "6100", "6200"])
  })

  it('typing "6" does not return 1161, 1306, 1461, 2236, 2261', () => {
    const result = filterAndSortGlAccountsForInquiry(sampleAccounts, "6")
    const codes = result.map((row) => row.code)
    expect(codes).not.toContain("1161")
    expect(codes).not.toContain("1306")
    expect(codes).not.toContain("1461")
    expect(codes).not.toContain("2236")
    expect(codes).not.toContain("2261")
  })

  it('typing "60" returns only codes starting with 60', () => {
    const accounts = [
      row("6003", "ต้นทุนขาย-วัสดุรองเท้า"),
      row("6010", "ต้นทุนอื่น"),
      row("6100", "ค่าใช้จ่ายในการขาย"),
    ]
    const result = filterAndSortGlAccountsForInquiry(accounts, "60")
    expect(result.map((row) => row.code)).toEqual(["6003", "6010"])
    expect(result.map((row) => row.code)).not.toContain("6100")
  })

  it("typing Thai account name filters by name contains", () => {
    const result = filterAndSortGlAccountsForInquiry(sampleAccounts, "วัสดุรองเท้า")
    expect(result.map((row) => row.code)).toEqual(["6003"])
  })

  it("ranks exact code match before startsWith for numeric search", () => {
    const accounts = [
      row("1021001", "เงินฝากธนาคาร"),
      row("102", "เงินสดย่อย"),
      row("9999", "บัญชี legacy 102"),
    ]
    const ranked = filterAndSortGlAccountsForInquiry(accounts, "102")
    expect(ranked.map((row) => row.code)).toEqual(["102", "1021001"])
    expect(glAccountInquiryMatchRank(accounts[1], "102")).toBe(0)
    expect(glAccountInquiryMatchRank(accounts[0], "102")).toBe(1)
    expect(glAccountInquiryMatchRank(accounts[2], "102")).toBeNull()
  })

  it("ranks name contains after code matches for text search", () => {
    const accounts = [
      row("1021001", "เงินฝากธนาคาร"),
      row("102", "เงินสดย่อย"),
      row("9999", "บัญชี legacy 102"),
    ]
    const ranked = filterAndSortGlAccountsForInquiry(accounts, "legacy")
    expect(ranked.map((row) => row.code)).toEqual(["9999"])
    expect(glAccountInquiryMatchRank(accounts[2], "legacy")).toBe(2)
  })

  it("does not rank code contains ahead of startsWith for numeric search", () => {
    expect(glAccountInquiryMatchRank(row("1161", "x"), "6")).toBeNull()
    expect(glAccountInquiryMatchRank(row("6003", "x"), "6")).toBe(1)
  })
})
