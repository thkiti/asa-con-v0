import { POST as POSTBranchPreview } from "@/app/api/auth/branch-preview/route"
import { PATCH as PATCHDocumentEntity } from "@/app/api/auth/document-entity/route"
import { POST as POSTLogin } from "@/app/api/auth/login/route"
import { POST as POSTLogout } from "@/app/api/auth/logout/route"
import { POST as POSTStaffPreview } from "@/app/api/auth/staff-preview/route"
import { GET as GETSession } from "@/app/api/auth/session/route"
import type { SessionUser } from "@/lib/auth/types"

const mockCredentialLogin = jest.fn()
const mockPreviewStaffByStaffId = jest.fn()
const mockPreviewBranchByCode = jest.fn()
const mockSetSessionCookies = jest.fn()
const mockClearSessionCookies = jest.fn()
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

const { LoginPreviewError } = jest.requireActual<
  typeof import("@/lib/auth/login-preview")
>("@/lib/auth/login-preview")

jest.mock("@/lib/auth/staff-preview", () => ({
  previewStaffByStaffId: (...args: unknown[]) =>
    mockPreviewStaffByStaffId(...args),
}))

jest.mock("@/lib/auth/branch-preview", () => ({
  previewBranchByCode: (...args: unknown[]) => mockPreviewBranchByCode(...args),
}))

jest.mock("@/lib/auth/session-cookies", () => ({
  setSessionCookies: (...args: unknown[]) => mockSetSessionCookies(...args),
  clearSessionCookies: (...args: unknown[]) => mockClearSessionCookies(...args),
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
  documentEntityCode: "AS",
}

const apiUser = {
  userId: "staff-internal-1",
  staffId: "001",
  name: "Admin User",
  role: "HO_ADMIN",
  branchId: "branch-ho",
  branchCode: "HO999",
  branchName: "Head Office",
  documentEntityCode: "AS",
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.mockResolvedValue({ set: jest.fn(), delete: jest.fn() })
    mockCredentialLogin.mockResolvedValue({
      sessionUser,
      redirectTo: "/main",
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
          branchCode: "HO999",
          returnTo: "/shop",
        }),
      })
    )

    expect(res.status).toBe(200)
    expect(mockCredentialLogin).toHaveBeenCalledWith({
      username: "001",
      password: "1234",
      branchCode: "HO999",
      returnTo: "/shop",
      documentEntityCode: undefined,
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
        body: JSON.stringify({
          username: "001",
          password: "1234",
          branchCode: "HO999",
        }),
      })
    )

    const body = await res.json()
    expect(mockSetSessionCookies).toHaveBeenCalledWith(cookieStore, sessionUser)
    expect(body).toEqual({
      redirectTo: "/main",
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
      branchCode: "",
      returnTo: undefined,
      documentEntityCode: undefined,
    })
    expect(mockSetSessionCookies).not.toHaveBeenCalled()
  })
})

describe("POST /api/auth/staff-preview", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPreviewStaffByStaffId.mockResolvedValue({
      staffId: "001",
      staffName: "Admin User",
      role: "HO_ADMIN",
      branchId: "branch-ho",
      branchCode: "HO999",
      branchName: "Head Office",
      allowAnyBranchLogin: false,
    })
  })

  it("returns staff preview with role", async () => {
    const res = await POSTStaffPreview(
      new Request("http://localhost/api/auth/staff-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: "001" }),
      })
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      staffId: "001",
      staffName: "Admin User",
      role: "HO_ADMIN",
      branchId: "branch-ho",
      branchCode: "HO999",
      branchName: "Head Office",
      allowAnyBranchLogin: false,
    })
    expect(body).not.toHaveProperty("password")
  })

  it("returns 404 NOT_FOUND when staff missing", async () => {
    mockPreviewStaffByStaffId.mockRejectedValue(new LoginPreviewError())

    const res = await POSTStaffPreview(
      new Request("http://localhost/api/auth/staff-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: "999" }),
      })
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe("NOT_FOUND")
  })
})

describe("POST /api/auth/branch-preview", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPreviewBranchByCode.mockResolvedValue({
      branchId: "branch-ho",
      branchCode: "HO999",
      branchName: "Head Office",
      branchType: "HO",
    })
  })

  it("returns branch preview", async () => {
    const res = await POSTBranchPreview(
      new Request("http://localhost/api/auth/branch-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchCode: "HO999" }),
      })
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      branchId: "branch-ho",
      branchCode: "HO999",
      branchName: "Head Office",
      branchType: "HO",
    })
    expect(body).not.toHaveProperty("role")
  })

  it("returns 404 NOT_FOUND when branch missing", async () => {
    mockPreviewBranchByCode.mockRejectedValue(new LoginPreviewError())

    const res = await POSTBranchPreview(
      new Request("http://localhost/api/auth/branch-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchCode: "NONE" }),
      })
    )

    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe("NOT_FOUND")
  })
})

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.mockResolvedValue({ set: jest.fn(), delete: jest.fn() })
  })

  it("clears session cookies and returns login redirect", async () => {
    const cookieStore = { set: jest.fn(), delete: jest.fn() }
    mockCookies.mockResolvedValue(cookieStore)

    const res = await POSTLogout()
    expect(res.status).toBe(200)
    expect(mockClearSessionCookies).toHaveBeenCalledWith(cookieStore)
    await expect(res.json()).resolves.toEqual({ redirectTo: "/login" })
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

describe("PATCH /api/auth/document-entity", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.mockResolvedValue({ set: jest.fn(), delete: jest.fn() })
  })

  it("updates session entity for HO999 HO_FINANCE", async () => {
    const cookieStore = { set: jest.fn(), delete: jest.fn() }
    mockCookies.mockResolvedValue(cookieStore)
    mockGetSession.mockResolvedValue({
      ...sessionUser,
      role: "HO_FINANCE",
    })

    const res = await PATCHDocumentEntity(
      new Request("http://localhost/api/auth/document-entity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentEntityCode: "AD" }),
      })
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.documentEntityCode).toBe("AD")
    expect(mockSetSessionCookies).toHaveBeenCalledWith(
      cookieStore,
      expect.objectContaining({ documentEntityCode: "AD" })
    )
  })

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await PATCHDocumentEntity(
      new Request("http://localhost/api/auth/document-entity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentEntityCode: "AD" }),
      })
    )

    expect(res.status).toBe(401)
  })

  it("returns 403 for shop session", async () => {
    mockGetSession.mockResolvedValue({
      ...sessionUser,
      role: "SH_STAFF",
      branchCode: "SH001",
    })

    const res = await PATCHDocumentEntity(
      new Request("http://localhost/api/auth/document-entity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentEntityCode: "AD" }),
      })
    )

    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe("DOCUMENT_ENTITY_NOT_ALLOWED")
  })
})
