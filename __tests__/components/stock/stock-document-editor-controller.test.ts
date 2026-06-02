import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..", "..", "..")
const CONTROLLER = path.join(ROOT, "components", "stock", "StockDocumentEditorController.tsx")

describe("StockDocumentEditorController integration boundaries", () => {
  const source = fs.readFileSync(CONTROLLER, "utf8")

  it("uses stock-ui fetchers and save helper only", () => {
    expect(source).toContain("fetchShopSession")
    expect(source).toContain("fetchStockDocumentDetail")
    expect(source).toContain("saveStockDocumentEditor")
    expect(source).toContain("useRouter")
    expect(source).toContain("router.replace")
    expect(source).not.toMatch(/fetch\s*\(\s*[`'"]\/api\//)
    expect(source).not.toMatch(/@\/lib\/stock\//)
    expect(source).not.toMatch(/prisma/)
  })
})
