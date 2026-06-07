import path from "path"
import { CatalogImageError } from "@/lib/catalog-image/errors"
import {
  assertBasenameOnly,
  createUniqueInputPdfFileName,
  resolveFinalProductImagePath,
  resolveFinalWorkFilePath,
  resolveInputPdfPath,
  resolveWorkFilePath,
  resolveWorkPreviewPath,
} from "@/lib/catalog-image/paths"

describe("catalog-image paths", () => {
  const originalInput = process.env.CATALOG_IMAGE_INPUT_DIR
  const originalWork = process.env.CATALOG_IMAGE_WORK_DIR

  beforeEach(() => {
    process.env.CATALOG_IMAGE_INPUT_DIR = path.resolve("/tmp/catalog-input")
    process.env.CATALOG_IMAGE_WORK_DIR = path.resolve("/tmp/catalog-work")
  })

  afterEach(() => {
    process.env.CATALOG_IMAGE_INPUT_DIR = originalInput
    process.env.CATALOG_IMAGE_WORK_DIR = originalWork
  })

  it("rejects path traversal in file names", () => {
    expect(() => assertBasenameOnly("../secret.pdf")).toThrow(CatalogImageError)
    expect(() => assertBasenameOnly("foo/bar.pdf")).toThrow(CatalogImageError)
  })

  it("rejects non-pdf file names", () => {
    expect(() => assertBasenameOnly("image.png")).toThrow(CatalogImageError)
  })

  it("accepts uppercase pdf extension", () => {
    expect(assertBasenameOnly("SCAN.PDF")).toBe("SCAN.PDF")
  })

  it("creates unique pdf file names for each upload", () => {
    const first = createUniqueInputPdfFileName("catalog.pdf")
    const second = createUniqueInputPdfFileName("catalog.pdf")
    expect(first).toMatch(/^catalog-[a-f0-9]{12}\.pdf$/)
    expect(second).toMatch(/^catalog-[a-f0-9]{12}\.pdf$/)
    expect(first).not.toBe(second)
  })

  it("resolves input pdf inside input dir only", () => {
    const resolved = resolveInputPdfPath("catalog.pdf")
    expect(resolved).toBe(path.resolve("/tmp/catalog-input", "catalog.pdf"))
  })

  it("rejects work file outside work dir", () => {
    expect(() => resolveWorkFilePath("/etc/passwd")).toThrow(CatalogImageError)
    expect(() => resolveWorkFilePath("../../../outside.png")).toThrow(
      CatalogImageError
    )
  })

  it("accepts work file inside work dir", () => {
    const resolved = resolveWorkFilePath(
      path.join("/tmp/catalog-work", "batch-1", "page-1", "slot-1.png")
    )
    expect(resolved).toContain("catalog-work")
  })

  it("builds preview path from batch/page/slot", () => {
    const resolved = resolveWorkPreviewPath("batch-abc", 1, 2)
    expect(resolved).toBe(
      path.resolve("/tmp/catalog-work", "batch-abc", "page-1", "slot-2.png")
    )
  })

  it("builds final product image path", () => {
    const resolved = resolveFinalProductImagePath("0101015")
    expect(resolved).toBe(
      path.resolve("/tmp/catalog-work", "final", "0101015.png")
    )
  })

  it("rejects final work file outside final dir", () => {
    expect(() =>
      resolveFinalWorkFilePath(
        path.join("/tmp/catalog-work", "batch-1", "page-1", "slot-1.png")
      )
    ).toThrow(CatalogImageError)
  })

  it("accepts final work file inside final dir", () => {
    const resolved = resolveFinalWorkFilePath(
      path.join("/tmp/catalog-work", "final", "0101015.png")
    )
    expect(resolved).toContain(path.join("catalog-work", "final"))
  })
})
