import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..", "..", "..")

const SCAN_DIRS = [
  path.join(ROOT, "components", "stock"),
  path.join(ROOT, "app", "(main)", "shop"),
]

const FORBIDDEN_PATTERN =
  /@\/lib\/stock\/document\/|@\/lib\/stock\/document-read\/|@\/lib\/stock\/posting|@\/lib\/stock\/ledger|from ['"]@\/generated\/prisma|from ['"]@prisma|prisma\./

function listSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath))
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.(ts|tsx)$/.test(entry.name)
    ) {
      files.push(fullPath)
    }
  }
  return files
}

describe("stock UI boundary grep audit", () => {
  const files = SCAN_DIRS.flatMap(listSourceFiles)

  it("scans stock UI directories", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath).replace(/\\/g, "/")

    describe(rel, () => {
      const source = fs.readFileSync(filePath, "utf8")

      it("has no forbidden prisma or stock domain imports", () => {
        expect(source.match(FORBIDDEN_PATTERN)).toBeNull()
      })
    })
  }
})
