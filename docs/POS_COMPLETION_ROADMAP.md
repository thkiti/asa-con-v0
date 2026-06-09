# POS Completion Roadmap

เอกสารอ้างอิง / memory doc — งานที่เหลือก่อน **asa-con-v0** ถือว่า **POS Complete** สำหรับใช้งานร้านจริง

**สถานะปัจจุบัน:** Core POS ใช้งานได้แล้ว  
**กฎ:** ฟีเจอร์ใหม่นอก roadmap นี้ **ห้ามแทรก** งาน P1–P4 โดยไม่ได้รับอนุมัติ

---

## Definition of POS Complete

ระบบถือว่า POS Complete เมื่อ:

| Phase | สถานะที่ต้องถึง |
|-------|----------------|
| **P1** | Posting & stock validation ครบ |
| **P2** | Thermal 80mm architecture ครบ |
| **P3** | READ_Z operational ครบ |
| **P4** | Repair workflow review มีมติแล้ว |
| — | Tests / builds ผ่านทั้งหมด |

หลัง POS Complete → โฟกัสพ разработкаย้ายไป **Shop Management / ERP** (ไม่ใช่ POS)

---

## Roadmap overview

```
P1 Posting & Stock Validation
  → P2 Thermal 80mm Architecture
  → P3 READ_Z Operational
  → P4 Repair Workflow Review
  → POS Complete
```

---

## P1 — Posting & Stock Validation

**เป้าหมาย:** ยืนยัน flow ปฏิบัติการครบวงจร

```
Sale → Stock Movement → Inventory Balance → Finance Posting
```

**ต้อง verify**

- Sale หัก stock ถูกต้อง (TRACKED → `issueStock`; CONSUMABLE → skip พร้อม `ledgerSkippedReason`)
- Refund ไม่กระทบ stock โดยไม่ตั้งใจ — **money-only** ตาม [AD001 ใน 99_ASA_HANDBOOK.md](./99_ASA_HANDBOOK.md); ไม่เรียก `receiveStock`; คืนสินค้าเข้าคลังผ่าน Stock Document แยก
- Inventory balance ตรงหลัง sale
- Finance posting ตรง (`POS_SALE` / `POS_REFUND`)
- Reconciliation ตรง

**หลักฐาน:** [P1_POSTING_STOCK_VALIDATION.md](./P1_POSTING_STOCK_VALIDATION.md) · refund E2E: [P1C_REFUND_E2E_VALIDATION.md](./P1C_REFUND_E2E_VALIDATION.md)

**Exit:** flow ปฏิบัติการ validate end-to-end แล้ว

---

## P2 — Thermal 80mm Architecture

**เป้าหมาย:** รวมเอกสารพิมพ์ thermal ทุกประเภทให้ใช้สถาปัตยกรรมเดียวกัน

**เอกสาร (ThermalDocumentType — phase 1)**

| Type | คำอธิบาย |
|------|----------|
| `RECEIPT` | ใบเสร็จ / ใบกำกับภาษีอย่างย่อ |
| `REFUND` | ใบ refund (header/footer ว่าง → inherit จาก RECEIPT) |
| `COLLECTOR` | ใบ collector report |
| `REPAIR_TICKET` | ตั๋วรับซ่อม |
| `READ_Z` | ใบสรุปปิดวัน (thermal — แยกจากแผง READ X/Z บนจอ) |

**ไม่รวม phase 1:** `STOCK_SLIP`, `WORK_TIME` — HO ดู/ export จาก UI ระบบได้อยู่แล้ว

**เทคนิค**

- Printer: thermal 80mm (เช่น XPrinter XP-Q80I), ESC/POS ผ่าน browser driver
- Layout: 30 คอลัมน์ monospace, `@page { size: 80mm auto }`
- Stack: `window.print()` — **ไม่มี** ESC/POS library ใน repo

**ต้องมี**

- Shared kernel: `lib/thermal/` (format, builders, print-css, print-dom)
- Component: `ThermalSlipPre` — preview width = print width
- Preview source = print source (`build*SlipText` + layout)
- Setup: **Document Layout Setup** — แก้ได้เฉพาะ **HO_ADMIN**
- Model: `ThermalDocumentLayout` (แทน `ReceiptPrintSettings` ในอนาคต)

**Exit**

- เอกสาร thermal ทั้ง 5 ประเภทใช้ kernel เดียว
- ไม่มี formatting logic ซ้ำระหว่าง preview กับ print
- Layout ตั้งค่าจาก admin ได้ครบทุก type

**เอกสารที่เกี่ยวข้อง**

- [RECEIPT_SETUP.md](./RECEIPT_SETUP.md) — สถานะปัจจุบัน (ก่อน unify)
- [08_POS_CHECKOUT_ARCHITECTURE.md](./08_POS_CHECKOUT_ARCHITECTURE.md) — checkout / receipt numbering

**Implementation plan (รายละเอียด migration):** Cursor plan `thermal_80mm_layout_architecture` — investigation + Steps 1–8

---

## P3 — READ_Z (Operational)

**เป้าหมาย:** ใบสรุปปิดวันสำหรับ shop manager / เก็บ hard copy ที่เคาน์เตอร์

**สถานะปัจจุบัน (2026-06-10)**

| หัวข้อ | สถานะ |
|--------|--------|
| Core flow (keypad → credential → API → panel → print+exit) | **ครบ** — `POST /api/pos/read-report`, `buildPosDailyReadReport`, `PosReadReportPanel` |
| Thermal print path (`build-read-z-slip`, `PosReadZSlip`, clone print) | **ครบ** — Z-mode พิมพ์ thermal แทน full-panel print |
| Aggregation: receipt count, refund count, gross, net | **ครบ** — `ReadReportPayload` + management product-group zero-fill |
| **TOTAL = Net sales** (`netTotal`) | **ครบ** — thermal slip + Z-mode panel footer (ไม่ใช่ gross) |
| ส่วนลด (discount line) | **N/A ใน v0** — schema ไม่มี discount field บน `Sale` / `SaleItem` |
| Validate ที่ร้าน (XPrinter 80mm) | **ยังไม่ครบ** — **blocker เดียวที่เหลือสำหรับ P3 exit** |

**แยกจาก P2**

| หัวข้อ | P2 (architecture) | P3 (operational) |
|--------|-------------------|------------------|
| `build-read-z-slip`, `PosReadZSlip`, layout tab | ✓ | ✓ |
| Z-mode พิมพ์ thermal แทน full-panel print | ✓ | ✓ |
| ข้อมูลจาก `ReadReportPayload` | ✓ | ✓ |
| Aggregation + TOTAL semantics | | ✓ (discount N/A) |
| Validate ที่ร้าน (XPrinter 80mm) | | **ค้าง** |

**ข้อมูลบน slip (เป้าหมาย)**

- Header จาก layout
- หัวข้อ: READ Z / Daily Sales Summary
- สาขา, วันทำการ, staff
- Gross sales, refund total, net sales — **TOTAL = net sales**
- ส่วนลด — **ไม่แสดงใน v0** (ไม่มี discount ใน schema/checkout)
- ยอดชำระแยกช่องทาง (cash, credit card, prompt pay, QR, transfer)
- จำนวน receipt / refund (`saleCount`, `refundCount`)
- Footer จาก layout

**ข้อจำกัด (ห้ามละเมิด)**

- **Read-only** — ห้าม post GL, ห้าม move stock, ห้ามแก้ sale/payment/refund
- แผง READ X/Z บนจอ **ไม่ redesign** — เปลี่ยนเฉพาะ artifact ที่พิมพ์ออกมา

**Exit:** READ_Z ใช้ปิดวันได้จริง + **validate ที่ร้าน (XPrinter 80mm) แล้ว** — code path พร้อม; รอ physical print test ที่สาขา

---

## P4 — Repair Workflow Review

**เป้าหมาย:** ตัดสิน production readiness ของ workflow ซ่อม

**ทบทวน**

- Repair status lifecycle
- Collection process
- Integration กับ repair ticket

**Exit:** บันทึกมติ — **Complete** (พร้อม production) หรือ **Future Phase**

**หมายเหตุ:** P2 ย้ายเฉพาะ **การพิมพ์** repair ticket เป็น thermal builder — P4 ตัดสิน workflow ทั้งระบบ

---

## Deferred (ไม่บlock POS Complete)

- ปรับปรุงรูป catalog
- cosmetic ใบเสร็จเพิ่มเติม
- CRM, warranty, supplier, purchase workflow
- Advanced reporting, marketing
- Thermal `STOCK_SLIP`, `WORK_TIME`

---

## Layout inheritance (อ้างอิง)

| Type | กฎ |
|------|-----|
| `REFUND` | header/footer ว่าง → โหลดจาก `RECEIPT` |
| `READ_Z` | row ของตัวเอง — ไม่ inherit จาก RECEIPT |
| อื่นๆ | แต่ละ type มี row ของตัวเอง |

**Receipt header สองชั้น (สำคัญ)**

1. **Configurable lines** — headerLine1–3, footerLine1–5 จาก `ThermalDocumentLayout`
2. **Dynamic block** — tax ID, ที่อยู่, เบอร์, รายการขาย — จาก Branch master + transaction (ไม่ใส่ใน layout table)

---

## Current code pointers (v0)

| เอกสาร | ไฟล์หลัก |
|--------|----------|
| Receipt slip | `lib/pos/receipt-slip-format.ts`, `components/pos/PosSaleReceiptSlip.tsx` |
| Refund slip | `lib/pos/refund-slip-format.ts` |
| Collector slip | `lib/pos-ui/build-collector-ticket-slip.ts` |
| Repair ticket | `components/pos/PosRepairTicketOverlay.tsx` |
| READ Z (panel + API) | `components/pos/PosReadReportPanel.tsx`, `lib/pos/build-pos-read-report.ts`, `app/api/pos/read-report/route.ts` |
| READ Z (thermal slip) | `lib/thermal/build-read-z-slip.ts`, `components/pos/PosReadZSlip.tsx`, `lib/pos-ui/print-read-report.ts` |
| Receipt setup (ปัจจุบัน) | `components/admin/ReceiptSetupPage.tsx`, model `ReceiptPrintSettings` |
| Print CSS | `app/globals.css` |

**Legacy (อย่าขยาย):** `asa-con/app/full-pos/page.tsx`

---

## Checklist ก่อน deploy POS Complete

- [x] P1 — sale/refund/stock/finance/reconcile verified — see [P1_POSTING_STOCK_VALIDATION.md](./P1_POSTING_STOCK_VALIDATION.md)
- [ ] P2 — 5 thermal types บน `lib/thermal`, layout setup ครบ, tests ผ่าน
- [ ] P3 — READ_Z operational (code ครบ; **ค้าง:** validate ที่ร้าน XPrinter 80mm)
- [ ] P4 — repair workflow decision บันทึกแล้ว
- [ ] CI / build ผ่าน

---

*Last updated: 2026-06-10 — P3 READ_Z: core flow + thermal print + TOTAL=netTotal ครบ; discount N/A (v0 schema); ค้าง shop XPrinter validation*
