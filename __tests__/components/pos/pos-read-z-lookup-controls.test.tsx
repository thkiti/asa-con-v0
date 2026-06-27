/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosReadZLookupControls } from "@/components/pos/PosReadZLookupControls"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

describe("PosReadZLookupControls", () => {
  it("shows doc type, date dropdown, and cumulative button", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosReadZLookupControls
          selectedDate="2026-06-27"
          lookupMode="daily"
          onDateSelect={jest.fn()}
          onCumulativePress={jest.fn()}
        />
      )
    })

    expect(container.querySelector(".readZLookupControlRow")).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-lookup-doc-type"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-lookup-date"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-lookup-cumulative"]')).not.toBeNull()
    expect(container.textContent).toContain("READ Z")
    expect(container.textContent).toContain("Cumulative To-Date")
    expect(container.querySelector('[data-testid="pos-read-z-unlock-daily"]')).toBeNull()

    act(() => root.unmount())
  })

  it("calls onDateSelect when date changes", () => {
    const onDateSelect = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosReadZLookupControls
          selectedDate="2026-06-27"
          lookupMode="daily"
          onDateSelect={onDateSelect}
          onCumulativePress={jest.fn()}
        />
      )
    })

    const select = container.querySelector<HTMLSelectElement>(
      '[data-testid="pos-read-z-lookup-date"]'
    )
    act(() => {
      if (select) {
        select.value = "2026-06-26"
        select.dispatchEvent(new Event("change", { bubbles: true }))
      }
    })

    expect(onDateSelect).toHaveBeenCalledWith("2026-06-26")

    act(() => root.unmount())
  })

  it("calls onCumulativePress from cumulative button", () => {
    const onCumulativePress = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosReadZLookupControls
          selectedDate="2026-06-27"
          lookupMode="cumulative"
          onDateSelect={jest.fn()}
          onCumulativePress={onCumulativePress}
        />
      )
    })

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="pos-read-z-lookup-cumulative"]')
        ?.click()
    })

    expect(onCumulativePress).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
  })
})
