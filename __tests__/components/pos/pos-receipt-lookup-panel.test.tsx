/**
 * @jest-environment jsdom
 */
import { act, useState, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { PosReceiptLookupPanel, type PosReceiptLookupPanelHandle } from "@/components/pos/PosReceiptLookupPanel"
import { PosReceiptPanel } from "@/components/pos/PosReceiptPanel"
import type { ReceiptLookupRow } from "@/lib/pos/receipt-lookup-types"
import type { RefundLookupRow } from "@/lib/pos/refund-lookup-types"
import type { CollectorLookupRow } from "@/lib/pos/collector-lookup-types"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { PosTerminalSession } from "@/lib/pos-ui/types"
import {
  posDocumentLookupButton,
  posDocumentLookupInput,
  posDocumentLookupLabel,
  posDocumentLookupMuted,
  posDocumentLookupPanel,
  posDocumentLookupSelect,
} from "@/lib/pos-ui/pos-document-lookup-classes"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

jest.mock("@/lib/pos-ui/receipt-lookup-client", () => ({
  fetchReceiptLookup: jest.fn(),
  openReceiptArchivePdf: jest.fn(),
  printReceiptArchivePdf: jest.fn(),
}))

jest.mock("@/lib/pos-ui/refund-lookup-client", () => ({
  fetchRefundLookup: jest.fn(),
}))

jest.mock("@/lib/pos-ui/collector-lookup-client", () => ({
  fetchCollectorLookup: jest.fn(),
  openCollectorArchivePdf: jest.fn(),
  printCollectorArchivePdf: jest.fn(),
}))

jest.mock("@/lib/pos-ui/document-lookup-running-client", () => ({
  fetchDocumentLookupRunningNumbers: jest.fn(),
}))

jest.mock("@/lib/pos-ui/read-report-client", () => ({
  fetchPosReadZReviewReport: jest.fn(),
  verifyPosStaffCredential: jest.fn(),
}))

jest.mock("@/lib/pos-ui/pos-rec-ref-lookup", () => ({
  searchPosRecRefLookup: jest.fn(),
}))

import { fetchReceiptLookup } from "@/lib/pos-ui/receipt-lookup-client"
import { fetchRefundLookup } from "@/lib/pos-ui/refund-lookup-client"
import { fetchCollectorLookup } from "@/lib/pos-ui/collector-lookup-client"
import { fetchDocumentLookupRunningNumbers } from "@/lib/pos-ui/document-lookup-running-client"
import { fetchPosReadZReviewReport } from "@/lib/pos-ui/read-report-client"
import { searchPosRecRefLookup } from "@/lib/pos-ui/pos-rec-ref-lookup"
import {
  voucherInquiryFilterControl,
  voucherInquiryFilterFramed,
} from "@/lib/finance-ui/finance-visual-classes"

const mockedFetch = fetchReceiptLookup as jest.MockedFunction<typeof fetchReceiptLookup>
const mockedRefundFetch = fetchRefundLookup as jest.MockedFunction<typeof fetchRefundLookup>
const mockedCollectorFetch = fetchCollectorLookup as jest.MockedFunction<typeof fetchCollectorLookup>
const mockedRunningFetch = fetchDocumentLookupRunningNumbers as jest.MockedFunction<
  typeof fetchDocumentLookupRunningNumbers
>
const mockedReadZReviewFetch = fetchPosReadZReviewReport as jest.MockedFunction<
  typeof fetchPosReadZReviewReport
>
const mockedRecRefSearch = searchPosRecRefLookup as jest.MockedFunction<
  typeof searchPosRecRefLookup
>

const receiptThermalLayout = {
  ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
  headerBlockText: "บริษัท เอเอสเอ เซอร์วิสเซส จำกัด",
  footerBlockText: "ขอบคุณที่ใช้บริการ",
  subHeaderBlockText: "ใบกำกับภาษีอย่างย่อ",
}

const session: PosTerminalSession = {
  userId: "u1",
  staffId: "103",
  name: "Somsak Kamnuch",
  role: "SH_STAFF",
  branchId: "b1",
  branchCode: "SH001",
  branchName: "Chidlom",
  documentEntityCode: "ASAS",
}

const noop = () => {}

const cartLine = {
  productId: "p1",
  code: "0101001",
  name: "Widget",
  qty: 1,
  unitPrice: "10.00",
  priceSource: "SELLING" as const,
  catalogImageUrl: null,
}

const readyReceipt: ReceiptLookupRow = {
  receiptId: "receipt-1",
  saleId: "sale-1",
  receiptNo: "REC-SH001-202606-0113",
  issuedAt: "2026-06-06T10:00:00.000Z",
  branchCode: "SH001",
  branchName: "Chidlom",
  branchAddress: null,
  branchPhone: "02-111-2222",
  companyTaxId: "0123456789012",
  machineTaxId: "MACHINE-001",
  staffDisplay: "103-Somsak",
  total: "250.00",
  paymentMethod: "CASH",
  paymentMethodLabel: "CASH",
  cashAmount: "250.00",
  change: "0.00",
  archiveStatus: "ready",
  archiveStatusLabel: "Ready",
  pdfUrl: "/api/pos/receipts/receipt-1/pdf?disposition=inline",
  items: [
    {
      code: "0101001",
      name: "Widget",
      qty: 2,
      unitPrice: "125.00",
      lineTotal: "250.00",
    },
  ],
}

const legacyReceipt: ReceiptLookupRow = {
  ...readyReceipt,
  receiptId: "receipt-2",
  receiptNo: "REC-SH001-202606-0112",
  archiveStatus: "legacy",
  archiveStatusLabel: "Legacy / no archive",
  pdfUrl: null,
}

const refundThermalLayout = {
  ...DEFAULT_THERMAL_LAYOUTS.REFUND,
}

const collectorThermalLayout = {
  ...DEFAULT_THERMAL_LAYOUTS.COLLECTOR,
}

const legacyRefund: RefundLookupRow = {
  refundId: "refund-1",
  refundNo: "REF-SH001-202606-0008",
  issuedAt: "2026-06-26T09:58:00.000Z",
  kind: "SALE_LINKED",
  amount: "290.00",
  reason: "Defective item",
  branchId: "b1",
  branchCode: "SH001",
  branchName: "Chidlom",
  branchAddress: null,
  branchPhone: "02-111-2222",
  companyTaxId: "0123456789012",
  machineTaxId: "MACHINE-001",
  cashierDisplay: "103-Somsak",
  saleId: "sale-1",
  originalReceiptId: "receipt-1",
  originalReceiptNo: "REC-SH001-202606-0111",
  originalReceiptTotal: "860.00",
  archiveStatus: "legacy",
  archiveStatusLabel: "Legacy / no archive",
  pdfUrl: null,
}

const legacyCollector: CollectorLookupRow = {
  collectorReportId: "col-1",
  collectNo: "COL-SH001-202606-0003",
  issuedAt: "2026-06-09T10:00:00.000Z",
  branchId: "b1",
  branchCode: "SH001",
  branchName: "Chidlom",
  branchPhone: "02-111-2222",
  companyTaxId: "0123456789012",
  machineTaxId: "MACHINE-001",
  report: {
    mode: "COLLECT",
    collectNo: "COL-SH001-202606-0003",
    bangkokDate: "2026-06-05 – 2026-06-09",
    bangkokDateFrom: "2026-06-05",
    bangkokDateTo: "2026-06-09",
    generatedAt: "2026-06-09T10:00:00.000Z",
    staffId: "001",
    staffName: "HO Collector",
    branchCode: "SH001",
    branchName: "Chidlom",
    groupLines: [],
    paymentLines: [],
    dailyCashLines: [{ salesDateYmd: "2026-06-05", cashAmount: 36120, ticketCount: 37 }],
    grandTotal: 36120,
    saleCount: 37,
    refundCount: 0,
    refundTotal: 0,
    netTotal: 36120,
  },
  archiveStatus: "legacy",
  archiveStatusLabel: "Legacy / no archive",
  pdfUrl: null,
}

const readZThermalLayout = DEFAULT_THERMAL_LAYOUTS.READ_Z

const readZReport = {
  mode: "Z" as const,
  bangkokDate: "2026-06-27",
  readZScope: "daily" as const,
  readZViewDate: "2026-06-27",
  readZReview: true,
  generatedAt: "2026-06-27T10:00:00.000Z",
  staffId: "103",
  staffName: "Staff",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  grandTotal: 100,
  saleCount: 2,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 100,
}

function renderLookupPanel(props: Partial<ComponentProps<typeof PosReceiptLookupPanel>> = {}) {
  return (
    <PosReceiptLookupPanel
      session={session}
      receiptThermalLayout={receiptThermalLayout}
      refundThermalLayout={refundThermalLayout}
      collectorThermalLayout={collectorThermalLayout}
      readZThermalLayout={readZThermalLayout}
      runningNo="0113"
      onRunningNoChange={noop}
      focusRequestId={1}
      onClose={noop}
      {...props}
    />
  )
}

describe("PosReceiptPanel receipt lookup mode", () => {
  it("shows lookup overlay on top of cart via overlay prop", () => {
    const html = renderToStaticMarkup(
      <PosReceiptPanel
        session={session}
        receiptNo="REC-SH001-202606-0001"
        lines={[cartLine]}
        onIncrementQty={noop}
        onDecrementQty={noop}
        onRemoveLine={noop}
        onClearCart={noop}
        overlay={renderLookupPanel()}
      />
    )

    expect(html).toContain('data-testid="pos-receipt-lookup-panel"')
    expect(html).toContain("Document Lookup")
    expect(html).toContain(posDocumentLookupPanel)
    expect(html).toContain(posDocumentLookupLabel)
    expect(html).toContain(posDocumentLookupSelect)
    expect(html).toContain(voucherInquiryFilterFramed)
    expect(html).toContain(voucherInquiryFilterControl)
    expect(html).not.toContain(posDocumentLookupButton)
    expect(html).not.toContain("text-zinc-900")
    expect(html).not.toContain("text-white/80")
    expect(html).toContain('data-testid="document-lookup-doc-type"')
    expect(html).toContain('data-testid="pos-cart-row"')
  })
})

describe("PosReceiptLookupPanel", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    jest.clearAllMocks()
    mockedFetch.mockResolvedValue({ ok: true, result: { receipts: [] } })
    mockedRecRefSearch.mockResolvedValue({ ok: true, rows: [] })
    mockedRunningFetch.mockResolvedValue({ ok: true, runningNumbers: ["0001", "0008"] })
    mockedReadZReviewFetch.mockResolvedValue({ ok: true, report: readZReport })
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  function mountPanel(props: Partial<ComponentProps<typeof PosReceiptLookupPanel>> = {}) {
    act(() => {
      root.render(renderLookupPanel(props))
    })
  }

  async function mountPanelAndFlush(
    props: Partial<ComponentProps<typeof PosReceiptLookupPanel>> = {}
  ) {
    mountPanel(props)
    await act(async () => {
      await Promise.resolve()
    })
  }

  function mountHarness(initialRunning = "0113") {
    function Harness() {
      const [runningNo, setRunningNo] = useState(initialRunning)
      return (
        <PosReceiptLookupPanel
          session={session}
          receiptThermalLayout={receiptThermalLayout}
          refundThermalLayout={refundThermalLayout}
          collectorThermalLayout={collectorThermalLayout}
          readZThermalLayout={readZThermalLayout}
          runningNo={runningNo}
          onRunningNoChange={setRunningNo}
          focusRequestId={1}
          onClose={noop}
        />
      )
    }
    act(() => {
      root.render(<Harness />)
    })
  }

  it("uses compact inquiry filters for Receipt with period and more-filter dot", async () => {
    await mountPanelAndFlush()

    expect(container.querySelector('[data-testid="receipt-lookup-filter-period"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-more-filter"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-more-filter-panel"]')).toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-filter-no"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="document-lookup-running-select"]')).toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-date"]')).toBeNull()
  })

  it("searches receipts through inquiry search with period date range", async () => {
    mockedRecRefSearch.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: readyReceipt.receiptId,
          documentNo: readyReceipt.receiptNo,
          issuedAt: readyReceipt.issuedAt,
          branchCode: readyReceipt.branchCode,
          branchName: readyReceipt.branchName,
          docType: "REC",
          statusLabel: readyReceipt.archiveStatusLabel,
          pdfAvailable: true,
          receipt: readyReceipt,
        },
      ],
    })

    mountPanel({ runningNo: "0113" })
    await act(async () => {
      await Promise.resolve()
    })

    const searchBtn = container.querySelector(
      '[data-testid="receipt-lookup-search"]'
    ) as HTMLButtonElement

    await act(async () => {
      searchBtn.click()
      await Promise.resolve()
    })

    expect(mockedRecRefSearch).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({
        docType: "REC",
        periodKey: expect.any(String),
      })
    )
    expect(container.querySelector('[data-testid="receipt-lookup-more-filter-panel"]')).toBeNull()
  })

  it("shows empty inquiry table when no receipt matches", async () => {
    mockedRecRefSearch.mockResolvedValue({ ok: true, rows: [] })

    mountHarness("0113")

    await act(async () => {
      ;(
        container.querySelector('[data-testid="receipt-lookup-search"]') as HTMLButtonElement
      ).click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="receipt-lookup-table"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-empty"]')).toBeNull()
  })

  it("closes panel when X button is clicked", () => {
    const onClose = jest.fn()
    mountPanel({ onClose })

    const closeBtn = container.querySelector(
      '[data-testid="pos-receipt-lookup-close"]'
    ) as HTMLButtonElement
    act(() => {
      closeBtn.click()
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("closes panel on Escape", () => {
    const onClose = jest.fn()
    mountPanel({ onClose })

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not list Repair Ticket in Document Lookup doc types", async () => {
    await mountPanelAndFlush()

    const docTypeSelect = container.querySelector(
      '[data-testid="document-lookup-doc-type"]'
    ) as HTMLSelectElement
    const optionValues = Array.from(docTypeSelect.options).map((option) => option.value)

    expect(optionValues).toEqual(["receipt", "refund", "collector", "read-z"])
    expect(optionValues).not.toContain("repair-ticket")
    expect(container.textContent).not.toContain("Repair Ticket")
  })

  it("shows READ Z for SH_STAFF with receipt layout, calendar, and Cumulative To-Date", async () => {
    const shopSession: PosTerminalSession = { ...session, role: "SH_STAFF" }
    await mountPanelAndFlush({ session: shopSession })

    const docTypeSelect = container.querySelector(
      '[data-testid="document-lookup-doc-type"]'
    ) as HTMLSelectElement
    const readZOption = Array.from(docTypeSelect.options).find(
      (option) => option.value === "read-z"
    )
    expect(readZOption?.textContent).toBe("READ Z")
    expect(readZOption?.textContent).not.toContain("Coming soon")

    mockedReadZReviewFetch.mockClear()

    await act(async () => {
      docTypeSelect.value = "read-z"
      docTypeSelect.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="document-lookup-running-select"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-date"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="document-lookup-read-z-day"]')).toBeNull()
    expect(container.querySelector('[data-testid="document-lookup-coming-soon"]')).toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-ho-auth-gate"]')).toBeNull()

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockedReadZReviewFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "daily",
        bangkokDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    expect(
      container.querySelector('[data-testid="document-lookup-read-z-preview"]')
    ).not.toBeNull()

    const searchBtn = container.querySelector(
      '[data-testid="receipt-lookup-search"]'
    ) as HTMLButtonElement
    expect(searchBtn.textContent).toBe("Cumulative To-Date")

    mockedReadZReviewFetch.mockClear()

    await act(async () => {
      searchBtn.click()
      await Promise.resolve()
    })

    expect(mockedReadZReviewFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "cumulative-to-date",
        bangkokDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
  })

  it("loads READ Z daily ticket when calendar date changes", async () => {
    await mountPanelAndFlush({ initialDocType: "read-z" })

    const dateInput = container.querySelector(
      '[data-testid="receipt-lookup-date"]'
    ) as HTMLInputElement
    expect(dateInput).not.toBeNull()

    mockedReadZReviewFetch.mockClear()

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set
      setValue?.call(dateInput, "2026-06-20")
      dateInput.dispatchEvent(new Event("input", { bubbles: true }))
      dateInput.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })

    expect(mockedReadZReviewFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "daily",
        bangkokDate: "2026-06-20",
      })
    )
  })

  it("uses shared print preview renderer with header, footer, and COPY watermark", async () => {
    mockedRecRefSearch.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: readyReceipt.receiptId,
          documentNo: readyReceipt.receiptNo,
          issuedAt: readyReceipt.issuedAt,
          branchCode: readyReceipt.branchCode,
          branchName: readyReceipt.branchName,
          docType: "REC",
          statusLabel: readyReceipt.archiveStatusLabel,
          pdfAvailable: true,
          receipt: readyReceipt,
        },
      ],
    })

    await mountPanelAndFlush()

    const searchBtn = container.querySelector(
      '[data-testid="receipt-lookup-search"]'
    ) as HTMLButtonElement

    await act(async () => {
      searchBtn.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="receipt-lookup-print-preview"]')).not.toBeNull()
    expect(container.querySelector(".receipt-setup-preview-slip")).not.toBeNull()
    expect(container.querySelector('[data-testid="thermal-ticket-header"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="thermal-ticket-footer"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="thermal-ticket-subheader"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-copy-watermark"]')).not.toBeNull()
    expect(container.textContent).toContain("บริษัท เอเอสเอ เซอร์วิสเซส จำกัด")
    expect(container.textContent).toContain("ขอบคุณที่ใช้บริการ")
    expect(container.textContent).toContain("Widget")
    expect(container.textContent).toContain("103-Somsak")
    expect(container.querySelector('[data-testid="receipt-lookup-view-pdf"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-print-pdf"]')).not.toBeNull()
  })

  it("shows legacy slip preview, archive status, and no PDF buttons", async () => {
    mockedRecRefSearch.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: legacyReceipt.receiptId,
          documentNo: legacyReceipt.receiptNo,
          issuedAt: legacyReceipt.issuedAt,
          branchCode: legacyReceipt.branchCode,
          branchName: legacyReceipt.branchName,
          docType: "REC",
          statusLabel: legacyReceipt.archiveStatusLabel,
          pdfAvailable: null,
          receipt: legacyReceipt,
        },
      ],
    })

    await mountPanelAndFlush()

    const searchBtn = container.querySelector(
      '[data-testid="receipt-lookup-search"]'
    ) as HTMLButtonElement

    await act(async () => {
      searchBtn.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="receipt-lookup-print-preview"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-copy-watermark"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-legacy-message"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-view-pdf"]')).toBeNull()
    expect(container.textContent).not.toContain("Receipt Preview")
    expect(container.textContent).not.toContain("Archive:")
    expect(
      container
        .querySelector('[data-testid="receipt-lookup-preview-panel"]')
        ?.getAttribute("data-archive-status")
    ).toBe("legacy")
  })

  it("uses compact inquiry filters for Refund", async () => {
    mountPanel({ runningNo: "" })

    const docTypeSelect = container.querySelector(
      '[data-testid="document-lookup-doc-type"]'
    ) as HTMLSelectElement

    await act(async () => {
      docTypeSelect.value = "refund"
      docTypeSelect.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="refund-lookup-filter-period"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="refund-lookup-more-filter"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="refund-lookup-more-filter-panel"]')).toBeNull()
    expect(container.querySelector('[data-testid="document-lookup-running-select"]')).toBeNull()
    expect(mockedRunningFetch).not.toHaveBeenCalled()
  })

  it("searches refund through inquiry search when Refund doc type is selected", async () => {
    mockedRecRefSearch.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: legacyRefund.refundId,
          documentNo: legacyRefund.refundNo,
          issuedAt: legacyRefund.issuedAt,
          branchCode: legacyRefund.branchCode,
          branchName: legacyRefund.branchName,
          docType: "REF",
          statusLabel: legacyRefund.archiveStatusLabel,
          pdfAvailable: null,
          refund: legacyRefund,
        },
      ],
    })

    mountHarness("")

    const docTypeSelect = container.querySelector(
      '[data-testid="document-lookup-doc-type"]'
    ) as HTMLSelectElement

    await act(async () => {
      docTypeSelect.value = "refund"
      docTypeSelect.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })

    const noInput = container.querySelector(
      '[data-testid="refund-lookup-filter-no"]'
    ) as HTMLInputElement

    await act(async () => {
      noInput.value = "REF-SH001-202606-0008"
      noInput.dispatchEvent(new Event("input", { bubbles: true }))
      noInput.dispatchEvent(new Event("change", { bubbles: true }))
    })

    const searchBtn = container.querySelector(
      '[data-testid="refund-lookup-search"]'
    ) as HTMLButtonElement

    await act(async () => {
      searchBtn.click()
      await Promise.resolve()
    })

    expect(mockedRecRefSearch).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({
        docType: "REF",
      })
    )
    expect(mockedRefundFetch).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="refund-lookup-print-preview"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-copy-watermark"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="refund-lookup-legacy-message"]')).not.toBeNull()
    expect(container.textContent).toContain("Legacy refund — PDF archive not available")
    expect(container.textContent).toContain("REF-SH001-202606-0008")
    expect(container.textContent).toContain("290.00")
    expect(container.querySelector('[data-testid="receipt-lookup-view-pdf"]')).toBeNull()
  })

  it("searches collector by built COL number and uses collector ticket renderer with COPY watermark", async () => {
    mockedCollectorFetch.mockResolvedValue({
      ok: true,
      result: { collectors: [legacyCollector] },
    })

    function CollectorHarness() {
      const [runningNo, setRunningNo] = useState("0003")
      return (
        <PosReceiptLookupPanel
          session={session}
          receiptThermalLayout={receiptThermalLayout}
          refundThermalLayout={refundThermalLayout}
          collectorThermalLayout={collectorThermalLayout}
          readZThermalLayout={readZThermalLayout}
          initialDocType="collector"
          runningNo={runningNo}
          onRunningNoChange={setRunningNo}
          focusRequestId={1}
          onClose={noop}
        />
      )
    }

    act(() => {
      root.render(<CollectorHarness />)
    })

    await act(async () => {
      await Promise.resolve()
    })

    const searchBtn = container.querySelector(
      '[data-testid="receipt-lookup-search"]'
    ) as HTMLButtonElement

    mockedFetch.mockClear()

    await act(async () => {
      searchBtn.click()
      await Promise.resolve()
    })

    expect(mockedCollectorFetch).toHaveBeenCalledWith({
      branchId: "b1",
      collectNo: "COL-SH001-202606-0003",
    })
    expect(mockedFetch).not.toHaveBeenCalled()
    expect(mockedRefundFetch).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="collector-lookup-print-preview"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-copy-watermark"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="collector-lookup-legacy-message"]')).not.toBeNull()
    expect(container.textContent).toContain("Legacy collector ticket — PDF archive not available")
    expect(container.textContent).toContain("05/06/2026")
    expect(container.textContent).toContain("Receipt Count")
    expect(container.querySelector('[data-testid="collector-lookup-view-pdf"]')).toBeNull()
  })

  it("disables keypad running input mode for lookup", async () => {
    const onKeypadRunningInputEnabledChange = jest.fn()
    mountPanel({ onKeypadRunningInputEnabledChange })

    await act(async () => {
      await Promise.resolve()
    })
    expect(onKeypadRunningInputEnabledChange).toHaveBeenCalledWith(false)

    const docTypeSelect = container.querySelector(
      '[data-testid="document-lookup-doc-type"]'
    ) as HTMLSelectElement

    await act(async () => {
      docTypeSelect.value = "refund"
      docTypeSelect.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onKeypadRunningInputEnabledChange).toHaveBeenLastCalledWith(false)
  })

  it("searches selected Refund doc type via imperative handle", async () => {
    mockedRecRefSearch.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: legacyRefund.refundId,
          documentNo: legacyRefund.refundNo,
          issuedAt: legacyRefund.issuedAt,
          branchCode: legacyRefund.branchCode,
          branchName: legacyRefund.branchName,
          docType: "REF",
          statusLabel: legacyRefund.archiveStatusLabel,
          pdfAvailable: null,
          refund: legacyRefund,
        },
      ],
    })

    const handleRef: { current: PosReceiptLookupPanelHandle | null } = { current: null }

    function Harness() {
      const [runningNo, setRunningNo] = useState("0008")
      return (
        <PosReceiptLookupPanel
          ref={(instance) => {
            handleRef.current = instance
          }}
          session={session}
          receiptThermalLayout={receiptThermalLayout}
          refundThermalLayout={refundThermalLayout}
          collectorThermalLayout={collectorThermalLayout}
          readZThermalLayout={readZThermalLayout}
          runningNo={runningNo}
          onRunningNoChange={setRunningNo}
          focusRequestId={1}
          onClose={noop}
        />
      )
    }

    act(() => {
      root.render(<Harness />)
    })

    const docTypeSelect = container.querySelector(
      '[data-testid="document-lookup-doc-type"]'
    ) as HTMLSelectElement

    await act(async () => {
      docTypeSelect.value = "refund"
      docTypeSelect.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })

    await act(async () => {
      handleRef.current?.search()
      await Promise.resolve()
    })

    expect(mockedRecRefSearch).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({
        docType: "REF",
      })
    )
    expect(mockedRefundFetch).not.toHaveBeenCalled()
  })
})

describe("PosReceiptPanel cart retention", () => {
  it("keeps cart lines visible while lookup overlay is open", () => {
    const html = renderToStaticMarkup(
      <PosReceiptPanel
        session={session}
        receiptNo="REC-SH001-202606-0001"
        lines={[cartLine]}
        onIncrementQty={noop}
        onDecrementQty={noop}
        onRemoveLine={noop}
        onClearCart={noop}
        overlay={renderLookupPanel()}
      />
    )

    expect(html).toContain('data-testid="pos-cart-row"')
    expect(html).toContain('data-testid="pos-receipt-lookup-panel"')
  })
})
