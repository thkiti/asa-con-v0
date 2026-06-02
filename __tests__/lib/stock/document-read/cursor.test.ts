import {
  decodeListCursor,
  encodeListCursor,
} from "@/lib/stock/document-read/cursor"

describe("list cursor", () => {
  it("round-trips createdAt and id", () => {
    const payload = {
      createdAt: "2026-03-01T10:00:00.000Z",
      id: "doc-abc",
    }
    const encoded = encodeListCursor(payload)
    expect(decodeListCursor(encoded)).toEqual(payload)
  })

  it("returns null for invalid cursor", () => {
    expect(decodeListCursor("not-valid")).toBeNull()
  })
})
