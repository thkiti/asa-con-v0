/**
 * Finance Document Inquiry — POS-origin REC/REF audit reprint rules.
 *
 * - Inquiry links: /shop/receipt/{saleId}, /shop/refund-receipt/{refundId}
 *   with ?branchId= from the posted voucher row (HO audit).
 * - Print links add ?autoprint=1; pages call setupReceiptAutoprint /
 *   setupThermalTicketAutoprint (read-only reprint, no archive writes).
 * - COPY watermark applies to Receipt Lookup preview only, not direct
 *   /shop/receipt or /shop/refund-receipt reprints (thermal duplicate layout).
 * - REC PDF status in inquiry uses existing Receipt.pdfPath only.
 * - REF has no archive/pdfPath field yet — inquiry PDF column stays "—".
 */

export {}
