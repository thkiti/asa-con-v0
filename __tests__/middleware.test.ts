import { NextRequest } from "next/server"
import { middleware } from "@/middleware"

function requestFor(pathname: string, cookies: Record<string, string> = {}) {
  const url = new URL(pathname, "http://localhost")
  const req = new NextRequest(url)
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value)
  }
  return req
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
      })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("location")).toBeNull()
  })
})

describe("middleware unrelated API behavior", () => {
  it("redirects unauthenticated non-bypass API paths to login", () => {
    const res = middleware(requestFor("/api/stock/summary"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost/login")
  })
})
