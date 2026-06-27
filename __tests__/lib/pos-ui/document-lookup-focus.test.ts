/**
 * @jest-environment jsdom
 */
import { shouldRestoreDocumentLookupRunningNoFocus } from "@/lib/pos-ui/document-lookup-focus"

describe("shouldRestoreDocumentLookupRunningNoFocus", () => {
  it("returns false when running input is already focused", () => {
    const running = document.createElement("input")
    document.body.appendChild(running)
    running.focus()

    expect(
      shouldRestoreDocumentLookupRunningNoFocus(
        running,
        document.createElement("div"),
        running
      )
    ).toBe(false)

    running.remove()
  })

  it("returns false when a filter control inside filters root is focused", () => {
    const filters = document.createElement("div")
    const select = document.createElement("select")
    const running = document.createElement("input")
    filters.appendChild(select)
    document.body.appendChild(filters)
    document.body.appendChild(running)
    select.focus()

    expect(
      shouldRestoreDocumentLookupRunningNoFocus(document.activeElement, filters, running)
    ).toBe(false)

    filters.remove()
    running.remove()
  })

  it("returns true when focus is outside filter controls", () => {
    const filters = document.createElement("div")
    const running = document.createElement("input")
    const button = document.createElement("button")
    document.body.appendChild(filters)
    document.body.appendChild(running)
    document.body.appendChild(button)
    button.focus()

    expect(
      shouldRestoreDocumentLookupRunningNoFocus(document.activeElement, filters, running)
    ).toBe(true)

    filters.remove()
    running.remove()
    button.remove()
  })
})
