import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentCountingGrid } from "@/components/stock/StockDocumentCountingGrid"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"

const lines: EditorLineRowVM[] = [
  {
    key: "K-1",
    rowKey: "K-1",
    productId: "prod-k1",
    productCode: "0101001",
    productName: "Home key",
    displayCode: "#K1",
    hookGroup: "K",
    hookNo: 1,
    hookLabel: "K.1",
    qty: "2",
    endingQty: "",
    reviewPostingDelta: "",
  },
  {
    key: "C-1",
    rowKey: "C-1",
    productId: "prod-c1",
    productCode: "0201001",
    productName: "Auto key",
    displayCode: "#C1",
    hookGroup: "C",
    hookNo: 1,
    hookLabel: "C.1",
    qty: "",
    endingQty: "",
    reviewPostingDelta: "",
  },
  {
    key: "S-shoe",
    rowKey: "S-shoe",
    productId: "prod-s1",
    productCode: "5101001",
    productName: "Heel",
    displayCode: "5101001",
    hookGroup: "S",
    hookNo: null,
    hookLabel: "S",
    qty: "1",
    endingQty: "",
    reviewPostingDelta: "",
  },
]

describe("StockDocumentCountingGrid", () => {
  it("renders key group columns for active K tab", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingGrid
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("Hook")
    expect(html).toContain("#K1")
    expect(html).toContain("Home key")
    expect(html).not.toContain("Auto key")
  })

  it("renders shoe prefix section for active S tab", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingGrid
        lines={lines}
        activeHookGroup="S"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("51 - Ladies")
    expect(html).toContain("5101001")
    expect(html).not.toContain(">Hook<")
  })

  it("shows counted badge on hook tabs", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingGrid
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain(">K<")
    expect(html).toContain(">1<")
  })
})
