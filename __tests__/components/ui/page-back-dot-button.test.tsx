/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import {
  PageBackDotButton,
  backTooltipFromLabel,
} from "@/components/ui/PageBackDotButton"

const push = jest.fn()
const back = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("backTooltipFromLabel", () => {
  it("strips legacy arrow prefixes", () => {
    expect(backTooltipFromLabel("← Finance")).toBe("Back to Finance")
    expect(backTooltipFromLabel("← Back")).toBe("Back")
    expect(backTooltipFromLabel("Back")).toBe("Back")
  })
})

describe("PageBackDotButton", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    push.mockClear()
    back.mockClear()
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("renders accessible red circular control without a text label", () => {
    const html = renderToStaticMarkup(
      <PageBackDotButton fallbackHref="/finance" tooltip="Back to Finance" />
    )
    expect(html).toContain('aria-label="Back to Finance"')
    expect(html).toContain('title="Back to Finance"')
    expect(html).toContain("rounded-full")
    expect(html).toContain("print:hidden")
    expect(html).not.toContain("← Finance")
  })

  it("uses href when provided", () => {
    act(() => {
      root.render(<PageBackDotButton href="/finance/dashboard" />)
    })
    const button = container.querySelector(
      '[data-testid="page-back-dot-button"]'
    ) as HTMLButtonElement
    act(() => {
      button.click()
    })
    expect(push).toHaveBeenCalledWith("/finance/dashboard")
    expect(back).not.toHaveBeenCalled()
  })

  it("falls back to fallbackHref when history cannot go back", () => {
    const originalLength = window.history.length
    Object.defineProperty(window.history, "length", {
      configurable: true,
      get: () => 1,
    })

    act(() => {
      root.render(<PageBackDotButton fallbackHref="/master" />)
    })
    const button = container.querySelector(
      '[data-testid="page-back-dot-button"]'
    ) as HTMLButtonElement
    act(() => {
      button.click()
    })
    expect(push).toHaveBeenCalledWith("/master")

    Object.defineProperty(window.history, "length", {
      configurable: true,
      get: () => originalLength,
    })
  })
})
