import {
  LoginRequestError,
  postCredentialLogin,
} from "@/lib/auth/login-client"

describe("postCredentialLogin", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("posts username and password to login API and honors returnTo redirect", async () => {
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
      returnTo: "/shop",
    })

    expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "001",
        password: "1234",
        returnTo: "/shop",
      }),
    })
    expect(result.redirectTo).toBe("/shop/stock-documents")
    expect(result.user.staffId).toBe("001")
    expect(result.user).not.toHaveProperty("sessionId")
  })

  it("does not send staffId-only payload", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        redirectTo: "/main",
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

    await postCredentialLogin({ username: "001", password: "1234" })

    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string
    )
    expect(body).toEqual({
      username: "001",
      password: "1234",
      returnTo: undefined,
    })
    expect(body).not.toHaveProperty("staffId")
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
      postCredentialLogin({ username: "001", password: "wrong" })
    ).rejects.toMatchObject({
      message: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง",
      code: "INVALID_CREDENTIALS",
    })
    await expect(
      postCredentialLogin({ username: "001", password: "wrong" })
    ).rejects.toBeInstanceOf(LoginRequestError)
  })
})
