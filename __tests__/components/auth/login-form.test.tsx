/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { LoginForm } from "@/components/auth/LoginForm"
import {
  LoginRequestError,
  postCredentialLogin,
} from "@/lib/auth/login-client"
import { mapLoginErrorCode } from "@/lib/auth/login-ui-messages"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

function setInputValue(element: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

jest.mock("@/lib/auth/login-client", () => ({
  LoginRequestError: class LoginRequestError extends Error {
    readonly code: string | undefined
    constructor(message: string, code?: string) {
      super(message)
      this.name = "LoginRequestError"
      this.code = code
    }
  },
  postCredentialLogin: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: () => "",
  }),
}))

const mockPostCredentialLogin = postCredentialLogin as jest.MockedFunction<
  typeof postCredentialLogin
>

function renderLoginForm(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<LoginForm />)
  })
  return { container, root }
}

describe("LoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
  })

  it("renders username and password fields with Thai labels", () => {
    const html = renderToStaticMarkup(<LoginForm />)

    expect(html).toContain("เข้าสู่ระบบด้วยรหัสพนักงานและรหัสผ่าน")
    expect(html).toContain(">รหัสพนักงาน<")
    expect(html).toContain(">รหัสผ่าน<")
    expect(html).toContain('name="username"')
    expect(html).toContain('name="password"')
    expect(html).toContain('type="password"')
    expect(html).toContain('autoComplete="username"')
    expect(html).toContain('autoComplete="current-password"')
  })

  it("does not render bootstrap or staffId-only login copy", () => {
    const html = renderToStaticMarkup(<LoginForm />)

    expect(html).not.toContain("bootstrap")
    expect(html).not.toContain("ไม่มีการตรวจรหัสผ่าน")
    expect(html).not.toContain(">staffId<")
    expect(html).not.toContain('name="staffId"')
  })

  it("disables submit until username and password are provided", () => {
    const html = renderToStaticMarkup(<LoginForm />)

    expect(html).toContain('type="submit"')
    expect(html).toContain("disabled=")
    expect(html).not.toContain('name="staffId"')
  })

  it("does not render post-login staff session panel", () => {
    const html = renderToStaticMarkup(<LoginForm />)

    expect(html).not.toContain(">Session<")
    expect(html).not.toContain("branchCode —")
  })

  it("submits username and password via credential login", async () => {
    mockPostCredentialLogin.mockResolvedValue({
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
    })

    const { container } = renderLoginForm()
    const usernameInput = container.querySelector(
      'input[name="username"]'
    ) as HTMLInputElement
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement

    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement

    await act(async () => {
      setInputValue(usernameInput, "001")
      setInputValue(passwordInput, "secret")
    })

    expect(submit.disabled).toBe(false)

    await act(async () => {
      form.requestSubmit(submit)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockPostCredentialLogin).toHaveBeenCalledWith({
      username: "001",
      password: "secret",
      returnTo: undefined,
    })
  })

  it("cannot submit with staffId-only (no staffId field, password required)", async () => {
    const { container } = renderLoginForm()

    expect(container.querySelector('input[name="staffId"]')).toBeNull()

    const usernameInput = container.querySelector(
      'input[name="username"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement

    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement

    await act(async () => {
      setInputValue(usernameInput, "001")
    })

    await act(async () => {
      form.requestSubmit(submit)
      await Promise.resolve()
    })

    expect(mockPostCredentialLogin).not.toHaveBeenCalled()
    expect(submit.disabled).toBe(true)
  })

  it.each([
    ["INVALID_CREDENTIALS", "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง"],
    ["USERNAME_REQUIRED", "กรุณากรอกรหัสพนักงาน"],
    ["PASSWORD_REQUIRED", "กรุณากรอกรหัสผ่าน"],
    ["BRANCH_INACTIVE", "สาขานี้ไม่สามารถใช้งานได้"],
    ["DEV_STAFF_NOT_ALLOWED", "ไม่อนุญาตให้ใช้บัญชีนี้"],
  ] as const)("renders error message for %s", async (code, message) => {
    mockPostCredentialLogin.mockRejectedValue(
      new LoginRequestError(mapLoginErrorCode(code), code)
    )

    const { container } = renderLoginForm()
    const usernameInput = container.querySelector(
      'input[name="username"]'
    ) as HTMLInputElement
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement

    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement

    await act(async () => {
      setInputValue(usernameInput, "001")
      setInputValue(passwordInput, "x")
    })

    await act(async () => {
      form.requestSubmit(submit)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const alert = container.querySelector('[role="alert"]')
    expect(alert?.textContent).toBe(message)
  })
})
