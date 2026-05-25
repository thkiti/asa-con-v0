import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..", "..", "..")

const REPORTING_FILES = [
  "lib/reporting/composite.ts",
  "lib/reporting/date-range.ts",
  "lib/reporting/index.ts",
  "lib/reporting/report-errors.ts",
  "lib/reporting/report-types.ts",
  "lib/stock/stock-summary.ts",
  "lib/stock/summary.ts",
  "lib/stock/valuation.ts",
  "lib/stock/movement-report.ts",
  "lib/pos/sales-summary.ts",
]

const FORBIDDEN = [
  /\.\$transaction\b/,
  /\.\$executeRaw\b/,
  /\.\$executeRawUnsafe\b/,
  /\.\$queryRawUnsafe\b/,
  /\bcreate\s*\(/,
  /\bcreateMany\s*\(/,
  /\bupdate\s*\(/,
  /\bupdateMany\s*\(/,
  /\bupsert\s*\(/,
  /\bdelete\s*\(/,
  /\bdeleteMany\s*\(/,
]

describe("reporting read-only sources", () => {
  it("does not call prisma write APIs in reporting kernel files", () => {
    for (const rel of REPORTING_FILES) {
      const abs = path.join(ROOT, rel)
      const source = fs.readFileSync(abs, "utf8")
      for (const pattern of FORBIDDEN) {
        expect({ file: rel, pattern: pattern.toString() }).toEqual(
          expect.objectContaining({ file: rel })
        )
        expect(source.match(pattern)).toBeNull()
      }
    }
  })
})
