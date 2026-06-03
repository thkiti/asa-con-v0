import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentGroupSummary } from "@/components/stock/StockDocumentGroupSummary"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"

describe("StockDocumentGroupSummary", () => {
  it("renders Thai empty copy when no visible rows", () => {
    const html = renderToStaticMarkup(
      <StockDocumentGroupSummary visibleRows={[]} />
    )

    expect(html).toContain("ยังไม่มีรายการในกลุ่มตะขอที่เลือก")
    expect(html).toContain("สำหรับตรวจทาน — ไม่ใช่การบันทึกจำนวน")
  })

  it("renders new header columns and counted-only metrics", () => {
    const visibleRows: EditorLineRowVM[] = [
      {
        key: "K-1",
        productId: "p1",
        productCode: "c1",
        productName: "สินค้า A",
        productGroup: "0101900",
        qty: "2",
        endingQty: "",
        reviewPostingDelta: "",
      },
      {
        key: "K-2",
        productId: "p2",
        productCode: "c2",
        productName: "สินค้า B",
        productGroup: "0101900",
        qty: "",
        endingQty: "",
        reviewPostingDelta: "",
      },
    ]

    const html = renderToStaticMarkup(
      <StockDocumentGroupSummary visibleRows={visibleRows} />
    )

    expect(html).toContain("กลุ่มสินค้า")
    expect(html).toContain(">ชื่อ<")
    expect(html).toContain(">items<")
    expect(html).toContain(">จำนวน<")
    expect(html).not.toContain("จำนวนรายการ")
    expect(html).toContain("0101900")
    expect(html).toContain("สินค้า A")
    expect(html).toContain(">1<")
    expect(html).toContain(">2<")
    expect(html).not.toContain('type="number"')
  })

  it("renders sticky TOTAL footer with summed items and qty", () => {
    const html = renderToStaticMarkup(
      <StockDocumentGroupSummary
        visibleRows={[
          {
            key: "1",
            productId: "p1",
            productCode: "c1",
            productName: "หนังแท้",
            productGroup: "5101900",
            qty: "10",
            endingQty: "",
            reviewPostingDelta: "",
          },
          {
            key: "2",
            productId: "p2",
            productCode: "c2",
            productName: "หนังเทียม",
            productGroup: "5102900",
            qty: "8",
            endingQty: "",
            reviewPostingDelta: "",
          },
          {
            key: "3",
            productId: "p3",
            productCode: "c3",
            productName: "เชือก",
            productGroup: "5103900",
            qty: "5",
            endingQty: "",
            reviewPostingDelta: "",
          },
        ]}
      />
    )

    expect(html).toContain(">TOTAL<")
    expect(html).toContain("border-t-2")
    expect(html).toContain("font-bold")
    expect(html.indexOf("5103900")).toBeLessThan(html.indexOf(">TOTAL<"))
    const totalSection = html.slice(html.indexOf(">TOTAL<"))
    expect(totalSection).toContain(">3<")
    expect(totalSection).toContain(">23<")
  })

  it("shows message when no lines have counted qty", () => {
    const html = renderToStaticMarkup(
      <StockDocumentGroupSummary
        visibleRows={[
          {
            key: "K-1",
            productId: "p1",
            productCode: "c1",
            productName: "A",
            productGroup: "G",
            qty: "",
            endingQty: "",
            reviewPostingDelta: "",
          },
        ]}
      />
    )

    expect(html).toContain("ยังไม่มีรายการที่กรอกจำนวน")
  })
})
