import {
  defaultRedirectForRole,
  resolveSafeReturnTo,
} from "@/lib/auth/session-cookies"

describe("session cookie helpers", () => {
  it("defaults redirect to shop stock documents", () => {
    expect(defaultRedirectForRole("SH_STAFF")).toBe("/shop/stock-documents")
    expect(defaultRedirectForRole("HO_ADMIN")).toBe("/shop/stock-documents")
  })

  it("allows HO_ADMIN returnTo under /system/import", () => {
    expect(resolveSafeReturnTo("/system/import/branch", "HO_ADMIN")).toBe(
      "/system/import/branch"
    )
  })

  it("rejects open redirect targets", () => {
    expect(resolveSafeReturnTo("//evil.example", "HO_ADMIN")).toBeNull()
    expect(resolveSafeReturnTo("https://evil.example", "HO_ADMIN")).toBeNull()
  })
})
