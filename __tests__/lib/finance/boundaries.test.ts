import fs from "fs"
import path from "path"
import { scanForbiddenPatterns } from "../../../scripts/audit/lib/scan"
import { FINANCE_KERNEL_NO_STOCK } from "../../../scripts/audit/lib/rules"

// Audit scripts in scripts/audit/ mirror these boundary tests; keep both in sync.

const ROOT = path.join(__dirname, "..", "..", "..")
const FINANCE_DIR = path.join(ROOT, "lib", "finance")

function listFinanceTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFinanceTsFiles(abs))
    else if (entry.name.endsWith(".ts")) out.push(abs)
  }
  return out
}

describe("finance boundary grep audit", () => {
  const files = listFinanceTsFiles(FINANCE_DIR)

  it("has no stock mutation calls", () => {
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8")
      const rel = path.relative(ROOT, file).replace(/\\/g, "/")
      const hits = scanForbiddenPatterns(
        source,
        FINANCE_KERNEL_NO_STOCK.pattern,
        FINANCE_KERNEL_NO_STOCK.id,
        rel
      )
      expect(hits).toEqual([])
    }
  })

  it("has no sale writes", () => {
    const pattern = /sale\.(create|update|upsert|delete)/
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8")
      expect(source.match(pattern)).toBeNull()
    }
  })

  it("posting inner modules avoid nested $transaction", () => {
    const inner = ["posting.ts", "voucher.ts", "journal.ts", "account-map.ts", "validation.ts"]
    for (const name of inner) {
      const source = fs.readFileSync(path.join(FINANCE_DIR, name), "utf8")
      expect(source).not.toMatch(/\.\$transaction\b/)
    }
  })

  it("has no React or NextResponse imports", () => {
    const pattern = /from ['"]react['"]|NextResponse|next\/server/
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8")
      expect(source.match(pattern)).toBeNull()
    }
  })
})