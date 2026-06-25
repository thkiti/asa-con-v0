import path from "path"

const mockAccess = jest.fn()
const mockCopyFile = jest.fn()
const mockWriteFile = jest.fn()
const mockMkdir = jest.fn()
const mockUnlink = jest.fn()
const mockRm = jest.fn()

jest.mock("fs/promises", () => ({
  access: (...args: unknown[]) => mockAccess(...args),
  copyFile: (...args: unknown[]) => mockCopyFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
  rm: (...args: unknown[]) => mockRm(...args),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn(),
}))

import { saveMatchedCatalogImages } from "@/lib/catalog-image/save-matched"

describe("saveMatchedCatalogImages", () => {
  const originalWork = process.env.CATALOG_IMAGE_WORK_DIR
  const originalImageDir = process.env.CATALOG_PRODUCT_IMAGE_DIR

  const imageDir = path.resolve("/tmp/catalog-images")
  const sourcePath = path.resolve(
    "/tmp/catalog-work/batch-1/page-1/slot-1.png"
  )
  const finalPath = path.join(imageDir, "0101015.png")
  const existingJpgPath = path.join(imageDir, "0101015.jpg")

  const createDb = (productId: string | null = "prod-1") => ({
    product: {
      findUnique: jest.fn().mockResolvedValue(productId ? { id: productId } : null),
    },
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CATALOG_IMAGE_WORK_DIR = path.resolve("/tmp/catalog-work")
    process.env.CATALOG_PRODUCT_IMAGE_DIR = imageDir
    mockMkdir.mockResolvedValue(undefined)
    mockCopyFile.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockUnlink.mockResolvedValue(undefined)
  })

  afterEach(() => {
    process.env.CATALOG_IMAGE_WORK_DIR = originalWork
    process.env.CATALOG_PRODUCT_IMAGE_DIR = originalImageDir
  })

  function mockConflictWithJpg() {
    mockAccess.mockImplementation(async (target: string) => {
      if (target === sourcePath || target === existingJpgPath) return
      throw new Error("ENOENT")
    })
  }

  function mockSourceOnly() {
    mockAccess.mockImplementation(async (target: string) => {
      if (target === sourcePath) return
      throw new Error("ENOENT")
    })
  }

  it("writes PNG buffer to catalog product images folder", async () => {
    const db = createDb()
    mockSourceOnly()
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47])

    const results = await saveMatchedCatalogImages(db, [
      {
        productCode: "0101015",
        pngBuffer,
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
    expect(mockWriteFile).toHaveBeenCalledWith(finalPath, pngBuffer)
    expect(mockCopyFile).not.toHaveBeenCalled()
  })

  it("copies file to catalog product images folder", async () => {
    const db = createDb()
    mockSourceOnly()

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
    expect(mockMkdir).toHaveBeenCalledWith(imageDir, { recursive: true })
    expect(mockRm).not.toHaveBeenCalled()
  })

  it("returns DUPLICATE when any allowed extension exists", async () => {
    const db = createDb()
    mockConflictWithJpg()

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
    expect(mockUnlink).not.toHaveBeenCalled()
    expect(mockRm).not.toHaveBeenCalled()
  })

  it("unlinks conflicting files and copies when replace=true", async () => {
    const db = createDb()
    mockConflictWithJpg()

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
    expect(mockUnlink).toHaveBeenCalledWith(existingJpgPath)
    expect(mockCopyFile).toHaveBeenCalledWith(sourcePath, finalPath)
    expect(mockRm).not.toHaveBeenCalled()
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

  it("returns ERROR when source file is missing", async () => {
    const db = createDb()
    mockAccess.mockRejectedValue(new Error("ENOENT"))

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
