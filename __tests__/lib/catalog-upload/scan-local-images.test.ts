import path from "path"

const mockReaddir = jest.fn()
const mockStat = jest.fn()
const mockMkdir = jest.fn()

jest.mock("fs/promises", () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  stat: (...args: unknown[]) => mockStat(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}))

import { scanCatalogProductImages } from "@/lib/catalog-upload/scan-local-images"

describe("scanCatalogProductImages", () => {
  const originalImageDir = process.env.CATALOG_PRODUCT_IMAGE_DIR
  const imageDir = path.resolve("/tmp/catalog-images")

  const createDb = (matchedCodes: Set<string>) => ({
    product: {
      findUnique: jest.fn(async ({ where }: { where: { code: string } }) =>
        matchedCodes.has(where.code) ? { id: `prod-${where.code}` } : null
      ),
    },
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CATALOG_PRODUCT_IMAGE_DIR = imageDir
    mockMkdir.mockResolvedValue(undefined)
    mockStat.mockImplementation(async () => ({
      size: 2048,
      mtime: new Date("2026-06-06T00:00:00.000Z"),
    }))
  })

  afterEach(() => {
    process.env.CATALOG_PRODUCT_IMAGE_DIR = originalImageDir
  })

  it("ignores non-image files and invalid basenames", async () => {
    mockReaddir.mockResolvedValue([
      { name: "0101015.png", isFile: () => true },
      { name: "catalog.pdf", isFile: () => true },
      { name: "notes.txt", isFile: () => true },
      { name: "../bad.png", isFile: () => true },
      { name: "subdir", isFile: () => false },
    ])

    const db = createDb(new Set(["0101015"]))
    const result = await scanCatalogProductImages(db)

    expect(result.imageDir).toBe(imageDir)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      productCode: "0101015",
      fileName: "0101015.png",
      extension: ".png",
      productStatus: "MATCHED",
      localStatus: "OK",
      uploadStatus: "NOT_CHECKED",
    })
    expect(result.duplicateBasenames).toEqual([])
  })

  it("marks duplicate basenames across extensions", async () => {
    mockReaddir.mockResolvedValue([
      { name: "0101015.png", isFile: () => true },
      { name: "0101015.jpg", isFile: () => true },
      { name: "0101016.webp", isFile: () => true },
    ])

    const db = createDb(new Set(["0101015", "0101016"]))
    const result = await scanCatalogProductImages(db)

    expect(result.duplicateBasenames).toEqual(["0101015"])
    const dupRows = result.rows.filter((row) => row.productCode === "0101015")
    expect(dupRows).toHaveLength(2)
    expect(dupRows.every((row) => row.localStatus === "DUPLICATE")).toBe(true)
    expect(
      result.rows.find((row) => row.productCode === "0101016")?.localStatus
    ).toBe("OK")
  })

  it("reports unmatched product codes", async () => {
    mockReaddir.mockResolvedValue([
      { name: "9999999.png", isFile: () => true },
    ])

    const db = createDb(new Set())
    const result = await scanCatalogProductImages(db)

    expect(result.rows[0]).toMatchObject({
      productCode: "9999999",
      productStatus: "UNMATCHED",
      localStatus: "OK",
    })
  })

  it("sorts rows by product code then file name", async () => {
    mockReaddir.mockResolvedValue([
      { name: "0101016.png", isFile: () => true },
      { name: "0101015.jpg", isFile: () => true },
      { name: "0101015.png", isFile: () => true },
    ])

    const db = createDb(new Set(["0101015", "0101016"]))
    const result = await scanCatalogProductImages(db)

    expect(result.rows.map((row) => row.fileName)).toEqual([
      "0101015.jpg",
      "0101015.png",
      "0101016.png",
    ])
  })
})
