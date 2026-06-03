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

async function flushAsyncUpdates(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
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
    mockPostStaffPreview.mockReset()
    mockPostBranchPreview.mockReset()
    mockPostCredentialLogin.mockReset()
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    window.localStorage.clear()
    mockPostStaffPreview.mockResolvedValue(staffPreview)
    mockPostBranchPreview.mockResolvedValue(branchPreview)
  })

  it("renders staff, branch, and password fields without preview paragraphs", () => {
    const html = renderToStaticMarkup(wrapLoginForm())

    expect(html).toContain(">รหัสพนักงาน<")
    expect(html).toContain(">รหัสสาขา<")
    expect(html).toContain(">รหัสผ่าน<")
    expect(html).toContain('name="staffId"')
    expect(html).toContain('name="branchCode"')
    expect(html).toContain('name="password"')
    expect(html).not.toContain("staff-preview-line")
    expect(html).not.toContain("branch-preview-line")
  })

  it("staff Enter moves focus to branch after preview", async () => {
    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchInput = container.querySelector(
      'input[name="branchCode"]'
    ) as HTMLInputElement

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(mockPostStaffPreview).toHaveBeenCalledWith({ staffId: "001" })
    expect(mockPostCredentialLogin).not.toHaveBeenCalled()
    expect(staffInput.value).toBe("001 • Admin User")
    expect(document.activeElement).toBe(branchInput)
    expect(branchInput.disabled).toBe(false)
  })

  it("shows raw staffId on focus after successful preview", async () => {
    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(staffInput.value).toBe("001 • Admin User")

    await act(async () => {
      staffInput.focus()
    })

    expect(staffInput.value).toBe("001")
  })

  it("branch Enter moves focus to password after matched preview", async () => {
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

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
    })

    await act(async () => {
      setInputValue(branchInput, "HO999")
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(mockPostBranchPreview).toHaveBeenCalledWith({ branchCode: "HO999" })
    expect(branchInput.value).toBe("HO999 • Head Office")
    expect(document.activeElement).toBe(passwordInput)
    expect(passwordInput.disabled).toBe(false)
    expect(mockPostCredentialLogin).not.toHaveBeenCalled()
  })

  it("password Enter submits login after preview chain", async () => {
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
    const requestSubmitSpy = jest.spyOn(form, "requestSubmit")

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
      setInputValue(branchInput, "HO999")
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
      setInputValue(passwordInput, "secret")
      keyDown(passwordInput, "Enter")
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(requestSubmitSpy).toHaveBeenCalled()
    expect(mockPostCredentialLogin).toHaveBeenCalledWith({
      username: "001",
      password: "secret",
      branchCode: "HO999",
      returnTo: undefined,
    })
  })

  it("preview display does not break focus after branch mismatch correction", async () => {
    mockPostBranchPreview
      .mockResolvedValueOnce({
        branchId: "branch-other",
        branchCode: "SH001",
        branchName: "Shop 1",
      })
      .mockResolvedValueOnce(branchPreview)

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

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
      setInputValue(branchInput, "SH001")
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(document.activeElement).toBe(branchInput)
    expect(branchInput.value).toBe("SH001 • พนักงานไม่สังกัดสาขานี้")

    await act(async () => {
      branchInput.focus()
      setInputValue(branchInput, "HO999")
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(mockPostBranchPreview).toHaveBeenCalledTimes(2)
    expect(branchInput.value).toBe("HO999 • Head Office")
    expect(document.activeElement).toBe(passwordInput)
    expect(passwordInput.disabled).toBe(false)
  })

  it("shows branch mismatch error inside branch input", async () => {
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

    expect(branchInput.value).toBe("SH001 • พนักงานไม่สังกัดสาขานี้")
    expect(branchInput.className).toContain("border-red-600")
    expect(
      container.querySelector('[data-testid="branchCode-status-error"]')
    ).not.toBeNull()
    expect(
      container.querySelector("#login-branch-code-error")?.textContent
    ).toBe("พนักงานไม่สังกัดสาขานี้")
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

  it("invalid staff Enter shows error in staff input", async () => {
    mockPostStaffPreview.mockRejectedValue(
      new LoginRequestError("ไม่พบข้อมูล", "NOT_FOUND")
    )

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement

    await act(async () => {
      setInputValue(staffInput, "999")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(mockPostStaffPreview).toHaveBeenCalledTimes(1)
    expect(staffInput.value).toBe("999 • ไม่พบข้อมูล")
    expect(staffInput.className).toContain("border-red-600")
    expect(
      container.querySelector("#login-staff-id-error")?.textContent
    ).toBe("ไม่พบข้อมูล")
    expect(document.activeElement).toBe(staffInput)
  })

  it("staff Enter after error clears field and keeps focus on staff", async () => {
    mockPostStaffPreview.mockRejectedValue(
      new LoginRequestError("ไม่พบข้อมูล", "NOT_FOUND")
    )

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchInput = container.querySelector(
      'input[name="branchCode"]'
    ) as HTMLInputElement

    await act(async () => {
      setInputValue(staffInput, "999")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
    })

    const callsBeforeRetry = mockPostStaffPreview.mock.calls.length

    await act(async () => {
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(staffInput.value).toBe("")
    expect(staffInput.className).not.toContain("border-red-600")
    expect(document.activeElement).toBe(staffInput)
    expect(mockPostStaffPreview.mock.calls.length).toBe(callsBeforeRetry)
    expect(branchInput.disabled).toBe(true)
  })

  it("invalid branch Enter shows error in branch input", async () => {
    mockPostBranchPreview.mockRejectedValue(
      new LoginRequestError("ไม่พบข้อมูล", "NOT_FOUND")
    )

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchInput = container.querySelector(
      'input[name="branchCode"]'
    ) as HTMLInputElement

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
      setInputValue(branchInput, "NONE")
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(branchInput.value).toBe("NONE • ไม่พบข้อมูล")
    expect(branchInput.className).toContain("border-red-600")
    expect(
      container.querySelector("#login-branch-code-error")?.textContent
    ).toBe("ไม่พบข้อมูล")
    expect(document.activeElement).toBe(branchInput)
  })

  it("branch Enter after error clears field and keeps focus on branch", async () => {
    mockPostBranchPreview.mockRejectedValue(
      new LoginRequestError("ไม่พบข้อมูล", "NOT_FOUND")
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

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
      setInputValue(branchInput, "NONE")
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
    })

    const callsBeforeRetry = mockPostBranchPreview.mock.calls.length

    await act(async () => {
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(branchInput.value).toBe("")
    expect(branchInput.className).not.toContain("border-red-600")
    expect(document.activeElement).toBe(branchInput)
    expect(mockPostBranchPreview.mock.calls.length).toBe(callsBeforeRetry)
    expect(passwordInput.disabled).toBe(true)
    expect(staffInput.value).toBe("001 • Admin User")
  })

  it("branch mismatch Enter after error clears field and keeps focus on branch", async () => {
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

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
      setInputValue(branchInput, "SH001")
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(branchInput.value).toContain("พนักงานไม่สังกัดสาขานี้")

    await act(async () => {
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(branchInput.value).toBe("")
    expect(document.activeElement).toBe(branchInput)
    expect(staffInput.value).toBe("001 • Admin User")
    expect(mockPostBranchPreview).toHaveBeenCalledTimes(1)
  })

  it("wrong password Enter after error clears password and keeps focus", async () => {
    mockPostCredentialLogin.mockRejectedValue(
      new LoginRequestError(
        mapLoginErrorCode("INVALID_CREDENTIALS"),
        "INVALID_CREDENTIALS"
      )
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
      await flushAsyncUpdates()
      setInputValue(branchInput, "HO999")
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
      setInputValue(passwordInput, "wrong")
      form.requestSubmit(submit)
      await flushAsyncUpdates()
    })

    expect(passwordInput.value).toBe("wrong")
    expect(
      container.querySelector('[data-testid="login-error-message"]')?.textContent
    ).toBe("รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง")

    const loginCallsBeforeRetry = mockPostCredentialLogin.mock.calls.length

    await act(async () => {
      keyDown(passwordInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(passwordInput.value).toBe("")
    expect(passwordInput.className).not.toContain("border-red-600")
    expect(
      container.querySelector('[data-testid="login-error-message"]')
    ).toBeNull()
    expect(document.activeElement).toBe(passwordInput)
    expect(staffInput.value).toBe("001 • Admin User")
    expect(branchInput.value).toBe("HO999 • Head Office")
    expect(mockPostCredentialLogin.mock.calls.length).toBe(loginCallsBeforeRetry)
  })

  it("successful Enter flow staff to branch to password to submit", async () => {
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

    await act(async () => {
      setInputValue(staffInput, "001")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
    })
    expect(document.activeElement).toBe(branchInput)

    await act(async () => {
      setInputValue(branchInput, "HO999")
      keyDown(branchInput, "Enter")
      await flushAsyncUpdates()
    })
    expect(document.activeElement).toBe(passwordInput)

    await act(async () => {
      setInputValue(passwordInput, "secret")
      keyDown(passwordInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(mockPostCredentialLogin).toHaveBeenCalledWith({
      username: "001",
      password: "secret",
      branchCode: "HO999",
      returnTo: undefined,
    })
    expect(form).toBeTruthy()
  })

  it.each([
    ["INVALID_CREDENTIALS", "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง"],
    ["BRANCH_MISMATCH", "พนักงานไม่สังกัดสาขานี้"],
  ] as const)("renders login error for %s", async (code, message) => {
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

    expect(
      container.querySelector('[data-testid="login-error-message"]')?.textContent
    ).toBe(message)
    expect(passwordInput.className).toContain("border-red-600")
  })
})
