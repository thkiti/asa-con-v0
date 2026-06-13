import { isBareMobileUploadPath } from "@/lib/pos-ui/is-bare-mobile-upload-path"

describe("isBareMobileUploadPath", () => {
  it("matches mobile upload routes", () => {
    expect(isBareMobileUploadPath("/payment-evidence/mobile/abc.def")).toBe(true)
    expect(isBareMobileUploadPath("/staff-evidence/mobile/abc.def")).toBe(true)
  })

  it("does not match other routes", () => {
    expect(isBareMobileUploadPath("/shop")).toBe(false)
  })
})
