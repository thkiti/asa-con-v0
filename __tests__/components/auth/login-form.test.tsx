/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { LoginForm } from "@/components/auth/LoginForm"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import {
  LoginRequestError,
  postBranchPreview,
  postCredentialLogin,
  postStaffPreview,
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

function keyDown(element: HTMLElement, key: string): void {
  element.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  )
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
  postStaffPreview: jest.fn(),
  postBranchPreview: jest.fn(),
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

const mockPostStaffPreview = postStaffPreview as jest.MockedFunction<
  typeof postStaffPreview
>
const mockPostBranchPreview = postBranchPreview as jest.MockedFunction<
  typeof postBranchPreview
>
const mockPostCredentialLogin = postCredentialLogin as jest.MockedFunction<
  typeof postCredentialLogin
>

const staffPreview = {
  staffId: "001",
  staffName: "Admin User",
  branchId: "branch-ho",
  branchCode: "HO999",
  branchName: "Head Office",
}

const branchPreview = {
  branchId: "branch-ho",
  branchCode: "HO999",
  branchName: "Head Office",
}

function wrapLoginForm() {
  return (
    <ThemeProvider>
      <LoginForm />
    </ThemeProvider>
  )
}

function renderLoginForm(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(wrapLoginForm())
  })
  return { container, root }
}

describe("LoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    window.localStorage.clear()
    mockPostStaffPreview.mockResolvedValue(staffPreview)
    mockPostBranchPreview.mockResolvedValue(branchPreview)
  })

  it("renders staff, branch, and password fields", () => {
    const html = renderToStaticMarkup(wrapLoginForm())

    expect(html).toContain(">รหัสพนักงาน<")
    expect(html).toContain(">รหัสสาขา<")
    expect(html).toContain(">รหัสผ่าน<")
    expect(html).toContain('name="staffId"')
    expect(html).toContain('name="branchCode"')
    expect(html).toContain('name="password"')
  })

  it("staffId Enter previews staff and focuses branch", async () => {
    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchInput = container.querySelector(
      'input[name="branchCode"]'
    ) as HTMLInputElement

    const focusSpy = jest.spyOn(branchInput, "focus")

    await act(async () => {
      setInputValue(staffInput, "001")
    })

    await act(async () => {
      keyDown(staffInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockPostStaffPreview).toHaveBeenCalledWith({ staffId: "001" })
    expect(mockPostCredentialLogin).not.toHaveBeenCalled()
    expect(
      container.querySelector('[data-testid="staff-preview-line"]')?.textContent
    ).toBe("001 • Admin User")
    expect(focusSpy).toHaveBeenCalled()
  })

  it("branch Enter previews branch and focuses password when matched", async () => {
    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchInput = container.querySelector(
      'input[name="branchCode"]'
    ) as HTMLInputElement
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement

    const passwordFocusSpy = jest.spyOn(passwordInput, "focus")

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      setInputValue(branchInput, "HO999")
      keyDown(branchInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockPostBranchPreview).toHaveBeenCalledWith({ branchCode: "HO999" })
    expect(
      container.querySelector('[data-testid="branch-preview-line"]')?.textContent
    ).toBe("HO999 • Head Office")
    expect(passwordFocusSpy).toHaveBeenCalled()
    expect(mockPostCredentialLogin).not.toHaveBeenCalled()
  })

  it("shows mismatch error and does not focus password", async () => {
    mockPostBranchPreview.mockResolvedValue({
      branchId: "branch-other",
      branchCode: "SH001",
      branchName: "Shop 1",
    })

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchInput = container.querySelector(
      'input[name="branchCode"]'
    ) as HTMLInputElement
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement

    const passwordFocusSpy = jest.spyOn(passwordInput, "focus")

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      setInputValue(branchInput, "SH001")
      keyDown(branchInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "พนักงานไม่สังกัดสาขานี้"
    )
    expect(passwordFocusSpy).not.toHaveBeenCalled()
    expect(passwordInput.disabled).toBe(true)
  })

  it("submits login with branchCode after previews", async () => {
    mockPostCredentialLogin.mockResolvedValue({
      redirectTo: "/main",
      user: {
        userId: "uid-1",
        staffId: "001",
        name: "Admin User",
        role: "HO_ADMIN",
        branchId: "branch-ho",
        branchCode: "HO999",
        branchName: "Head Office",
      },
    })

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchInput = container.querySelector(
      'input[name="branchCode"]'
    ) as HTMLInputElement
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement
    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      setInputValue(branchInput, "HO999")
      keyDown(branchInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
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
      branchCode: "HO999",
      returnTo: undefined,
    })
  })

  it("does not submit without branch match", async () => {
    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement
    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
      setInputValue(passwordInput, "secret")
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
    ["BRANCH_MISMATCH", "พนักงานไม่สังกัดสาขานี้"],
  ] as const)("renders error message for %s", async (code, message) => {
    mockPostCredentialLogin.mockRejectedValue(
      new LoginRequestError(mapLoginErrorCode(code), code)
    )

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchInput = container.querySelector(
      'input[name="branchCode"]'
    ) as HTMLInputElement
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement
    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
      setInputValue(branchInput, "HO999")
      keyDown(branchInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
      setInputValue(passwordInput, "x")
    })

    await act(async () => {
      form.requestSubmit(submit)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(message)
  })
})
