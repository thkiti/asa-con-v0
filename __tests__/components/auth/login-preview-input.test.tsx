/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot } from "react-dom/client"
import {
  formatPreviewLabel,
  LoginPreviewInput,
} from "@/components/auth/LoginPreviewInput"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

describe("LoginPreviewInput", () => {
  it("formatPreviewLabel joins with bullet", () => {
    expect(formatPreviewLabel("001", "Admin")).toBe("001 • Admin")
  })

  it("shows success label in input when blurred", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <LoginPreviewInput
          id="test-staff"
          name="staffId"
          label="Staff"
          inputRef={{ current: null }}
          rawValue="001"
          focused={false}
          onFocus={() => {}}
          onBlur={() => {}}
          onChange={() => {}}
          onKeyDown={() => {}}
          successLabel="Admin User"
        />
      )
    })

    const input = container.querySelector("input") as HTMLInputElement
    expect(input.value).toBe("001 • Admin User")
    expect(
      container.querySelector('[data-testid="staffId-status-success"]')
    ).not.toBeNull()
  })

  it("shows raw value when focused", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <LoginPreviewInput
          id="test-staff"
          name="staffId"
          label="Staff"
          inputRef={{ current: null }}
          rawValue="001"
          focused
          onFocus={() => {}}
          onBlur={() => {}}
          onChange={() => {}}
          onKeyDown={() => {}}
          successLabel="Admin User"
        />
      )
    })

    const input = container.querySelector("input") as HTMLInputElement
    expect(input.value).toBe("001")
  })

  it("shows error inside input with destructive border", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <LoginPreviewInput
          id="test-branch"
          name="branchCode"
          label="Branch"
          inputRef={{ current: null }}
          rawValue="SH001"
          focused={false}
          onFocus={() => {}}
          onBlur={() => {}}
          onChange={() => {}}
          onKeyDown={() => {}}
          errorLabel="พนักงานไม่สังกัดสาขานี้"
        />
      )
    })

    const input = container.querySelector("input") as HTMLInputElement
    expect(input.value).toBe("SH001 • พนักงานไม่สังกัดสาขานี้")
    expect(input.className).toContain("border-red-600")
    expect(
      container.querySelector('[data-testid="branchCode-status-error"]')
    ).not.toBeNull()
  })
})
