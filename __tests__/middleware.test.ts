import { NextRequest } from "next/server"
import { middleware } from "@/middleware"
import { SESSION_EXPIRES_COOKIE } from "@/lib/auth/cookies"

function requestFor(pathname: string, cookies: Record<string, string> = {}) {
  const url = new URL(pathname, "http://localhost")
  const req = new NextRequest(url)
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value)
  }
  return req
}

function validShopSessionCookies(): Record<string, string> {
  return {
    sessionId: "sess-1",
    role: "SH_STAFF",
    staffId: "002",
    [SESSION_EXPIRES_COOKIE]: String(Date.now() + 60_000),
  }
}

describe("middleware API bypass", () => {
  it("passes /api/finance/periods through without redirect", () => {
    const res = middleware(requestFor("/api/finance/periods"))
    expect(res.status).toBe(200)
    expect(res.headers.get("location")).toBeNull()
  })

  it("passes /api/pos/checkout through without redirect", () => {
    const res = middleware(requestFor("/api/pos/checkout"))
    expect(res.status).toBe(200)
    expect(res.headers.get("location")).toBeNull()
  })

  it("passes bypassed API routes through without session cookies", () => {
    const res = middleware(requestFor("/api/finance/periods"))
    expect(res.status).toBe(200)
    expect(res.headers.get("location")).toBeNull()
  })
})

describe("middleware page protection", () => {
  it("redirects unauthenticated /finance pages to login", () => {
    const res = middleware(requestFor("/finance/periods"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/login")
  })

  it("redirects unauthorized roles on protected pages", () => {
    const res = middleware(
      requestFor("/finance/periods", {
        sessionId: "sess-1",
        role: "SH_STAFF",
        [SESSION_EXPIRES_COOKIE]: String(Date.now() + 60_000),
      })
    )
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/unauthorized")
  })

  it("allows authorized roles on protected pages", () => {
    const res = middleware(
      requestFor("/finance/periods", {
        sessionId: "sess-1",
        role: "HO_FINANCE",
        [SESSION_EXPIRES_COOKIE]: String(Date.now() + 60_000),
      })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("location")).toBeNull()
  })

  it("redirects unauthenticated /shop to login", () => {
    const res = middleware(requestFor("/shop"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/login")
  })

  it("allows /shop for valid SH_STAFF session", () => {
    const res = middleware(requestFor("/shop", validShopSessionCookies()))
    expect(res.status).toBe(200)
    expect(res.headers.get("location")).toBeNull()
  })

  it("redirects /shop to login when session is expired", () => {
    const res = middleware(
      requestFor("/shop", {
        sessionId: "sess-1",
        role: "SH_STAFF",
        [SESSION_EXPIRES_COOKIE]: String(Date.now() - 1),
      })
    )
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/login")
  })

  it("redirects authenticated SH_STAFF from / to /shop", () => {
    const res = middleware(requestFor("/", validShopSessionCookies()))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/shop")
  })

  it("redirects unauthenticated / to login", () => {
    const res = middleware(requestFor("/"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/login")
  })

  it("redirects SH_STAFF away from HO main menu to branch screen", () => {
    const res = middleware(
      requestFor("/main", validShopSessionCookies())
    )
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/shop")
  })

  it("redirects SH_STAFF away from HO main menu section pages", () => {
    const res = middleware(
      requestFor("/main/operations", validShopSessionCookies())
    )
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/shop")
  })
})

describe("middleware unrelated API behavior", () => {
  it("redirects unauthenticated non-bypass API paths to login", () => {
    const res = middleware(requestFor("/api/stock/summary"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/login")
  })
})
