import path from "path"

import {
  hookGroupFromFileName,
  parseReferenceCsvContent,
  parseReferenceCsvFile,
  parseReferenceCsvFiles,
} from "@/lib/import/parsers/reference-csv"

const fixtureDir = path.join(__dirname, "../../fixtures/import")

describe("reference csv parsing", () => {
  it("parses quoted CSV rows with hook group from filename", () => {
    const parsed = parseReferenceCsvContent(
      `"SupplierCode,Hook,Code,Group"\n"K.144,1,1010015,1019018"`,
      "kCode.csv"
    )

    expect(parsed.rows).toEqual([
      {
        hookGroup: "K",
        hookNo: 1,
        supplierCode: "K.144",
        productCode: "0101001",
        productGroup: "0101901",
        sourceFile: "kCode.csv",
      },
    ])
  })

  it("derives hook group prefix from file name", () => {
    expect(hookGroupFromFileName("cCode.csv")).toBe("C")
    expect(hookGroupFromFileName("mCode.csv")).toBe("M")
  })

  it("loads fixture CSV files from disk", () => {
    const parsed = parseReferenceCsvFile(path.join(fixtureDir, "kCode.csv"))
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.missingFile).toBe(false)
  })
})

describe("missing oCode.csv does not fail", () => {
  it("warns and continues when optional oCode.csv is absent", () => {
    const parsed = parseReferenceCsvFiles(fixtureDir, [
      { fileName: "kCode.csv", hookGroup: "K" },
      { fileName: "oCode.csv", hookGroup: "O", optional: true },
    ])

    expect(parsed.errors).toHaveLength(0)
    expect(parsed.warnings.some((warning) => warning.includes("oCode.csv"))).toBe(
      true
    )
    expect(parsed.rows.length).toBeGreaterThan(0)
  })
})
