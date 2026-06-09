import { parseMobileUploadRouteToken } from "@/lib/pos-ui/parse-mobile-upload-route-token"

describe("payment-evidence mobile page token wiring", () => {
  it("passes reconstructed token from catch-all route params", () => {
    const token = parseMobileUploadRouteToken(["eyJhbGci", "abc123signature"])

    expect(token).toBe("eyJhbGci.abc123signature")
    expect(token).toContain(".")
  })
})
