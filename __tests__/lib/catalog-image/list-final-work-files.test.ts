import path from "path"

const mockReaddir = jest.fn()
const mockStat = jest.fn()
const mockMkdir = jest.fn()

jest.mock("fs/promises", () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  stat: (...args: unknown[]) => mockStat(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}))

import { listFinalWorkFiles } from "@/lib/catalog-image/paths"

describe("listFinalWorkFiles", () => {
  const originalWork = process.env.CATALOG_IMAGE_WORK_DIR
  const originalImageDir = process.env.CATALOG_PRODUCT_IMAGE_DIR

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CATALOG_IMAGE_WORK_DIR = path.resolve("/tmp/catalog-work")
    process.env.CATALOG_PRODUCT_IMAGE_DIR = path.resolve("/tmp/catalog-images")
    mockMkdir.mockResolvedValue(undefined)
    mockReaddir.mockResolvedValue([
      { name: "0101015.png", isFile: () => true },
      { name: "notes.txt", isFile: () => true },
      { name: "subdir", isFile: () => false },
    ])
    mockStat.mockResolvedValue({
      size: 1234,
      mtime: new Date("2026-06-06T00:00:00.000Z"),
    })
  })

  afterEach(() => {
    process.env.CATALOG_IMAGE_WORK_DIR = originalWork
    process.env.CATALOG_PRODUCT_IMAGE_DIR = originalImageDir
  })

  it("returns png files only from final folder", async () => {
    const files = await listFinalWorkFiles()

    expect(files).toEqual([
      {
        fileName: "0101015.png",
        sizeBytes: 1234,
        modifiedAt: "2026-06-06T00:00:00.000Z",
      },
    ])
    expect(mockStat).toHaveBeenCalledTimes(1)
  })
})
