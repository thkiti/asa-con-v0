import fs from "fs"
import path from "path"
import { parseGlAccountCsv } from "@/lib/finance/gl-account-csv-parser"
import { GlAccountImportError } from "@/lib/finance/gl-account-import-errors"

const fixtureDir = path.join(__dirname, "../../fixtures/finance")

describe("parseGlAccountCsv", () => {
  it("parses valid fixture", () => {
    const content = fs.readFileSync(
      path.join(fixtureDir, "coa-import-valid.csv"),
      "utf8"
    )
    const result = parseGlAccountCsv(content)
    expect(result.errors).toHaveLength(0)
    expect(result.rows).toHaveLength(4)
    expect(result.rows[1]?.accountCode).toBe("1100")
    expect(result.rows[1]?.parentAccountCode).toBe("1000")
  })

  it("rejects missing header", () => {
    expect(() => parseGlAccountCsv("accountCode,accountName\n1100,Cash")).toThrow(
      GlAccountImportError
    )
  })

  it("rejects normal balance mismatch", () => {
    const csv = `accountCode,accountName,accountType,normalBalance
1100,Cash,ASSET,CREDIT`
    const result = parseGlAccountCsv(csv)
    expect(result.errors.some((e) => e.code === "NORMAL_BALANCE_TYPE_MISMATCH")).toBe(
      true
    )
  })

  it("strips BOM", () => {
    const csv =
      "\uFEFFaccountCode,accountName,accountType,normalBalance\n1100,Cash,ASSET,DEBIT"
    const result = parseGlAccountCsv(csv)
    expect(result.rows).toHaveLength(1)
  })
})
