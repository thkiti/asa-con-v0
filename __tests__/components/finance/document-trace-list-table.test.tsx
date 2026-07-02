/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { DocumentTraceListTable } from "@/components/finance/DocumentTraceListTable"
import type { DocumentTraceListRow } from "@/lib/finance/audit/document-trace-list"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function makeRow(index: number): DocumentTraceListRow {
  const seq = String(index).padStart(3, "0")
  return {
    documentNo: `REC-SH001-202601-${seq}`,
    date: "2026-01-15T10:00:00.000Z",
    branchCode: "SH001",
    branchName: "Shop 1",
    status: "COMPLETED",
    amount: "100.00",
    voucherNo: null,
    traceQuery: `REC-SH001-202601-${seq}`,
  }
}

describe("DocumentTraceListTable", () => {
  it("renders a bounded scroll container with sticky header classes", () => {
    const html = renderToStaticMarkup(
      <DocumentTraceListTable
        rows={[makeRow(1)]}
        selectedTraceQuery={null}
        onTrace={() => {}}
        totalCount={100}
        hasMore
        onLoadMore={() => {}}
      />
    )

    expect(html).toContain('data-testid="document-trace-list-scroll"')
    expect(html).toContain("max-h-[26.25rem]")
    expect(html).toContain("overflow-y-auto")
    expect(html).toContain("sticky top-0")
    expect(html).toContain('data-testid="document-trace-list-count"')
    expect(html).toContain("Showing 1 of 100 documents")
  })

  it("shows muted limited helper text instead of warning styling", () => {
    const html = renderToStaticMarkup(
      <DocumentTraceListTable
        rows={Array.from({ length: 30 }, (_, index) => makeRow(index + 1))}
        selectedTraceQuery={null}
        onTrace={() => {}}
        totalCount={100}
        hasMore
        onLoadMore={() => {}}
      />
    )

    expect(html).toContain('data-testid="document-trace-list-limited-helper"')
    expect(html).toContain(
      "Showing first 30 documents. Use filters or Load more to narrow results."
    )
    expect(html).not.toContain("document-trace-warnings")
    expect(html).not.toContain("bg-amber-50")
  })

  it("renders document number as a link when documentHref is provided", () => {
    const row = makeRow(1)
    row.documentHref = "/pos/shops/branch-1/sales/sale-1"

    const html = renderToStaticMarkup(
      <DocumentTraceListTable rows={[row]} selectedTraceQuery={null} onTrace={() => {}} />
    )

    expect(html).toContain('data-testid="document-trace-document-link-')
    expect(html).toContain('href="/pos/shops/branch-1/sales/sale-1"')
  })

  it("renders only the provided rows and a Load more button", () => {
    const html = renderToStaticMarkup(
      <DocumentTraceListTable
        rows={Array.from({ length: 30 }, (_, index) => makeRow(index + 1))}
        selectedTraceQuery={null}
        onTrace={() => {}}
        hasMore
        onLoadMore={() => {}}
      />
    )

    expect(html.match(/document-trace-list-row-/g)?.length).toBe(30)
    expect(html).toContain('data-testid="document-trace-list-load-more"')
  })
})

describe("DocumentTraceListTable load more interaction", () => {
  let container: HTMLDivElement
  let root: Root
  const onLoadMore = jest.fn()

  beforeEach(() => {
    onLoadMore.mockClear()
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("calls onLoadMore when Load more is clicked", async () => {
    await act(async () => {
      root.render(
        <DocumentTraceListTable
          rows={[makeRow(1)]}
          selectedTraceQuery={null}
          onTrace={() => {}}
          hasMore
          onLoadMore={onLoadMore}
        />
      )
    })

    const button = container.querySelector(
      '[data-testid="document-trace-list-load-more"]'
    ) as HTMLButtonElement

    await act(async () => {
      button.click()
    })

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })
})
