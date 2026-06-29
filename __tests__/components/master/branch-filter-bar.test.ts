import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  BranchFilterBar,
  refFilterToActiveOnly,
  refFilterToListMode,
} from "@/components/master/branch/BranchFilterBar"
import { themeSelect } from "@/lib/theme/theme-classes"

describe("BranchFilterBar mode helpers", () => {
  it("maps ref filter to list mode", () => {
    expect(refFilterToListMode("all")).toBe("active")
    expect(refFilterToListMode("active")).toBe("active")
    expect(refFilterToListMode("trash")).toBe("trash")
  })

  it("maps ref filter to activeOnly", () => {
    expect(refFilterToActiveOnly("all")).toBe(false)
    expect(refFilterToActiveOnly("active")).toBe(true)
    expect(refFilterToActiveOnly("trash")).toBe(false)
  })

  it("renders theme-aware native selects", () => {
    const html = renderToStaticMarkup(
      createElement(BranchFilterBar, {
        values: { code: "", name: "", type: "", refFilter: "all" },
        onChange: () => undefined,
      })
    )
    expect(html).toContain(themeSelect)
    expect(html).toContain('aria-label="Branch type"')
    expect(html).not.toContain("border-zinc-")
  })
})
