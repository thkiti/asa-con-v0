import {
  formatStockDocumentInquiryHeader,
  STOCK_DOCUMENT_PHASE_THAI_LABELS,
} from "@/lib/stock/inquiry/stock-document-phase-labels"

describe("stock-document-phase-labels", () => {
  it("defines Thai labels for all phase codes", () => {
    expect(STOCK_DOCUMENT_PHASE_THAI_LABELS.CNT).toBe("ตรวจนับสินค้า")
    expect(STOCK_DOCUMENT_PHASE_THAI_LABELS.ADJ).toBe("ปรับปรุงสต็อก")
    expect(STOCK_DOCUMENT_PHASE_THAI_LABELS.ORD).toBe("ใบสั่งของ")
    expect(STOCK_DOCUMENT_PHASE_THAI_LABELS.DEY).toBe("ส่งของเข้าร้าน")
    expect(STOCK_DOCUMENT_PHASE_THAI_LABELS.ORS).toBe("ส่งให้ซัพพลายเออร์")
    expect(STOCK_DOCUMENT_PHASE_THAI_LABELS.ORI).toBe("รับสินค้า")
  })

  it("formats inquiry header with bullet separators", () => {
    const header = formatStockDocumentInquiryHeader({
      phaseLabelTh: "ใบสั่งของ",
      documentNo: "ORD-SH001-202606-0001",
      branchCode: "SH001",
      branchName: "Shop 1",
      staffId: "S001",
      staffName: "Staff One",
      date: "2026-06-15T00:00:00.000Z",
    })

    expect(header).toContain("ใบสั่งของ")
    expect(header).toContain("ORD-SH001-202606-0001")
    expect(header).toContain("SH001")
    expect(header).toContain("Shop 1")
    expect(header).toContain("S001")
    expect(header).toContain("Staff One")
    expect(header.split(" • ").length).toBe(7)
  })
})
