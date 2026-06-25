# DIGITAL_DOCUMENT_VAULT_VISION.md

## Digital Document Vault

### Why

ธุรกิจทุกแห่งมี "ตู้เอกสาร"

ภายในตู้ประกอบด้วย

* ใบเสร็จรับเงิน
* ใบกำกับภาษี
* Payment Voucher
* Revenue Voucher
* Stock Document
* Repair Ticket
* ใบโอนเงิน
* เช็ค
* Invoice
* รูปถ่าย
* เอกสารแนบ

การทำงานแบบเดิม

```
สร้างเอกสาร
        │
พิมพ์กระดาษ
        │
แนบหลักฐาน
        │
เย็บรวมกัน
        │
เก็บใส่แฟ้ม
        │
เก็บเข้าตู้
```

เมื่อเวลาผ่านไป

* ค้นหาเอกสารยาก
* กระดาษเสื่อม
* เอกสารสูญหาย
* ต้องใช้พื้นที่จัดเก็บจำนวนมาก

---

## แนวคิดของ asa-con-v0

เปลี่ยน "ตู้เอกสาร" ให้เป็น "Digital Document Vault"

ทุกเอกสารที่จบสมบูรณ์ จะมี Digital Package ของตัวเอง

ตัวอย่าง

```
Receipt
│
├── Receipt.pdf
├── Snapshot.json
└── Metadata.json
```

```
Payment Voucher
│
├── Voucher.pdf
├── Snapshot.json
├── Invoice.pdf
├── TaxInvoice.pdf
├── BankSlip.jpg
├── Signature.png
└── Metadata.json
```

```
Repair Ticket
│
├── RepairTicket.pdf
├── BeforeRepair.jpg
├── AfterRepair.jpg
├── CustomerSignature.png
└── Snapshot.json
```

---

## Core Principles

### 1. One Document = One Digital Package

ทุกเอกสารมี Package ของตัวเอง

### 2. Snapshot is Immutable

เมื่อเอกสารถูกยืนยันแล้ว

จะสร้าง Snapshot

และจะไม่สร้างเอกสารใหม่จากข้อมูลปัจจุบันอีก

### 3. PDF is the Official Copy

PDF คือสำเนาอย่างเป็นทางการของเอกสาร

View

Print

Download

Email

ทั้งหมดใช้ PDF เดียวกัน

### 4. Attachments belong to the Document

หลักฐานทุกชนิดเป็นส่วนหนึ่งของเอกสาร

เช่น

* Bank Slip
* Cheque
* Invoice
* Photo
* Signature

ไม่เก็บแยก

### 5. Lookup opens the Package

เมื่อค้นหาเอกสาร

ระบบเปิด Digital Package

ไม่ใช่สร้างเอกสารใหม่

---

## Benefits

* ลดการใช้กระดาษ
* ลดพื้นที่เก็บเอกสาร
* ค้นหาเอกสารได้รวดเร็ว
* Reprint ได้เหมือนต้นฉบับ
* Audit ง่าย
* รองรับการทำงานแบบ Paperless
* รองรับการส่งเอกสารทาง Email ในอนาคต
* รองรับการจัดเก็บบน Cloud

---

## Long-term Vision

Digital Document Vault จะเป็นศูนย์กลางของเอกสารทั้งหมดใน asa-con-v0

ทุกโมดูลของระบบจะใช้แนวคิดเดียวกัน

* POS
* Operations
* Finance
* Master
* Service

ใช้มาตรฐานการจัดเก็บเดียวกัน เพื่อให้การค้นหา การตรวจสอบ และการจัดเก็บเอกสารเป็นรูปแบบเดียวกันทั้งระบบ
