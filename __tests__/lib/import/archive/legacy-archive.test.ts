import fs from "fs"
import os from "os"
import path from "path"

import {
  buildLegacyArchiveManifest,
  sha256File,
  summarizeLegacyArchiveManifest,
} from "@/lib/import/archive"

describe("legacy archive manifest", () => {
  let sourceDir = ""
  let targetDir = ""

  beforeEach(() => {
    sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-source-"))
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-target-"))

    fs.writeFileSync(path.join(sourceDir, "SHP.DBF"), "branch-data")
    fs.writeFileSync(path.join(sourceDir, "POSINY.DBF"), "product-data")
    fs.writeFileSync(path.join(sourceDir, "EME.DBF"), "staff-data")
    fs.writeFileSync(path.join(sourceDir, "kCode.csv"), '"SupplierCode,Hook,Code,Group"\n"K.1,1,1010015,1019018"\n')
    fs.writeFileSync(path.join(sourceDir, "cCode.csv"), '"SupplierCode,Hook,Code,Group"\n"C.1,1,1010015,1019018"\n')
    fs.writeFileSync(path.join(sourceDir, "mCode.csv"), '"SupplierCode,Hook,Code,Group"\n"M.1,1,1010015,1019018"\n')
  })

  afterEach(() => {
    fs.rmSync(sourceDir, { recursive: true, force: true })
    fs.rmSync(targetDir, { recursive: true, force: true })
  })

  it("creates manifest and copies required files with checksums", async () => {
    const result = await buildLegacyArchiveManifest({
      sourceDir,
      targetDir,
      archiveName: "devboard-v1",
    })

    expect(result.errors).toHaveLength(0)
    expect(result.copiedCount).toBe(6)
    expect(fs.existsSync(path.join(targetDir, "manifest.json"))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, "dbf", "SHP.DBF"))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, "csv", "kCode.csv"))).toBe(true)

    const shpEntry = result.manifest.files.find((file) => file.filename === "SHP.DBF")
    expect(shpEntry?.sha256).toHaveLength(64)
    expect(shpEntry?.sizeBytes).toBeGreaterThan(0)
    expect(shpEntry?.encoding).toBe("TIS-620")
    expect(shpEntry?.importRole).toBe("branch")
  })

  it("does not fail when optional oCode.csv is missing", async () => {
    const result = await buildLegacyArchiveManifest({
      sourceDir,
      targetDir,
    })

    const oCode = result.manifest.files.find((file) => file.filename === "oCode.csv")
    expect(oCode?.required).toBe(false)
    expect(oCode?.exists).toBe(false)
    expect(result.warnings.some((warning) => warning.includes("oCode.csv"))).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("records required missing files as errors", async () => {
    fs.rmSync(path.join(sourceDir, "SHP.DBF"))

    const result = await buildLegacyArchiveManifest({
      sourceDir,
      targetDir,
      dryRun: true,
    })

    const summary = summarizeLegacyArchiveManifest(result.manifest)
    expect(summary.missingRequired).toContain("SHP.DBF")
    expect(result.errors.some((error) => error.includes("SHP.DBF"))).toBe(true)
  })

  it("supports dry-run without copying or writing manifest", async () => {
    const result = await buildLegacyArchiveManifest({
      sourceDir,
      targetDir,
      dryRun: true,
    })

    expect(result.copiedCount).toBe(0)
    expect(fs.existsSync(path.join(targetDir, "manifest.json"))).toBe(false)
    expect(fs.existsSync(path.join(targetDir, "dbf", "SHP.DBF"))).toBe(false)
    expect(result.manifest.files.find((file) => file.filename === "SHP.DBF")?.sha256).toHaveLength(64)
  })
})

describe("sha256File", () => {
  it("returns stable checksum for file contents", async () => {
    const tempFile = path.join(os.tmpdir(), `sha256-${Date.now()}.txt`)
    fs.writeFileSync(tempFile, "legacy-archive")

    await expect(sha256File(tempFile)).resolves.toMatch(/^[a-f0-9]{64}$/)

    fs.rmSync(tempFile, { force: true })
  })
})
