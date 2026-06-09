import {
  readMobileUploadTokenFromPathname,
  resolveMobileEvidenceToken,
} from "@/lib/pos-ui/resolve-mobile-evidence-token"

describe("resolveMobileEvidenceToken", () => {
  it("prefers route params when present", () => {
    expect(resolveMobileEvidenceToken(["payload", "signature"])).toBe(
      "payload.signature"
    )
  })

  it("reads token from pathname when params are empty", () => {
    expect(
      resolveMobileEvidenceToken(
        undefined,
        "/payment-evidence/mobile/payload.signature"
      )
    ).toBe("payload.signature")
  })

  it("reads split pathname segments as dot-joined token", () => {
    expect(
      readMobileUploadTokenFromPathname(
        "/payment-evidence/mobile/payload/signature"
      )
    ).toBe("payload.signature")
  })
})
