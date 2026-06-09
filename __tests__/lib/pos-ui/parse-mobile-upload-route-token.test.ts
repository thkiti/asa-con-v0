import { parseMobileUploadRouteToken } from "@/lib/pos-ui/parse-mobile-upload-route-token"

describe("parseMobileUploadRouteToken", () => {
  it("joins catch-all segments split on dot", () => {
    expect(parseMobileUploadRouteToken(["payload-part", "signature-part"])).toBe(
      "payload-part.signature-part"
    )
  })

  it("decodes a single encoded segment", () => {
    expect(parseMobileUploadRouteToken(["payload%2Esignature"])).toBe(
      "payload.signature"
    )
  })

  it("accepts a single string segment", () => {
    expect(parseMobileUploadRouteToken("signed.token")).toBe("signed.token")
  })

  it("returns empty string when segments are missing", () => {
    expect(parseMobileUploadRouteToken(undefined)).toBe("")
    expect(parseMobileUploadRouteToken([])).toBe("")
  })
})
