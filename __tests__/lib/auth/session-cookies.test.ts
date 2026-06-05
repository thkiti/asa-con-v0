import {
  clearSessionCookies,
  createSessionUser,
  defaultRedirectForRole,
  resolveSafeReturnTo,
  SESSION_TTL_SECONDS,
  setSessionCookies,
} from "@/lib/auth/session-cookies"
import {
  BRANCH_CODE_COOKIE,
  BRANCH_ID_COOKIE,
  BRANCH_NAME_COOKIE,
  ROLE_COOKIE,
  SESSION_COOKIE,
  SESSION_EXPIRES_COOKIE,
  STAFF_ID_COOKIE,
  STAFF_NAME_COOKIE,
  USER_ID_COOKIE,
  isSessionValid,
  readSessionCookies,
} from "@/lib/auth/cookies"

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

  it("setSessionCookies stores session-scoped cookies with expiry timestamp", () => {
    const store = new Map<string, string>()
    const options = new Map<string, Record<string, unknown>>()
    const cookieStore = {
      set: (name: string, value: string, opts?: Record<string, unknown>) => {
        store.set(name, value)
        if (opts) options.set(name, opts)
      },
      delete: ({ name }: { name: string }) => {
        store.delete(name)
      },
    }

    const now = Date.now()
    jest.spyOn(Date, "now").mockReturnValue(now)

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
    expect(payload.sessionExpiresAt).toBe(String(now + SESSION_TTL_SECONDS * 1000))
    expect(options.get(SESSION_COOKIE)).toEqual(
      expect.objectContaining({ path: "/", httpOnly: true, sameSite: "lax" })
    )
    expect(options.get(SESSION_COOKIE)).not.toHaveProperty("maxAge")

    jest.restoreAllMocks()
  })

  it("clearSessionCookies removes all session cookies including expiry", () => {
    const store = new Map<string, string>([
      [SESSION_COOKIE, "s"],
      [USER_ID_COOKIE, "u"],
      [ROLE_COOKIE, "HO_ADMIN"],
      [STAFF_ID_COOKIE, "001"],
      [STAFF_NAME_COOKIE, "n"],
      [BRANCH_ID_COOKIE, "b"],
      [BRANCH_CODE_COOKIE, "c"],
      [BRANCH_NAME_COOKIE, "bn"],
      [SESSION_EXPIRES_COOKIE, "9999999999999"],
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

describe("isSessionValid", () => {
  it("accepts future expiry", () => {
    expect(
      isSessionValid({
        sessionId: "sess-1",
        role: "SH_STAFF",
        sessionExpiresAt: String(Date.now() + 60_000),
      })
    ).toBe(true)
  })

  it("rejects expired session", () => {
    expect(
      isSessionValid({
        sessionId: "sess-1",
        role: "SH_STAFF",
        sessionExpiresAt: String(Date.now() - 1),
      })
    ).toBe(false)
  })

  it("rejects legacy cookies without expiry", () => {
    expect(
      isSessionValid({
        sessionId: "sess-legacy",
        role: "SH_STAFF",
      })
    ).toBe(false)
  })
})
