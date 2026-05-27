import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..", "..", "..")
const FINANCE_DIR = path.join(ROOT, "lib", "finance")

const RECON_FILES = [
  "reconciliation.ts",
  "reconciliation-types.ts",
  "reconciliation-errors.ts",
  "close-policy.ts",
  "reconciliation-issue-rows.ts",
  "reconciliation-dashboard-rows.ts",
  "reconciliation-snapshot-capture.ts",
  "reconciliation-snapshot.ts",
  "reconciliation-snapshot-errors.ts",
]

function readSource(name: string): string {
  return fs.readFileSync(path.join(FINANCE_DIR, name), "utf8")
}

describe("reconciliation boundary grep audit", () => {
  for (const name of RECON_FILES) {
    describe(name, () => {
      const source = readSource(name)

      it("has no stock mutation calls", () => {
        const pattern =
          /issueStock\s*\(|receiveStock\s*\(|\.stock\.(update|create|upsert|delete)|stockLayer\.|stockTransaction\.create/
        expect(source.match(pattern)).toBeNull()
      })

      it("has no sale or payment writes", () => {
        const pattern =
          /\.sale\.(create|update|upsert|delete)|\.saleItem\.|\.payment\.(create|update)|sale\.create|postSaleVoucher|postDocument|issueStock/
        expect(source.match(pattern)).toBeNull()
      })

      it("has no voucher or journal creates", () => {
        const pattern =
          /postOperationalVoucher|postSaleVoucher|voucher\.create|journalEntry\.create/
        expect(source.match(pattern)).toBeNull()
      })

      it("has no nested $transaction", () => {
        expect(source).not.toMatch(/\.\$transaction\b/)
      })

      it("has no React or NextResponse imports", () => {
        const pattern = /from ['"]react['"]|NextResponse|next\/server/
        expect(source.match(pattern)).toBeNull()
      })
    })
  }

  it("reconciliation.ts has no cross-domain SQL heuristics", () => {
    const source = readSource("reconciliation.ts")
    const pattern =
      /stockTransaction.*saleItem|saleItem.*journalEntry|stock\.findMany.*journalEntry/
    expect(source.match(pattern)).toBeNull()
  })
})
