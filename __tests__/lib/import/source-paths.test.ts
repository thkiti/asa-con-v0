import fs from "fs"
import os from "os"
import path from "path"

import { resolveImportSourceFile } from "@/lib/import/source-paths"

describe("resolveImportSourceFile", () => {
  let tempDir = ""

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "import-source-paths-"))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("prefers categorized dbf path when archive layout exists", () => {
    fs.mkdirSync(path.join(tempDir, "dbf"), { recursive: true })
    fs.writeFileSync(path.join(tempDir, "dbf", "SHP.DBF"), "dbf")
    fs.writeFileSync(path.join(tempDir, "SHP.DBF"), "flat")

    expect(resolveImportSourceFile(tempDir, "SHP.DBF", "dbf")).toBe(
      path.join(tempDir, "dbf", "SHP.DBF")
    )
  })

  it("falls back to flat source dir for backward compatibility", () => {
    fs.writeFileSync(path.join(tempDir, "kCode.csv"), "csv")

    expect(resolveImportSourceFile(tempDir, "kCode.csv", "csv")).toBe(
      path.join(tempDir, "kCode.csv")
    )
  })
})
