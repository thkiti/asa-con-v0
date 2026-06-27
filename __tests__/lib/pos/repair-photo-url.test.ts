import {
  repairPhotoBlobPath,
  resolveRepairPhotoUrl,
} from "@/lib/pos/repair-photo-url"

describe("repair-photo-url", () => {
  const originalBase = process.env.NEXT_PUBLIC_BLOB_BASE_URL

  afterEach(() => {
    if (originalBase === undefined) {
      delete process.env.NEXT_PUBLIC_BLOB_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_BLOB_BASE_URL = originalBase
    }
  })

  it("builds blob path under repair/", () => {
    expect(repairPhotoBlobPath("REP-SH001-202606-0004-01.jpg")).toBe(
      "repair/REP-SH001-202606-0004-01.jpg"
    )
  })

  it("prefers direct public url from blob list", () => {
    expect(
      resolveRepairPhotoUrl("REP-SH001-202606-0004-01.jpg", {
        url: "https://blob.example/repair/REP-SH001-202606-0004-01.jpg",
      })
    ).toBe("https://blob.example/repair/REP-SH001-202606-0004-01.jpg")
  })

  it("builds url from base and encoded filename only", () => {
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = "https://cdn.example"
    expect(resolveRepairPhotoUrl("REP-SH001-202606-0004-01.jpg")).toBe(
      "https://cdn.example/repair/REP-SH001-202606-0004-01.jpg"
    )
  })
})
