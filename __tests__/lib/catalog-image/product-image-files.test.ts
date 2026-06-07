import path from "path"
import {
  CATALOG_PRODUCT_IMAGE_EXTENSIONS,
  discoverProductCodesInImageDir,
  findExistingProductImageFiles,
  getImageExtensionFromFileName,
  getProductCodeFromImageFileName,
  hasProductImageConflict,
  isCatalogProductImageFileName,
  removeProductImageFilesForCode,
} from "@/lib/catalog-image/product-image-files"

const mockAccess = jest.fn()
const mockMkdir = jest.fn()
const mockUnlink = jest.fn()
const mockReaddir = jest.fn()

jest.mock("fs/promises", () => ({
  access: (...args: unknown[]) => mockAccess(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
  readdir: (...args: unknown[]) => mockReaddir(...args),
}))

describe("product-image-files", () => {
  const originalImageDir = process.env.CATALOG_PRODUCT_IMAGE_DIR
  const imageDir = path.resolve("/tmp/catalog-images")

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CATALOG_PRODUCT_IMAGE_DIR = imageDir
    mockMkdir.mockResolvedValue(undefined)
    mockUnlink.mockResolvedValue(undefined)
  })

  afterEach(() => {
    process.env.CATALOG_PRODUCT_IMAGE_DIR = originalImageDir
  })

  it("exposes allowed extensions", () => {
    expect(CATALOG_PRODUCT_IMAGE_EXTENSIONS).toEqual([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ])
  })

  it("detects valid catalog product image file names", () => {
    expect(isCatalogProductImageFileName("0101015.png")).toBe(true)
    expect(isCatalogProductImageFileName("0101015.jpg")).toBe(true)
    expect(isCatalogProductImageFileName("0101015.JPEG")).toBe(true)
    expect(isCatalogProductImageFileName("catalog.pdf")).toBe(false)
    expect(isCatalogProductImageFileName("../0101015.png")).toBe(false)
    expect(isCatalogProductImageFileName("0101015.gif")).toBe(false)
  })

  it("parses product code and extension from file name", () => {
    expect(getProductCodeFromImageFileName("0101015.png")).toBe("0101015")
    expect(getImageExtensionFromFileName("0101015.webp")).toBe(".webp")
    expect(getProductCodeFromImageFileName("bad-name.pdf")).toBeNull()
  })

  it("discovers unique sorted product codes from image dir", async () => {
    mockReaddir.mockResolvedValue([
      { name: "0202020.png", isFile: () => true },
      { name: "0101015.jpg", isFile: () => true },
      { name: "0101015.webp", isFile: () => true },
      { name: "readme.txt", isFile: () => true },
      { name: "subdir", isFile: () => false },
    ])

    const codes = await discoverProductCodesInImageDir(imageDir)
    expect(codes).toEqual(["0101015", "0202020"])
    expect(mockReaddir).toHaveBeenCalledWith(imageDir, { withFileTypes: true })
  })

  it("finds existing files across allowed extensions", async () => {
    mockAccess.mockImplementation(async (target: string) => {
      if (target === path.join(imageDir, "0101015.jpg")) return
      throw new Error("ENOENT")
    })

    const existing = await findExistingProductImageFiles(imageDir, "0101015")
    expect(existing).toEqual([path.join(imageDir, "0101015.jpg")])
    expect(await hasProductImageConflict(imageDir, "0101015")).toBe(true)
  })

  it("reports no conflict when no extension exists", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"))
    expect(await hasProductImageConflict(imageDir, "0101015")).toBe(false)
  })

  it("unlinks only individual conflicting files on replace", async () => {
    mockAccess.mockImplementation(async (target: string) => {
      if (
        target === path.join(imageDir, "0101015.jpg") ||
        target === path.join(imageDir, "0101015.png")
      ) {
        return
      }
      throw new Error("ENOENT")
    })

    const removed = await removeProductImageFilesForCode(imageDir, "0101015")
    expect(removed).toEqual([
      path.join(imageDir, "0101015.jpg"),
      path.join(imageDir, "0101015.png"),
    ])
    expect(mockUnlink).toHaveBeenCalledTimes(2)
    expect(mockUnlink).toHaveBeenCalledWith(path.join(imageDir, "0101015.jpg"))
    expect(mockUnlink).toHaveBeenCalledWith(path.join(imageDir, "0101015.png"))
  })
})
