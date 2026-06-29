import type { BusinessPhaseCode } from "@/lib/stock-ui/business-phase-title"

/** Thai phase labels for stock document inquiry headers. */
export const STOCK_DOCUMENT_PHASE_THAI_LABELS: Record<BusinessPhaseCode, string> = {
  CNT: "ตรวจนับสินค้า",
  ADJ: "ปรับปรุงสต็อก",
  ORD: "ใบสั่งของ",
  DEY: "ส่งของเข้าร้าน",
  ORS: "ส่งให้ซัพพลายเออร์",
  ORI: "รับสินค้า",
}

export function formatStockDocumentInquiryHeader(
  detail: Pick<
    import("./stock-document-inquiry-types").StockDocumentInquiryDetail,
    | "phaseLabelTh"
    | "documentNo"
    | "branchCode"
    | "branchName"
    | "staffId"
    | "staffName"
    | "date"
  >
): string {
  const dateLabel = new Date(detail.date).toLocaleDateString()
  const parts = [
    detail.phaseLabelTh,
    detail.documentNo,
    detail.branchCode,
    detail.branchName,
    detail.staffId ?? "—",
    detail.staffName ?? "—",
    dateLabel,
  ]
  return parts.join(" • ")
}
