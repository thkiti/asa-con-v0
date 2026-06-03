/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { ThemeSelector } from "@/components/theme/ThemeSelector"
import { THEME_STORAGE_KEY } from "@/lib/theme/types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

function mockMatchMedia(prefersDark = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: prefersDark && query.includes("prefers-color-scheme: dark"),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  })
}

function renderSelector(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>
    )
  })
  return { container, root }
}

describe("ThemeSelector", () => {
  beforeEach(() => {
    mockMatchMedia(false)
    window.localStorage.clear()
  })

  it("renders Theme label and dropdown with Dark, Light, System", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>
    )

    expect(html).toContain("Theme:")
    expect(html).toContain('id="theme-mode-select"')
    expect(html).toContain(">Dark<")
    expect(html).toContain(">Light<")
    expect(html).toContain(">System<")
    expect(html).not.toContain('type="radio"')
  })

  it("persists selection to localStorage", async () => {
    const { container } = renderSelector()
    const select = container.querySelector(
      "#theme-mode-select"
    ) as HTMLSelectElement

    await act(async () => {
      select.value = "dark"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe(
      "dark"
    )
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark")
  })
})
