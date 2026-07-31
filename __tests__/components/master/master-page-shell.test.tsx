/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MasterPageShell } from "@/components/master/MasterPageShell"

const push = jest.fn()
const back = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

describe("MasterPageShell back navigation", () => {
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

  it("navigates to the declared backHref without using history.back", () => {
    Object.defineProperty(window.history, "length", {
      configurable: true,
      get: () => 5,
    })

    act(() => {
      root.render(
        <MasterPageShell title="Stock Document" backHref="/shop" backLabel="← Shop">
          <div>list</div>
        </MasterPageShell>
      )
    })

    const button = container.querySelector(
      '[data-testid="master-page-back-button"]'
    ) as HTMLButtonElement
    expect(button).toBeTruthy()
    expect(button.getAttribute("data-fallback-href")).toBe("/shop")

    act(() => {
      button.click()
    })

    expect(push).toHaveBeenCalledWith("/shop")
    expect(back).not.toHaveBeenCalled()
  })
})
