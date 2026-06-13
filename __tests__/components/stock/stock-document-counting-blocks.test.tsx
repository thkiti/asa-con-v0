import { renderToStaticMarkup } from "react-dom/server"
import {
  applyCountingQtyChange,
  StockDocumentCountingBlock,
} from "@/components/stock/StockDocumentCountingBlock"
import { StockDocumentCountingBlocks } from "@/components/stock/StockDocumentCountingBlocks"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"

function keyLine(
  overrides: Partial<EditorLineRowVM> & Pick<EditorLineRowVM, "key">
): EditorLineRowVM {
  return {
    productId: "prod-1",
    productCode: "0101001",
    productName: "Home key",
    displayCode: "#K1",
    hookGroup: "K",
    hookNo: 1,
    hookLabel: "K.1",
    qty: "",
    endingQty: "",
    reviewPostingDelta: "",
    ...overrides,
  }
}

const kLines: EditorLineRowVM[] = [
  keyLine({ key: "K-1", hookNo: 1, hookLabel: "K.1", displayCode: "#K1", qty: "2" }),
  keyLine({
    key: "C-1",
    productId: "prod-c1",
    productCode: "0201001",
    productName: "Auto key",
    displayCode: "#C1",
    hookGroup: "C",
    hookNo: 1,
    hookLabel: "C.1",
    qty: "",
  }),
  keyLine({
    key: "S-shoe",
    productId: "prod-s1",
    productCode: "5101001",
    productName: "Heel",
    displayCode: "5101001",
    hookGroup: "S",
    hookNo: null,
    hookLabel: "S",
    qty: "1",
  }),
]

describe("StockDocumentCountingBlock", () => {
  it("shows hook number only, not K. prefix label", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[kLines[0]!]}
        showHook
        hookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain('data-testid="catalog-product-code-hover-trigger"')
    expect(html).toContain('data-product-code="0101001"')
    expect(html).toContain(">1<")
    expect(html).not.toContain("K.1")
    expect(html).toContain(">Hook</th>")
    expect(html).toContain("รหัส")
    expect(html).toContain("จำนวน")
    expect(html).toContain("sticky")
    expect(html).toContain("top-0")
    expect(html).toContain("bg-zinc-100")
  })

  it("does not render product name as visible table cell text", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[kLines[0]!]}
        showHook
        hookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).not.toContain(">Home key<")
  })

  it("shows product name in table when showProductName is true", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[kLines[2]!]}
        showHook={false}
        showProductName
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain(">Heel<")
    expect(html).toContain(">Name</th>")
  })

  it("code-only mode has no hook column header", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[kLines[2]!]}
        showHook={false}
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).not.toContain(">Hook</th>")
    expect(html).toContain("5101001")
  })

  it("read-only disables qty input", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[kLines[0]!]}
        showHook
        hookGroup="K"
        readOnly
        onLineChange={() => {}}
      />
    )

    expect(html).toContain('disabled=""')
  })

  it("orphan row uses amber background and Thai title", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[keyLine({ key: "K-o", isOrphan: true })]}
        showHook
        hookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("bg-amber-50")
    expect(html).toContain("รายการนอกรายการอ้างอิงปัจจุบัน")
  })

  it("qty aria-label includes product name when hidden from table", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[kLines[0]!]}
        showHook
        hookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain('aria-label="จำนวน Home key รหัส #K1"')
    expect(html).toContain("text-zinc-950")
    expect(html).toContain("border-zinc-400")
  })

  it("uses text qty input with numeric inputMode and no number spinner type", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[kLines[0]!]}
        showHook
        hookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain('type="text"')
    expect(html).toContain('inputMode="numeric"')
    expect(html).not.toContain('type="number"')
    expect(html).toContain('data-counting-qty-input="true"')
  })

  it("applyCountingQtyChange calls onLineChange with qty patch", () => {
    const onLineChange = jest.fn()
    applyCountingQtyChange("K-1", "7", onLineChange)
    expect(onLineChange).toHaveBeenCalledWith("K-1", { qty: "7" })
  })
})

describe("StockDocumentCountingBlocks", () => {
  it("filters to active K tab and shows display code", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlocks
        lines={kLines}
        activeHookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("#K1")
    expect(html).not.toContain("#C1")
    expect(html).not.toContain(">Home key<")
  })

  it("renders shoe sections in horizontal scroll with Name column", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlocks
        lines={kLines}
        activeHookGroup="S"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("51 ส้นแตะสตรี")
    expect(html).toContain("5101001")
    expect(html).toContain(">Name</th>")
    expect(html).toContain(">Heel<")
    expect(html).not.toContain(">Hook</th>")
    expect(html).toContain("flex flex-nowrap items-start gap-4")
    expect(html).toContain("overflow-x-auto")
  })

  it("sorts rows by hook number ascending within K tab", () => {
    const unordered: EditorLineRowVM[] = [
      keyLine({ key: "K-10", hookNo: 10, displayCode: "CODE-10" }),
      keyLine({ key: "K-2", hookNo: 2, displayCode: "CODE-02" }),
      keyLine({ key: "K-1", hookNo: 1, displayCode: "CODE-01" }),
    ]

    const html = renderToStaticMarkup(
      <StockDocumentCountingBlocks
        lines={unordered}
        activeHookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html.indexOf("CODE-01")).toBeLessThan(html.indexOf("CODE-02"))
    expect(html.indexOf("CODE-02")).toBeLessThan(html.indexOf("CODE-10"))
    expect(html).not.toContain("K.10")
  })

  it("places null hook numbers after numbered hooks", () => {
    const rows: EditorLineRowVM[] = [
      keyLine({ key: "K-null", hookNo: null, displayCode: "CODE-NULL" }),
      keyLine({ key: "K-3", hookNo: 3, displayCode: "CODE-03" }),
      keyLine({ key: "K-1", hookNo: 1, displayCode: "CODE-01" }),
    ]

    const html = renderToStaticMarkup(
      <StockDocumentCountingBlocks
        lines={rows}
        activeHookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html.indexOf("CODE-01")).toBeLessThan(html.indexOf("CODE-03"))
    expect(html.indexOf("CODE-03")).toBeLessThan(html.indexOf("CODE-NULL"))
  })

  it("shows Thai empty message when tab has no rows", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlocks
        lines={kLines}
        activeHookGroup="M"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("ไม่มีรายการในกลุ่มตะขอนี้")
  })
})
