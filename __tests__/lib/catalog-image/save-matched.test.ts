import path from "path"
import { CatalogImageError } from "@/lib/catalog-image/errors"

const mockAccess = jest.fn()
const mockCopyFile = jest.fn()
const mockMkdir = jest.fn()

jest.mock("fs/promises", () => ({
  access: (...args: unknown[]) => mockAccess(...args),
  copyFile: (...args: unknown[]) => mockCopyFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn(),
}))

import { saveMatchedCatalogImages } from "@/lib/catalog-image/save-matched"

describe("saveMatchedCatalogImages", () => {
  const originalWork = process.env.CATALOG_IMAGE_WORK_DIR

  const createDb = (productId: string | null = "prod-1") => ({
    product: {
      findUnique: jest.fn().mockResolvedValue(productId ? { id: productId } : null),
    },
  })

  const sourcePath = path.resolve(
    "/tmp/catalog-work/batch-1/page-1/slot-1.png"
  )
  const finalPath = path.resolve("/tmp/catalog-work/final/0101015.png")

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CATALOG_IMAGE_WORK_DIR = path.resolve("/tmp/catalog-work")
    mockMkdir.mockResolvedValue(undefined)
    mockCopyFile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    process.env.CATALOG_IMAGE_WORK_DIR = originalWork
  })

  function mockSourceExists() {
    mockAccess.mockImplementation(async (target: string) => {
      if (target === sourcePath || target === finalPath) {
        return
      }
      throw new Error("ENOENT")
    })
  }

  it("copies file to final/{productCode}.png", async () => {
    const db = createDb()
    mockAccess.mockImplementation(async (target: string) => {
      if (target === sourcePath) return
      throw new Error("ENOENT")
    })

    const results = await saveMatchedCatalogImages(db, [
      {
        productCode: "0101015",
        localFilePath: sourcePath,
      },
    ])

    expect(results).toEqual([
      {
        productCode: "0101015",
        finalFilePath: finalPath,
        finalFileName: "0101015.png",
        status: "SAVED",
      },
    ])
    expect(mockCopyFile).toHaveBeenCalledWith(sourcePath, finalPath)
    expect(db.product.findUnique).toHaveBeenCalledWith({
      where: { code: "0101015" },
      select: { id: true },
    })
  })

  it("returns ERROR when productCode is not found", async () => {
    const db = createDb(null)
    mockAccess.mockResolvedValue(undefined)

    const results = await saveMatchedCatalogImages(db, [
      {
        productCode: "0101015",
        localFilePath: sourcePath,
      },
    ])

    expect(results[0]).toMatchObject({
      productCode: "0101015",
      status: "ERROR",
      error: "Product not found",
    })
    expect(mockCopyFile).not.toHaveBeenCalled()
  })

  it("returns ERROR when source is outside work dir", async () => {
    const db = createDb()

    const results = await saveMatchedCatalogImages(db, [
      {
        productCode: "0101015",
        localFilePath: "/etc/passwd.png",
      },
    ])

    expect(results[0]).toMatchObject({
      productCode: "0101015",
      status: "ERROR",
    })
    expect(results[0].error).toContain("work")
    expect(mockCopyFile).not.toHaveBeenCalled()
  })

  it("returns DUPLICATE without overwrite when destination exists", async () => {
    const db = createDb()
    mockSourceExists()

    const results = await saveMatchedCatalogImages(db, [
      {
        productCode: "0101015",
        localFilePath: sourcePath,
        replace: false,
      },
    ])

    expect(results[0]).toMatchObject({
      productCode: "0101015",
      finalFilePath: finalPath,
      finalFileName: "0101015.png",
      status: "DUPLICATE",
    })
    expect(mockCopyFile).not.toHaveBeenCalled()
  })

  it("overwrites destination when replace=true", async () => {
    const db = createDb()
    mockSourceExists()

    const results = await saveMatchedCatalogImages(db, [
      {
        productCode: "0101015",
        localFilePath: sourcePath,
        replace: true,
      },
    ])

    expect(results[0]).toMatchObject({
      productCode: "0101015",
      status: "SAVED",
    })
    expect(mockCopyFile).toHaveBeenCalledWith(sourcePath, finalPath)
  })

  it("returns ERROR when source file is missing", async () => {
    const db = createDb()
    mockAccess.mockImplementation(async (target: string) => {
      if (target === finalPath) return
      throw new Error("ENOENT")
    })

    const results = await saveMatchedCatalogImages(db, [
      {
        productCode: "0101015",
        localFilePath: sourcePath,
      },
    ])

    expect(results[0]).toMatchObject({
      status: "ERROR",
      error: "Source file not found",
    })
    expect(mockCopyFile).not.toHaveBeenCalled()
  })
})
