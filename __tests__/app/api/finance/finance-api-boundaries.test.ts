import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..", "..", "..", "..")
const FINANCE_API_DIR = path.join(ROOT, "app", "api", "finance")

function listTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listTsFiles(fullPath))
    } else if (entry.name.endsWith(".ts")) {
      files.push(fullPath)
    }
  }
  return files
}

describe("finance API boundary grep audit", () => {
  const files = listTsFiles(FINANCE_API_DIR)

  it("scans app/api/finance/**/*.ts", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath).replace(/\\/g, "/")

    describe(rel, () => {
      const source = fs.readFileSync(filePath, "utf8")

      it("has no forbidden finance posting imports", () => {
        const pattern =
          /account-map|postSaleVoucher|postOperationalVoucher|from ['"]@\/lib\/finance\/voucher['"]|from ['"]@\/lib\/finance\/journal['"]/
        expect(source.match(pattern)).toBeNull()
      })

      it("has no stock mutation imports or calls", () => {
        const pattern = /issueStock\s*\(|receiveStock\s*\(|from ['"]@\/lib\/stock\/(issue|receive)/
        expect(source.match(pattern)).toBeNull()
      })

      it("has no react imports", () => {
        expect(source).not.toMatch(/from ['"]react['"]/)
      })

      it("allows only next/server for HTTP types", () => {
        if (source.includes("next/server")) {
          expect(source).not.toMatch(/from ['"]next\/(?!server)/)
        }
      })
    })
  }
})
