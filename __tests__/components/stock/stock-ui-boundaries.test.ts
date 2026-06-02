import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..", "..", "..")

const SCAN_DIRS = [
  path.join(ROOT, "app", "(main)", "shop", "stock-documents"),
  path.join(ROOT, "components", "stock"),
]

const FORBIDDEN_PATTERN =
  /prisma|@\/generated\/prisma|@\/lib\/stock\/|fetch\s*\(\s*[`'"]\/api\//

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

describe("stock shop UI boundary grep audit", () => {
  const files = SCAN_DIRS.flatMap(listSourceFiles)

  it("scans shop stock document UI directories", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath).replace(/\\/g, "/")

    describe(rel, () => {
      const source = fs.readFileSync(filePath, "utf8")

      it("has no prisma, stock domain, or direct API fetch", () => {
        expect(source.match(FORBIDDEN_PATTERN)).toBeNull()
      })
    })
  }
})
