import {
  LoginRequestError,
  postBranchPreview,
  postCredentialLogin,
  postStaffPreview,
} from "@/lib/auth/login-client"

describe("postStaffPreview", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("posts staffId and returns preview", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        staffId: "001",
        staffName: "Admin",
        branchId: "b1",
        branchCode: "HO999",
        branchName: "Head Office",
      }),
    })

    const result = await postStaffPreview({ staffId: "001" })

    expect(global.fetch).toHaveBeenCalledWith("/api/auth/staff-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: "001" }),
    })
    expect(result.staffId).toBe("001")
    expect(result).not.toHaveProperty("role")
  })

  it("throws mapped error on NOT_FOUND", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "ไม่พบข้อมูล", code: "NOT_FOUND" }),
    })

    await expect(postStaffPreview({ staffId: "999" })).rejects.toMatchObject({
      message: "ไม่พบข้อมูล",
      code: "NOT_FOUND",
    })
  })
})

describe("postBranchPreview", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("posts branchCode and returns preview", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        branchId: "b1",
        branchCode: "HO999",
        branchName: "Head Office",
      }),
    })

    const result = await postBranchPreview({ branchCode: "HO999" })
    expect(result.branchCode).toBe("HO999")
  })
})

describe("postCredentialLogin", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("posts username, password, branchCode to login API", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        redirectTo: "/shop/stock-documents",
        user: {
          userId: "uid-1",
          staffId: "001",
          name: "Admin",
          role: "HO_ADMIN",
          branchId: "branch-1",
          branchCode: "HO999",
          branchName: "Head Office",
        },
      }),
    })

    const result = await postCredentialLogin({
      username: "001",
      password: "1234",
      branchCode: "HO999",
      returnTo: "/shop",
    })

    expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "001",
        password: "1234",
        branchCode: "HO999",
        returnTo: "/shop",
      }),
    })
    expect(result.redirectTo).toBe("/shop/stock-documents")
    expect(result.user.staffId).toBe("001")
    expect(result.user).not.toHaveProperty("sessionId")
  })

  it("throws mapped error on INVALID_CREDENTIALS", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        code: "INVALID_CREDENTIALS",
      }),
    })

    await expect(
      postCredentialLogin({
        username: "001",
        password: "wrong",
        branchCode: "HO999",
      })
    ).rejects.toMatchObject({
      message: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง",
      code: "INVALID_CREDENTIALS",
    })
    await expect(
      postCredentialLogin({
        username: "001",
        password: "wrong",
        branchCode: "HO999",
      })
    ).rejects.toBeInstanceOf(LoginRequestError)
  })
})
