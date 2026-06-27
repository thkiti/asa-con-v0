/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReadZGroupTable } from "@/components/thermal/ReadZGroupTable"
import { READ_Z_GROUP_TABLE_HEADER_LABEL } from "@/lib/thermal/read-z-group-display"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

describe("ReadZGroupTable", () => {
  it("renders sticky header, dashed separator, and shortened display rows", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <ReadZGroupTable
          rows={[
            { lineKey: "1", displayLeft: "0101902-Home Large", qty: 2, amount: 60 },
          ]}
        />
      )
    })

    expect(container.querySelector(".readZGroupStickyHeader")).not.toBeNull()
    expect(container.querySelector(".readZGroupSeparator")).not.toBeNull()
    expect(container.querySelector(".readZScrollableGroupArea")).not.toBeNull()

    const header = container.querySelector(".readZGroupTableHeader")
    expect(header?.querySelector(".readZGroupName")?.textContent).toBe(
      READ_Z_GROUP_TABLE_HEADER_LABEL
    )
    expect(header?.querySelector(".readZGroupQty")?.textContent).toBe("Qty")
    expect(header?.querySelector(".readZGroupAmount")?.textContent).toBe("Amount")

    const row = container.querySelector(".readZGroupTableRow")
    expect(row?.querySelector(".readZGroupName")?.textContent).toBe("0101-Home Large")
    expect(row?.querySelector(".readZGroupName")?.getAttribute("title")).toBe(
      "0101902-Home Large"
    )
    expect(row?.querySelector(".readZGroupQty")?.textContent).toBe("2")
    expect(row?.querySelector(".readZGroupAmount")?.textContent).toBe("60.00")

    act(() => root.unmount())
  })
})
