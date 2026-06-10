/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { LoginForm } from "@/components/auth/LoginForm"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import {
  fetchLoginBranches,
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

function selectBranchValue(select: HTMLSelectElement, code: string): void {
  select.value = code
  select.dispatchEvent(new Event("change", { bubbles: true }))
}

function getBranchSelect(container: ParentNode): HTMLSelectElement {
  return container.querySelector(
    'select[name="branchCode"]'
  ) as HTMLSelectElement
}

async function runStaffEnter(
  container: ParentNode,
  staffCode: string
): Promise<void> {
  const staffInput = container.querySelector(
    'input[name="staffId"]'
  ) as HTMLInputElement

  await act(async () => {
    setInputValue(staffInput, staffCode)
    keyDown(staffInput, "Enter")
    await flushAsyncUpdates()
    await flushAsyncUpdates()
  })
}

async function selectBranch(
  container: ParentNode,
  code: string,
  withEnter = false
): Promise<void> {
  const branchSelect = getBranchSelect(container)

  await act(async () => {
    selectBranchValue(branchSelect, code)
    await flushAsyncUpdates()
    await flushAsyncUpdates()
    if (withEnter) {
      keyDown(branchSelect, "Enter")
      await flushAsyncUpdates()
      await flushAsyncUpdates()
    }
  })
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
  fetchLoginBranches: jest.fn(),
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
const mockFetchLoginBranches = fetchLoginBranches as jest.MockedFunction<
  typeof fetchLoginBranches
>

const shopBranches = [
  { id: "branch-sh-home", code: "SH999", name: "Buffer" },
  { id: "branch-sh-1", code: "SH001", name: "Shop 1" },
]

const staffPreview = {
  staffId: "001",
  staffName: "Admin User",
  role: "HO_ADMIN" as const,
  branchId: "branch-ho",
  branchCode: "HO999",
  branchName: "Head Office",
  allowAnyBranchLogin: false,
}

const shopBranchPreview = {
  branchId: "branch-sh-1",
  branchCode: "SH001",
  branchName: "Shop 1",
  branchType: "SH" as const,
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
    mockFetchLoginBranches.mockReset()
    mockPostStaffPreview.mockReset()
    mockPostBranchPreview.mockReset()
    mockPostCredentialLogin.mockReset()
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    window.localStorage.clear()
    mockFetchLoginBranches.mockResolvedValue(shopBranches)
    mockPostStaffPreview.mockResolvedValue(staffPreview)
    mockPostBranchPreview.mockResolvedValue(shopBranchPreview)
  })

  it("focuses staff input on mount for barcode scan", async () => {
    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement

    await act(async () => {
      await flushAsyncUpdates()
    })

    expect(document.activeElement).toBe(staffInput)
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
    expect(html).not.toContain('placeholder="001"')
    expect(html).toContain("ใส่รหัสพนักงานก่อน")
    expect(html).toContain("<select")
  })

  it("does not fetch shop branches before staff preview", async () => {
    renderLoginForm()
    await act(async () => {
      await flushAsyncUpdates()
    })
    expect(mockFetchLoginBranches).not.toHaveBeenCalled()
  })

  it("starts with empty staff ID and waiting branch field", async () => {
    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)

    await act(async () => {
      await flushAsyncUpdates()
    })

    expect(staffInput.value).toBe("")
    expect(staffInput.placeholder).toBe("")
    expect(branchSelect.value).toBe("")
    expect(branchSelect.disabled).toBe(true)
    expect(branchSelect.options).toHaveLength(1)
    expect(branchSelect.options[0]?.textContent).toBe("ใส่รหัสพนักงานก่อน")
  })

  it("renders active shop branches for replacer after staff preview", async () => {
    mockPostStaffPreview.mockResolvedValue({
      staffId: "002",
      staffName: "Replacer User",
      role: "SH_STAFF",
      branchId: "branch-sh-home",
      branchCode: "SH999",
      branchName: "Buffer",
      allowAnyBranchLogin: true,
    })

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)

    await act(async () => {
      setInputValue(staffInput, "002")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(mockFetchLoginBranches).toHaveBeenCalledTimes(1)
    expect(
      Array.from(branchSelect.options).map((option) => option.textContent)
    ).toEqual([
      "Select branch / เลือกสาขา",
      "SH999 - Buffer",
      "SH001 - Shop 1",
    ])
  })

  it("auto-selects home branch for normal SH_STAFF without fetching shop list", async () => {
    mockPostStaffPreview.mockResolvedValue({
      staffId: "002",
      staffName: "Shop User",
      role: "SH_STAFF",
      branchId: "branch-sh-home",
      branchCode: "SH999",
      branchName: "Buffer",
      allowAnyBranchLogin: false,
    })
    mockPostBranchPreview.mockResolvedValue({
      branchId: "branch-sh-home",
      branchCode: "SH999",
      branchName: "Buffer",
      branchType: "SH",
    })

    const { container } = renderLoginForm()
    const branchSelect = getBranchSelect(container)

    await runStaffEnter(container, "002")

    expect(mockFetchLoginBranches).not.toHaveBeenCalled()
    expect(
      Array.from(branchSelect.options).map((option) => option.value)
    ).toEqual(["", "SH999"])
    expect(branchSelect.value).toBe("SH999")
    expect(mockPostBranchPreview).toHaveBeenCalledWith({ branchCode: "SH999" })
  })

  it("staff Enter moves focus to branch for HO_ADMIN after loading shop branches", async () => {
    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement

    await runStaffEnter(container, "001")

    expect(mockPostStaffPreview).toHaveBeenCalledWith({ staffId: "001" })
    expect(mockFetchLoginBranches).toHaveBeenCalledTimes(1)
    expect(mockPostCredentialLogin).not.toHaveBeenCalled()
    expect(staffInput.value).toBe("001 • Admin User")
    expect(branchSelect.value).toBe("")
    expect(document.activeElement).toBe(branchSelect)
    expect(passwordInput.disabled).toBe(true)
  })

  it("staff Enter moves focus to branch for replacer", async () => {
    mockPostStaffPreview.mockResolvedValue({
      staffId: "002",
      staffName: "Replacer User",
      role: "SH_STAFF",
      branchId: "branch-sh-home",
      branchCode: "SH999",
      branchName: "Buffer",
      allowAnyBranchLogin: true,
    })

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)

    await runStaffEnter(container, "002")

    expect(mockFetchLoginBranches).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(branchSelect)
    expect(branchSelect.disabled).toBe(false)
    expect(staffInput.value).toBe("002 • Replacer User")
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
    const branchSelect = getBranchSelect(container)
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement

    await runStaffEnter(container, "001")
    await selectBranch(container, "SH001")

    await act(async () => {
      keyDown(branchSelect, "Enter")
      await flushAsyncUpdates()
      await flushAsyncUpdates()
    })

    expect(mockPostBranchPreview).toHaveBeenCalledWith({ branchCode: "SH001" })
    expect(branchSelect.value).toBe("SH001")
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
        branchId: "branch-sh-1",
        branchCode: "SH001",
        branchName: "Shop 1",
      },
    })

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement
    const requestSubmitSpy = jest.spyOn(form, "requestSubmit")

    await runStaffEnter(container, "001")
    await selectBranch(container, "SH001", true)

    await act(async () => {
      setInputValue(passwordInput, "secret")
      keyDown(passwordInput, "Enter")
      await flushAsyncUpdates()
      await flushAsyncUpdates()
    })

    expect(requestSubmitSpy).toHaveBeenCalled()
    expect(mockPostCredentialLogin).toHaveBeenCalledWith({
      username: "001",
      password: "secret",
      branchCode: "SH001",
      returnTo: undefined,
    })
  })

  it("HO_ADMIN dropdown offers HO home plus shop branches after preview", async () => {
    const { container } = renderLoginForm()
    const branchSelect = getBranchSelect(container)
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement

    await runStaffEnter(container, "001")

    expect(
      Array.from(branchSelect.options).map((option) => option.value)
    ).toEqual(["", "HO999", "SH999", "SH001"])
    expect(branchSelect.value).toBe("")
    expect(document.activeElement).toBe(branchSelect)
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
        branchId: "branch-sh-1",
        branchCode: "SH001",
        branchName: "Shop 1",
      },
    })

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)
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
      selectBranchValue(branchSelect, "SH001")
      keyDown(branchSelect, "Enter")
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
      branchCode: "SH001",
      returnTo: undefined,
    })
  })

  it("does not submit before staff preview completes", async () => {
    const { container } = renderLoginForm()
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement
    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement

    await act(async () => {
      setInputValue(passwordInput, "secret")
      form.requestSubmit(submit)
      await Promise.resolve()
    })

    expect(mockPostStaffPreview).not.toHaveBeenCalled()
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
    const branchSelect = getBranchSelect(container)

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
    expect(branchSelect.disabled).toBe(true)
  })

  it("invalid branch selection shows error on branch dropdown", async () => {
    mockPostBranchPreview.mockRejectedValue(
      new LoginRequestError("ไม่พบข้อมูล", "NOT_FOUND")
    )

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)

    await runStaffEnter(container, "001")
    await selectBranch(container, "SH001")

    expect(branchSelect.value).toBe("SH001")
    expect(branchSelect.className).toContain("border-red-600")
    expect(
      container.querySelector("#login-branch-code-error")?.textContent
    ).toBe("ไม่พบข้อมูล")
  })

  it("branch Enter after error clears selection and keeps focus on branch", async () => {
    mockPostBranchPreview.mockRejectedValue(
      new LoginRequestError("ไม่พบข้อมูล", "NOT_FOUND")
    )

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement

    await runStaffEnter(container, "001")
    await selectBranch(container, "SH001")

    expect(branchSelect.className).toContain("border-red-600")

    const callsBeforeRetry = mockPostBranchPreview.mock.calls.length

    await act(async () => {
      keyDown(branchSelect, "Enter")
      await flushAsyncUpdates()
      await flushAsyncUpdates()
    })

    expect(branchSelect.value).toBe("")
    expect(branchSelect.className).not.toContain("border-red-600")
    expect(document.activeElement).toBe(branchSelect)
    expect(mockPostBranchPreview.mock.calls.length).toBe(callsBeforeRetry)
    expect(passwordInput.disabled).toBe(true)
    expect(staffInput.value).toBe("001 • Admin User")
  })

  it("allows replacer SH_STAFF to preview another shop branch", async () => {
    mockPostStaffPreview.mockResolvedValue({
      staffId: "002",
      staffName: "Replacer User",
      role: "SH_STAFF",
      branchId: "branch-sh-home",
      branchCode: "SH999",
      branchName: "Buffer",
      allowAnyBranchLogin: true,
    })
    mockPostBranchPreview.mockResolvedValue({
      branchId: "branch-sh-1",
      branchCode: "SH001",
      branchName: "Shop 1",
      branchType: "SH",
    })

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement

    await runStaffEnter(container, "002")
    await selectBranch(container, "SH001", true)

    expect(branchSelect.value).toBe("SH001")
    expect(passwordInput.disabled).toBe(false)
    expect(document.activeElement).toBe(passwordInput)
  })

  it("normal SH_STAFF cannot select cross-branch from dropdown", async () => {
    mockPostStaffPreview.mockResolvedValue({
      staffId: "002",
      staffName: "Shop User",
      role: "SH_STAFF",
      branchId: "branch-sh-home",
      branchCode: "SH999",
      branchName: "Buffer",
      allowAnyBranchLogin: false,
    })

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)

    await act(async () => {
      setInputValue(staffInput, "002")
      keyDown(staffInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(
      Array.from(branchSelect.options).some((option) => option.value === "SH001")
    ).toBe(false)
    expect(container.querySelector('input[name="branchCode"]')).toBeNull()
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
    const branchSelect = getBranchSelect(container)
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement
    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement

    await runStaffEnter(container, "001")
    await selectBranch(container, "SH001", true)

    await act(async () => {
      setInputValue(passwordInput, "wrong")
      form.requestSubmit(submit)
      await flushAsyncUpdates()
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
    expect(branchSelect.value).toBe("SH001")
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
        branchId: "branch-sh-1",
        branchCode: "SH001",
        branchName: "Shop 1",
      },
    })

    const { container } = renderLoginForm()
    const staffInput = container.querySelector(
      'input[name="staffId"]'
    ) as HTMLInputElement
    const branchSelect = getBranchSelect(container)
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement

    await runStaffEnter(container, "001")
    await selectBranch(container, "SH001", true)
    expect(document.activeElement).toBe(passwordInput)

    await act(async () => {
      setInputValue(passwordInput, "secret")
      keyDown(passwordInput, "Enter")
      await flushAsyncUpdates()
    })

    expect(mockPostCredentialLogin).toHaveBeenCalledWith({
      username: "001",
      password: "secret",
      branchCode: "SH001",
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
    const branchSelect = getBranchSelect(container)
    const passwordInput = container.querySelector(
      'input[name="password"]'
    ) as HTMLInputElement
    const form = container.querySelector("form") as HTMLFormElement
    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement

    await runStaffEnter(container, "001")
    await selectBranch(container, "SH001", true)

    await act(async () => {
      setInputValue(passwordInput, "x")
    })

    await act(async () => {
      form.requestSubmit(submit)
      await flushAsyncUpdates()
      await flushAsyncUpdates()
    })

    expect(
      container.querySelector('[data-testid="login-error-message"]')?.textContent
    ).toBe(message)
    expect(passwordInput.className).toContain("border-red-600")
  })
})
