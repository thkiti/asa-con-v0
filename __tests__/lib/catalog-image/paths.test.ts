import path from "path"
import { CatalogImageError } from "@/lib/catalog-image/errors"

const mockRm = jest.fn()

jest.mock("fs/promises", () => ({
  rm: (...args: unknown[]) => mockRm(...args),
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn(),
  access: jest.fn(),
  unlink: jest.fn(),
}))

import {
  assertBasenameOnly,
  createUniqueInputPdfFileName,
  deleteCatalogImageBatch,
  resolveFinalProductImagePath,
  resolveFinalWorkFilePath,
  resolveInputPdfPath,
  resolveWorkFilePath,
  resolveWorkPreviewPath,
} from "@/lib/catalog-image/paths"

describe("catalog-image paths", () => {
  const originalInput = process.env.CATALOG_IMAGE_INPUT_DIR
  const originalWork = process.env.CATALOG_IMAGE_WORK_DIR
  const originalImageDir = process.env.CATALOG_PRODUCT_IMAGE_DIR

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CATALOG_IMAGE_INPUT_DIR = path.resolve("/tmp/catalog-input")
    process.env.CATALOG_IMAGE_WORK_DIR = path.resolve("/tmp/catalog-work")
    process.env.CATALOG_PRODUCT_IMAGE_DIR = path.resolve("/tmp/catalog-images")
    mockRm.mockResolvedValue(undefined)
  })

  afterEach(() => {
    process.env.CATALOG_IMAGE_INPUT_DIR = originalInput
    process.env.CATALOG_IMAGE_WORK_DIR = originalWork
    process.env.CATALOG_PRODUCT_IMAGE_DIR = originalImageDir
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

  it("builds final product image path in catalog product images dir", () => {
    const resolved = resolveFinalProductImagePath("0101015")
    expect(resolved).toBe(
      path.resolve("/tmp/catalog-images", "0101015.png")
    )
  })

  it("rejects final work file outside catalog product images dir", () => {
    expect(() =>
      resolveFinalWorkFilePath(
        path.join("/tmp/catalog-work", "batch-1", "page-1", "slot-1.png")
      )
    ).toThrow(CatalogImageError)
  })

  it("accepts final work file inside catalog product images dir", () => {
    const resolved = resolveFinalWorkFilePath(
      path.join("/tmp/catalog-images", "0101015.png")
    )
    expect(resolved).toContain(path.join("catalog-images", "0101015.png"))
  })

  it("deletes only work batch folders", async () => {
    await deleteCatalogImageBatch("batch-abc")
    expect(mockRm).toHaveBeenCalledWith(
      path.resolve("/tmp/catalog-work", "batch-abc"),
      { recursive: true, force: true }
    )
  })

  it("refuses to delete catalog product images folder", async () => {
    process.env.CATALOG_IMAGE_WORK_DIR = path.resolve("/tmp")
    process.env.CATALOG_PRODUCT_IMAGE_DIR = path.resolve("/tmp/catalog-images")
    await expect(deleteCatalogImageBatch("catalog-images")).rejects.toThrow(
      CatalogImageError
    )
    expect(mockRm).not.toHaveBeenCalled()
  })
})
