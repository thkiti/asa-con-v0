import { POST as POSTLogin } from "@/app/api/auth/login/route"
import { GET as GETSession } from "@/app/api/auth/session/route"
import type { SessionUser } from "@/lib/auth/types"

const mockCredentialLogin = jest.fn()
const mockSetSessionCookies = jest.fn()
const mockGetSession = jest.fn()
const mockCookies = jest.fn()

jest.mock("@/lib/auth/credential-login", () => {
  const actual = jest.requireActual<typeof import("@/lib/auth/credential-login")>(
    "@/lib/auth/credential-login"
  )
  return {
    ...actual,
    credentialLogin: (...args: unknown[]) => mockCredentialLogin(...args),
  }
})

const { CredentialLoginError, CREDENTIAL_LOGIN_INVALID_MESSAGE } =
  jest.requireActual<typeof import("@/lib/auth/credential-login")>(
    "@/lib/auth/credential-login"
  )

jest.mock("@/lib/auth/session-cookies", () => ({
  setSessionCookies: (...args: unknown[]) => mockSetSessionCookies(...args),
}))

jest.mock("@/lib/auth", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

jest.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}))

const sessionUser: SessionUser = {
  sessionId: "sess-abc",
  userId: "staff-internal-1",
  role: "HO_ADMIN",
  staffId: "001",
  name: "Admin User",
  branchId: "branch-ho",
  branchCode: "HO999",
  branchName: "Head Office",
}

const apiUser = {
  userId: "staff-internal-1",
  staffId: "001",
  name: "Admin User",
  role: "HO_ADMIN",
  branchId: "branch-ho",
  branchCode: "HO999",
  branchName: "Head Office",
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.mockResolvedValue({ set: jest.fn(), delete: jest.fn() })
    mockCredentialLogin.mockResolvedValue({
      sessionUser,
      redirectTo: "/shop/stock-documents",
    })
  })

  it("calls credentialLogin with username and password", async () => {
    const res = await POSTLogin(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "001",
          password: "1234",
          returnTo: "/shop",
        }),
      })
    )

    expect(res.status).toBe(200)
    expect(mockCredentialLogin).toHaveBeenCalledWith({
      username: "001",
      password: "1234",
      returnTo: "/shop",
    })
    expect(mockCredentialLogin).not.toHaveBeenCalledWith(
      expect.objectContaining({ staffId: expect.anything() })
    )
  })

  it("sets session cookies and returns user without sessionId", async () => {
    const cookieStore = { set: jest.fn(), delete: jest.fn() }
    mockCookies.mockResolvedValue(cookieStore)

    const res = await POSTLogin(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "001", password: "1234" }),
      })
    )

    const body = await res.json()
    expect(mockSetSessionCookies).toHaveBeenCalledWith(cookieStore, sessionUser)
    expect(body).toEqual({
      redirectTo: "/shop/stock-documents",
      user: apiUser,
    })
    expect(body.user).not.toHaveProperty("sessionId")
    expect(body).not.toHaveProperty("staff")
  })

  it("returns 401 on wrong password", async () => {
    mockCredentialLogin.mockRejectedValue(
      new CredentialLoginError(
        CREDENTIAL_LOGIN_INVALID_MESSAGE,
        "INVALID_CREDENTIALS",
        401
      )
    )

    const res = await POSTLogin(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "001", password: "wrong" }),
      })
    )

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("INVALID_CREDENTIALS")
    expect(mockSetSessionCookies).not.toHaveBeenCalled()
  })

  it("returns 400 on missing password", async () => {
    mockCredentialLogin.mockRejectedValue(
      new CredentialLoginError("Password is required", "PASSWORD_REQUIRED", 400)
    )

    const res = await POSTLogin(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "001", password: "" }),
      })
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe("PASSWORD_REQUIRED")
  })

  it("returns 400 on missing username", async () => {
    mockCredentialLogin.mockRejectedValue(
      new CredentialLoginError("Username is required", "USERNAME_REQUIRED", 400)
    )

    const res = await POSTLogin(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "", password: "1234" }),
      })
    )

    expect(res.status).toBe(400)
  })

  it("fails staffId-only login attempt without password", async () => {
    mockCredentialLogin.mockRejectedValue(
      new CredentialLoginError("Password is required", "PASSWORD_REQUIRED", 400)
    )

    const res = await POSTLogin(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: "001" }),
      })
    )

    expect(res.status).toBe(400)
    expect(mockCredentialLogin).toHaveBeenCalledWith({
      username: "",
      password: "",
      returnTo: undefined,
    })
    expect(mockSetSessionCookies).not.toHaveBeenCalled()
  })
})

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns full user shape when session exists", async () => {
    mockGetSession.mockResolvedValue(sessionUser)

    const res = await GETSession()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toEqual(apiUser)
    expect(body.user).not.toHaveProperty("sessionId")
  })

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await GETSession()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ user: null })
  })
})
