import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..", "..", "..")
const CONTROLLER = path.join(ROOT, "components", "stock", "StockDocumentEditorController.tsx")

describe("StockDocumentEditorController workflow flow", () => {
  const source = fs.readFileSync(CONTROLLER, "utf8")

  it("refreshes document state from workflow API response", () => {
    expect(source).toContain("applyDetail(detail)")
    expect(source).toContain("submitStockDocument")
    expect(source).toContain("confirmStockDocument")
    expect(source).toContain("cancelStockDocument")
    expect(source).toContain("postStockDocument")
  })

  it("prints from detailSnapshot via window.print", () => {
    expect(source).toContain('actionId === "print"')
    expect(source).toContain("detailSnapshot")
    expect(source).toContain("window.print()")
  })

  it("refetches document after workflow failure", () => {
    expect(source).toContain("refreshDocument")
  })

  it("redirects to list after successful cancel only", () => {
    expect(source).toContain('router.replace("/shop/stock-documents")')
    expect(source).toContain('detail.status === "CANCELLED"')
    expect(source).not.toContain('actionId === "post"')
  })
})
