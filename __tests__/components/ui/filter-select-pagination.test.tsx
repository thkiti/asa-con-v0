/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import {
  DocumentTypeFilterField,
  FilterSelectField,
  StatusFilterField,
} from "@/components/ui/FilterSelectField"
import { ListPagination } from "@/components/ui/ListPagination"
import { LoadMoreButton } from "@/components/ui/LoadMoreButton"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const OPTIONS = [
  { value: "A", label: "Alpha" },
  { value: "B", label: "Beta" },
]

describe("FilterSelectField", () => {
  it("renders label, empty option, and caller options", () => {
    const html = renderToStaticMarkup(
      <FilterSelectField
        label="Status"
        value=""
        onChange={() => {}}
        options={OPTIONS}
        emptyOption={{ label: "All statuses" }}
        data-testid="filter-select"
      />
    )
    expect(html).toContain("Status")
    expect(html).toContain("All statuses")
    expect(html).toContain("Alpha")
    expect(html).toContain('data-testid="filter-select"')
  })

  it("supports disabled group-header options", () => {
    const html = renderToStaticMarkup(
      <DocumentTypeFilterField
        value=""
        onChange={() => {}}
        emptyOption={{ label: "Select type" }}
        options={[
          { value: "", label: "── GROUP ──", disabled: true },
          { value: "MJV", label: "Manual journal" },
        ]}
        data-testid="doc-type"
      />
    )
    expect(html).toContain("Doc Type")
    expect(html).toContain("disabled")
    expect(html).toContain("Manual journal")
  })

  it("StatusFilterField defaults to Status label", () => {
    const html = renderToStaticMarkup(
      <StatusFilterField
        value="DRAFT"
        onChange={() => {}}
        options={[{ value: "DRAFT", label: "Draft" }]}
      />
    )
    expect(html).toContain("Status")
    expect(html).toContain("Draft")
  })

  it("calls onChange", () => {
    let next = ""
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        <FilterSelectField
          label="Type"
          value=""
          onChange={(value) => {
            next = value
          }}
          options={OPTIONS}
          emptyOption
          data-testid="change-select"
        />
      )
    })
    const select = container.querySelector(
      '[data-testid="change-select"]'
    ) as HTMLSelectElement
    act(() => {
      select.value = "B"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    expect(next).toBe("B")
    act(() => root.unmount())
    document.body.removeChild(container)
  })
})

describe("ListPagination", () => {
  it("hides controls on a single page by default", () => {
    const html = renderToStaticMarkup(
      <ListPagination
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        summary={<p data-testid="summary">1 of 1</p>}
        testId="pager"
      />
    )
    expect(html).toContain('data-testid="summary"')
    expect(html).not.toContain("Previous")
  })

  it("disables Previous on first page and Next on last page", () => {
    const html = renderToStaticMarkup(
      <ListPagination
        page={1}
        totalPages={3}
        onPageChange={() => {}}
        prevTestId="prev"
        nextTestId="next"
      />
    )
    expect(html).toContain("Previous")
    expect(html).toContain("Next")
    expect(html).toContain('data-testid="prev"')
    expect(html).toMatch(/data-testid="prev"[^>]*\sdisabled|disabled[^>]*data-testid="prev"/)
  })

  it("invokes onPageChange", () => {
    let page = 2
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        <ListPagination
          page={page}
          totalPages={5}
          onPageChange={(next) => {
            page = next
          }}
          nextTestId="next-btn"
        />
      )
    })
    act(() => {
      ;(container.querySelector('[data-testid="next-btn"]') as HTMLButtonElement).click()
    })
    expect(page).toBe(3)
    act(() => root.unmount())
    document.body.removeChild(container)
  })
})

describe("LoadMoreButton", () => {
  it("renders nothing when hasMore is false", () => {
    const html = renderToStaticMarkup(
      <LoadMoreButton hasMore={false} onClick={() => {}} />
    )
    expect(html).toBe("")
  })

  it("shows loading label and disables while loading", () => {
    const html = renderToStaticMarkup(
      <LoadMoreButton
        hasMore
        loading
        onClick={() => {}}
        loadingLabel="Loading more…"
        data-testid="load-more"
      />
    )
    expect(html).toContain("Loading more…")
    expect(html).toContain("disabled")
    expect(html).toContain('aria-busy="true"')
  })

  it("supports custom show-more labels", () => {
    const html = renderToStaticMarkup(
      <LoadMoreButton
        hasMore
        onClick={() => {}}
        label="Show more issues (3 remaining)"
      />
    )
    expect(html).toContain("Show more issues (3 remaining)")
  })
})
