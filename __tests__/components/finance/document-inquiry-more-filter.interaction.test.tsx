/** @jest-environment jsdom */

import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { useInquiryMoreFilterOpen } from "@/lib/finance-ui/inquiry-more-filter-state"
import { voucherInquiryMoreFilterButtonActive } from "@/lib/finance-ui/finance-visual-classes"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function ControlledMoreFilter(props: {
  initialOpen?: boolean
  initialFrom?: string
  initialTo?: string
}) {
  const [isMoreFilterOpen, setIsMoreFilterOpen] = useState(props.initialOpen ?? false)
  const [from, setFrom] = useState(props.initialFrom ?? "")
  const [to, setTo] = useState(props.initialTo ?? "")

  return (
    <>
      <DocumentInquiryMoreFilter
        periodKey="2026-06"
        onPeriodKeyChange={() => {}}
        periodTestId="voucher-inquiry-filter-period"
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        testIdPrefix="voucher-inquiry"
        isMoreFilterOpen={isMoreFilterOpen}
        setIsMoreFilterOpen={setIsMoreFilterOpen}
      />
      <span data-testid="open-state">{String(isMoreFilterOpen)}</span>
      <span data-testid="from-state">{from}</span>
    </>
  )
}

function HookProbe({ query }: { query: string }) {
  const { isMoreFilterOpen, setIsMoreFilterOpen } = useInquiryMoreFilterOpen(query)
  return (
    <>
      <span data-testid="hook-open">{String(isMoreFilterOpen)}</span>
      <button type="button" data-testid="hook-open-btn" onClick={() => setIsMoreFilterOpen(true)}>
        open
      </button>
    </>
  )
}

describe("DocumentInquiryMoreFilter interactions", () => {
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

  function panel(): HTMLElement | null {
    return container.querySelector('[data-testid="voucher-inquiry-more-filter-panel"]')
  }

  function moreButton(): HTMLButtonElement {
    const button = container.querySelector('[data-testid="voucher-inquiry-more-filter"]')
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("More filter button not found")
    }
    return button
  }

  it("does not render the date box by default", () => {
    act(() => {
      root.render(<ControlledMoreFilter />)
    })

    expect(panel()).toBeNull()
    expect(moreButton().getAttribute("aria-expanded")).toBe("false")
  })

  it("does not render the date box on load when from/to values exist", () => {
    act(() => {
      root.render(<ControlledMoreFilter initialFrom="2026-06-01" initialTo="2026-06-30" />)
    })

    expect(panel()).toBeNull()
    expect(moreButton().getAttribute("data-active")).toBe("true")
    expect(moreButton().className).toContain(voucherInquiryMoreFilterButtonActive)
  })

  it("opens the date box when the dot is clicked", () => {
    act(() => {
      root.render(<ControlledMoreFilter />)
    })

    act(() => {
      moreButton().click()
    })

    expect(panel()).not.toBeNull()
    expect(container.querySelector('[data-testid="open-state"]')?.textContent).toBe("true")
  })

  it("closes the date box when the dot is clicked again", () => {
    act(() => {
      root.render(<ControlledMoreFilter />)
    })

    act(() => {
      moreButton().click()
    })
    expect(panel()).not.toBeNull()

    act(() => {
      moreButton().click()
    })
    expect(panel()).toBeNull()
    expect(container.querySelector('[data-testid="open-state"]')?.textContent).toBe("false")
  })

  it("keeps the date box open when interacting with the From input", () => {
    act(() => {
      root.render(<ControlledMoreFilter initialOpen />)
    })

    const fromInput = container.querySelector(
      '[data-testid="voucher-inquiry-filter-from"]'
    ) as HTMLInputElement

    act(() => {
      fromInput.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    })

    expect(panel()).not.toBeNull()
    expect(container.querySelector('[data-testid="open-state"]')?.textContent).toBe("true")
  })

  it("closes the date box when clicking outside", () => {
    act(() => {
      root.render(<ControlledMoreFilter initialOpen />)
    })

    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    })

    expect(panel()).toBeNull()
    expect(container.querySelector('[data-testid="open-state"]')?.textContent).toBe("false")
  })

  it("shows active dot when From or To has a value while the date box is closed", () => {
    act(() => {
      root.render(<ControlledMoreFilter initialFrom="2026-06-01" />)
    })

    expect(moreButton().className).toContain(voucherInquiryMoreFilterButtonActive)
    expect(moreButton().getAttribute("data-active")).toBe("true")
    expect(panel()).toBeNull()
  })

  it("reopens the date box with existing dates after they were set", () => {
    act(() => {
      root.render(<ControlledMoreFilter initialFrom="2026-06-01" initialTo="2026-06-15" />)
    })

    act(() => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="voucher-inquiry-filter-from"]'
    ) as HTMLInputElement
    const toInput = container.querySelector(
      '[data-testid="voucher-inquiry-filter-to"]'
    ) as HTMLInputElement
    expect(fromInput.value).toBe("2026-06-01")
    expect(toInput.value).toBe("2026-06-15")
  })
})

describe("useInquiryMoreFilterOpen", () => {
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

  it("defaults to closed and closes when applied filter query changes", () => {
    act(() => {
      root.render(<HookProbe query="" />)
    })
    expect(container.querySelector('[data-testid="hook-open"]')?.textContent).toBe("false")

    act(() => {
      ;(container.querySelector('[data-testid="hook-open-btn"]') as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="hook-open"]')?.textContent).toBe("true")

    act(() => {
      root.render(<HookProbe query="from=2026-06-01" />)
    })
    expect(container.querySelector('[data-testid="hook-open"]')?.textContent).toBe("false")
  })
})
