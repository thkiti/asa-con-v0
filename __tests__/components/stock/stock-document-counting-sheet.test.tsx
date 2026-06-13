import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentCountingSheet } from "@/components/stock/StockDocumentCountingSheet"
import { StockDocumentEditorToolbarActions } from "@/components/stock/StockDocumentEditorToolbarActions"
import { getEditorWorkflowActions } from "@/lib/stock-ui/document-permissions"
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
    productGroup: "0101900",
    qty: "2",
    endingQty: "",
    reviewPostingDelta: "",
  },
  {
    key: "K-2",
    rowKey: "K-2",
    productId: "prod-k2",
    productCode: "0101002",
    productName: "Home key 2",
    displayCode: "#K2",
    hookGroup: "K",
    hookNo: 2,
    hookLabel: "K.2",
    productGroup: "0101900",
    qty: "",
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
    productGroup: "0201900",
    qty: "5",
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
    productGroup: "5101900",
    qty: "1",
    endingQty: "",
    reviewPostingDelta: "",
  },
]

describe("StockDocumentCountingSheet", () => {
  it("renders Thai left title and compact block headers", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("ตรวจนับสต็อก — รายชิ้น")
    expect(html).toContain(">Hook</th>")
    expect(html).toContain("รหัส")
    expect(html).toContain("จำนวน")
    expect(html).not.toContain(">Name<")
    const itemArea = html.split("lg:col-span-3")[1]?.split("lg:col-span-1")[0] ?? ""
    expect(itemArea).not.toContain(">Name</th>")
    expect(html).toContain("#K1")
  })

  it("renders hook tabs with Thai labels", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("กุญแจบ้าน")
    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-selected="true"')
  })

  it("renders group summary for active hook group only", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("สรุปตามกลุ่มสินค้า")
    expect(html).toContain("สำหรับตรวจทาน — ไม่ใช่การบันทึกจำนวน")
    expect(html).toContain("0101900")
    expect(html).not.toContain("0201900")
  })

  it("shows review-only subtitle and summary columns in Thai", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("กลุ่มสินค้า")
    expect(html).toContain(">ชื่อ<")
    expect(html).toContain(">items<")
    expect(html).toContain(">จำนวน<")
  })

  it("renders shoe sections horizontally with Name column for S tab", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="S"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("51 ส้นแตะสตรี")
    expect(html).toContain(">Name</th>")
    expect(html).toContain(">Heel<")
    expect(html).not.toContain(">ตะขอ</th>")
    expect(html).toContain("flex flex-nowrap items-start gap-4")
    expect(html).toContain("overflow-x-auto")
  })

  it("appends Items and Qty to status line when lines are counted", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("2 รายการ กลุ่ม K | Items: 1 | Qty: 2")
  })

  it("places hook tabs left and toolbar actions right on one row", () => {
    const actions = getEditorWorkflowActions(
      { role: "SH_STAFF", docType: "ADJUSTMENT", status: "DRAFT" },
      { hasDocumentId: false }
    )

    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
        toolbarActions={
          <StockDocumentEditorToolbarActions
            state={{
              documentId: null,
              refNo: "",
              docType: "ADJUSTMENT",
              status: "DRAFT",
              date: "2026-06-02",
              branchId: "branch-shop",
              fromLocId: "branch-shop",
              toLocId: "",
              readOnly: false,
              lines,
            }}
            actions={actions}
            saving={false}
            actionBusy={null}
            onWorkflowAction={() => {}}
          />
        }
      />
    )

    const toolbarRow = html.match(
      /flex flex-wrap items-center justify-between gap-4[\s\S]*?lg:grid-cols-4/
    )?.[0]
    expect(toolbarRow).toBeDefined()
    expect(toolbarRow).toContain('role="tablist"')
    expect(toolbarRow).toContain(">Save<")
    expect(toolbarRow).toContain("Back to list")
    expect(html.indexOf('role="tablist"')).toBeLessThan(html.indexOf(">Save<"))
  })

  it("shows narrow-screen horizontal scroll hint", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("เลื่อนแนวนอนเพื่อดูรายการทั้งหมด")
  })

  it("formats stored running refs on full-pos staff identity lines", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
        staffPhaseTitle="ASAS • CNT"
        staffOperationalPhase={{
          docType: "ADJUSTMENT",
          status: "DRAFT",
          viewerEntityCode: "AS",
        }}
        staffCountBanner={{
          refNo: "ADJ-SH001-202606-0001",
          branchCode: "SH001",
          branchName: "Chidlom",
          staffCode: "103",
          staffName: "Somsak Kamnuch",
          documentDate: "2026-06-10",
        }}
      />
    )

    expect(html).toContain("ASAS • CNT")
    expect(html).toContain("CNT-SH001-202606-0001")
    expect(html).not.toContain("ADJ-SH001-202606-0001")
  })

  it("formats ORDER refs on full-pos staff identity lines", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={lines}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
        staffPhaseTitle="ASAS • ORD"
        staffOperationalPhase={{
          docType: "TRANSFER_OUT",
          status: "DRAFT",
          viewerEntityCode: "AS",
        }}
        staffCountBanner={{
          refNo: "TRO-SH001-202606-0001",
          branchCode: "SH001",
          branchName: "Chidlom",
          staffCode: "103",
          staffName: "Somsak Kamnuch",
          documentDate: "2026-06-10",
        }}
      />
    )

    expect(html).toContain("ASAS • ORD")
    expect(html).toContain("ORD-SH001-202606-0001")
    expect(html).not.toContain("TRO-SH001-202606-0001")
  })
})
