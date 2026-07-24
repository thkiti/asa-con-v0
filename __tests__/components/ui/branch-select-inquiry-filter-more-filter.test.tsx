/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { BranchSelect, formatBranchSelectLabel } from "@/components/ui/BranchSelect"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import { MoreFilterPopover } from "@/components/ui/MoreFilterPopover"
import { INQUIRY_FILTER_DISMISS_ATTR } from "@/lib/finance-ui/inquiry-more-filter-state"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const BRANCHES = [
  { id: "b1", code: "SH001", name: "Chidlom" },
  { id: "b2", code: "SH002", name: "Siam" },
]

describe("formatBranchSelectLabel", () => {
  it("formats CODE • Name", () => {
    expect(formatBranchSelectLabel({ code: "SH001", name: "Chidlom" })).toBe(
      "SH001 • Chidlom"
    )
  })
})

describe("BranchSelect", () => {
  it("renders options with empty All branches and default labels", () => {
    const html = renderToStaticMarkup(
      <BranchSelect
        value=""
        onChange={() => {}}
        options={BRANCHES}
        emptyOption
        data-testid="branch-select"
      />
    )
    expect(html).toContain('data-testid="branch-select"')
    expect(html).toContain("All branches")
    expect(html).toContain("SH001 • Chidlom")
    expect(html).toContain('value="b1"')
  })

  it("supports valueKey=code and custom empty label", () => {
    const html = renderToStaticMarkup(
      <BranchSelect
        value=""
        onChange={() => {}}
        options={BRANCHES}
        valueKey="code"
        emptyOption={{ label: "All shops" }}
      />
    )
    expect(html).toContain("All shops")
    expect(html).toContain('value="SH001"')
  })

  it("disables while loading and sets aria-busy", () => {
    const html = renderToStaticMarkup(
      <BranchSelect
        value=""
        onChange={() => {}}
        options={BRANCHES}
        emptyOption
        loading
        data-testid="branch-loading"
      />
    )
    expect(html).toContain("disabled")
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain("Loading branches…")
  })

  it("calls onChange with selected value", () => {
    let next = ""
    let container: HTMLDivElement | null = document.createElement("div")
    document.body.appendChild(container)
    let root: Root | null = createRoot(container)

    act(() => {
      root!.render(
        <BranchSelect
          value=""
          onChange={(value) => {
            next = value
          }}
          options={BRANCHES}
          emptyOption
          data-testid="branch-change"
        />
      )
    })

    const select = container.querySelector(
      '[data-testid="branch-change"]'
    ) as HTMLSelectElement
    act(() => {
      select.value = "b2"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    expect(next).toBe("b2")

    act(() => root!.unmount())
    document.body.removeChild(container)
    container = null
    root = null
  })
})

describe("InquiryFilterActions", () => {
  it("renders Search and Clear by default", () => {
    const html = renderToStaticMarkup(
      <InquiryFilterActions
        onPrimary={() => {}}
        onClear={() => {}}
        primaryTestId="search"
        clearTestId="clear"
      />
    )
    expect(html).toContain("Search")
    expect(html).toContain("Clear")
    expect(html).toContain('data-testid="search"')
    expect(html).toContain('data-testid="clear"')
  })

  it("supports apply-only without Clear", () => {
    const html = renderToStaticMarkup(
      <InquiryFilterActions
        mode="apply-only"
        onPrimary={() => {}}
        loading
        loadingPrimaryLabel="Loading…"
        primaryTestId="apply"
      />
    )
    expect(html).toContain("Loading…")
    expect(html).not.toContain("Clear")
    expect(html).toContain("disabled")
  })

  it("sets dismiss attribute when requested", () => {
    const html = renderToStaticMarkup(
      <InquiryFilterActions
        mode="apply-clear"
        onPrimary={() => {}}
        onClear={() => {}}
        dismissOnAction
        primaryTestId="apply"
        clearTestId="clear"
      />
    )
    expect(html).toContain(`${INQUIRY_FILTER_DISMISS_ATTR}="true"`)
  })
})

describe("MoreFilterPopover", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("renders trigger and panel when open", () => {
    const html = renderToStaticMarkup(
      <MoreFilterPopover
        open
        onOpenChange={() => {}}
        active
        testId="more"
        panelTestId="more-panel"
      >
        <span>Panel body</span>
      </MoreFilterPopover>
    )
    expect(html).toContain('data-testid="more"')
    expect(html).toContain('data-testid="more-panel"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('data-active="true"')
    expect(html).toContain("Panel body")
  })

  it("closes on Escape", () => {
    let open = true
    act(() => {
      root.render(
        <MoreFilterPopover
          open={open}
          onOpenChange={(next) => {
            open = typeof next === "function" ? next(open) : next
          }}
          testId="more-esc"
        >
          Body
        </MoreFilterPopover>
      )
    })

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })
    expect(open).toBe(false)
  })

  it("closes on outside mousedown", () => {
    let open = true
    act(() => {
      root.render(
        <MoreFilterPopover
          open={open}
          onOpenChange={(next) => {
            open = typeof next === "function" ? next(open) : next
          }}
          testId="more-outside"
        >
          Body
        </MoreFilterPopover>
      )
    })

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    })
    expect(open).toBe(false)
  })
})
