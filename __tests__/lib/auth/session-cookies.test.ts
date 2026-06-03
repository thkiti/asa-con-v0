import {
  clearSessionCookies,
  createSessionUser,
  defaultRedirectForRole,
  resolveSafeReturnTo,
  setSessionCookies,
} from "@/lib/auth/session-cookies"
import {
  BRANCH_CODE_COOKIE,
  BRANCH_ID_COOKIE,
  BRANCH_NAME_COOKIE,
  ROLE_COOKIE,
  SESSION_COOKIE,
  STAFF_ID_COOKIE,
  STAFF_NAME_COOKIE,
  USER_ID_COOKIE,
} from "@/lib/auth/cookies"
import { readSessionCookies } from "@/lib/auth/cookies"

describe("session cookie helpers", () => {
  it("defaults redirect to main menu", () => {
    expect(defaultRedirectForRole("SH_STAFF")).toBe("/main")
    expect(defaultRedirectForRole("HO_ADMIN")).toBe("/main")
  })

  it("allows returnTo /main and /shop paths", () => {
    expect(resolveSafeReturnTo("/main", "SH_STAFF")).toBe("/main")
    expect(resolveSafeReturnTo("/shop/stock-documents", "SH_STAFF")).toBe(
      "/shop/stock-documents"
    )
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

  it("setSessionCookies and readSessionCookies round-trip all fields", () => {
    const store = new Map<string, string>()
    const cookieStore = {
      set: (name: string, value: string) => {
        store.set(name, value)
      },
      delete: ({ name }: { name: string }) => {
        store.delete(name)
      },
    }

    const user = createSessionUser({
      sessionId: "sess-1",
      userId: "uid-1",
      role: "SH_STAFF",
      staffId: "002",
      name: "Shop User",
      branchId: "branch-sh",
      branchCode: "SH001",
      branchName: "Shop Branch",
    })

    setSessionCookies(cookieStore, user)

    const payload = readSessionCookies({
      get: (name) => (store.has(name) ? { value: store.get(name)! } : undefined),
    })

    expect(payload).toMatchObject({
      sessionId: "sess-1",
      userId: "uid-1",
      role: "SH_STAFF",
      staffId: "002",
      name: "Shop User",
      branchId: "branch-sh",
      branchCode: "SH001",
      branchName: "Shop Branch",
    })
  })

  it("clearSessionCookies removes all session cookies", () => {
    const store = new Map<string, string>([
      [SESSION_COOKIE, "s"],
      [USER_ID_COOKIE, "u"],
      [ROLE_COOKIE, "HO_ADMIN"],
      [STAFF_ID_COOKIE, "001"],
      [STAFF_NAME_COOKIE, "n"],
      [BRANCH_ID_COOKIE, "b"],
      [BRANCH_CODE_COOKIE, "c"],
      [BRANCH_NAME_COOKIE, "bn"],
    ])

    clearSessionCookies({
      set: () => {},
      delete: ({ name }) => {
        store.delete(name)
      },
    })

    expect(store.size).toBe(0)
  })
})
