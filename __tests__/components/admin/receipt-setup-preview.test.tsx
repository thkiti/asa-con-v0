/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReceiptSetupPreview } from "@/components/admin/ReceiptSetupPreview"
import { buildReceiptSetupTicketLayout } from "@/lib/admin/receipt-setup-preview"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { RECEIPT_SLIP_PROPORTIONAL_CLASS } from "@/lib/thermal/receipt-slip-fonts"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

function renderPreview(layout: ReturnType<typeof buildReceiptSetupTicketLayout>) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(<ReceiptSetupPreview layout={layout} />)
  })
  return { container, root }
}

function buildLayout(
  branch: {
    id: string
    code: string
    name: string
    phone: string | null
    taxId: string | null
    type: "SH"
  },
  layout = DEFAULT_THERMAL_LAYOUTS.RECEIPT
) {
  return buildReceiptSetupTicketLayout({
    branch,
    companyTaxId: "0123456789012",
    layout,
  })
}

describe("ReceiptSetupPreview", () => {
  const branch = {
    id: "b-sh001",
    code: "SH001",
    name: "Chidlom",
    phone: "02-111-2222",
    taxId: "MACHINE-001",
    type: "SH" as const,
  }

  it("updates branch identity when shop data changes", () => {
    const first = renderPreview(
      buildLayout({
        id: "b-sh999",
        code: "SH999",
        name: "Services Center",
        phone: "02-999-0000",
        taxId: "MACHINE-999",
        type: "SH",
      })
    )
    expect(first.container.textContent).toContain("SH999 • Services Center")
    expect(first.container.textContent).toContain("Tel. 02-999-0000")
    expect(first.container.textContent).toContain("M/C No. MACHINE-999")
    act(() => first.root.unmount())

    const second = renderPreview(buildLayout(branch))
    expect(second.container.textContent).toContain("SH001 • Chidlom")
    expect(second.container.textContent).toContain("Tel. 02-111-2222")
    act(() => second.root.unmount())
  })

  it("renders Thai proportional header, identity, tax title, and footer", () => {
    const layout = {
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      headerBlockText: "บริษัท เอเอสเอ เซอร์วิสเซส จำกัด",
      headerFontSize: 14,
      footerBlockText: "ขอบคุณที่ใช้บริการ",
      footerFontSize: 11,
      subHeaderBlockText: "ใบกำกับภาษีอย่างย่อ",
      showAbbreviatedTaxTitle: false,
    }
    const ticketLayout = buildReceiptSetupTicketLayout({
      branch: {
        id: "b-sh006",
        code: "SH006",
        name: "Rama III",
        phone: "02-333-4444",
        taxId: "MACHINE-006",
        type: "SH",
      },
      companyTaxId: "0123456789012",
      layout,
    })

    const { container, root } = renderPreview(ticketLayout)
    expect(container.textContent).toContain("บริษัท เอเอสเอ เซอร์วิสเซส จำกัด")
    expect(container.textContent).toContain("SH006 • Rama III")
    expect(container.textContent).toContain("ใบกำกับภาษีอย่างย่อ")
    expect(container.textContent).toContain("ขอบคุณที่ใช้บริการ")

    const header = container.querySelector("[data-testid='thermal-ticket-header']") as HTMLElement
    expect(header.classList.contains(RECEIPT_SLIP_PROPORTIONAL_CLASS)).toBe(true)
    expect(header.querySelector(".receipt-slip-block-text")?.classList.contains("text-center")).toBe(
      true
    )
    expect(header.style.fontSize).toBe("14px")

    const identity = container.querySelector("[data-testid='receipt-slip-identity']") as HTMLElement
    expect(identity?.classList.contains(RECEIPT_SLIP_PROPORTIONAL_CLASS)).toBe(true)
    expect(identity.style.fontSize).toBe("14px")

    const refStaff = container.querySelector("[data-testid='receipt-slip-ref-staff']") as HTMLElement
    expect(refStaff?.classList.contains(RECEIPT_SLIP_PROPORTIONAL_CLASS)).toBe(true)
    expect(refStaff.style.fontSize).toBe("14px")
    const refRow = refStaff.querySelector(".receipt-slip-ref-staff-row") as HTMLElement
    expect(refRow?.querySelector(".text-left")?.textContent).toContain("Ref.")
    expect(refRow?.querySelector(".text-right")?.textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/)

    const footer = container.querySelector("[data-testid='thermal-ticket-footer']") as HTMLElement
    expect(footer?.style.fontSize).toBe("11px")

    const monoBody = container.querySelector("[data-testid='thermal-ticket-body']")
    expect(monoBody).toBeTruthy()

    act(() => root.unmount())
  })

  it("renders header/footer line breaks and numeric font sizes", () => {
    const layout = {
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      headerBlockText: "Line A\nLine B",
      headerFontSize: 15,
      footerBlockText: "Footer one\nFooter two",
      footerFontSize: 9,
    }
    const ticketLayout = buildLayout(branch, layout)

    const { container, root } = renderPreview(ticketLayout)
    const header = container.querySelector("[data-testid='thermal-ticket-header']") as HTMLElement
    expect(header.textContent).toContain("Line A")
    expect(header.textContent).toContain("Line B")
    expect(header.style.fontSize).toBe("15px")

    const footer = container.querySelector("[data-testid='thermal-ticket-footer']") as HTMLElement
    expect(footer.textContent).toContain("Footer one")
    expect(footer.style.fontSize).toBe("9px")
    act(() => root.unmount())
  })

  it("skips empty header and footer blocks", () => {
    const ticketLayout = buildLayout(branch, {
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      headerBlockText: null,
      footerBlockText: null,
    })

    const { container, root } = renderPreview(ticketLayout)
    expect(container.querySelector("[data-testid='thermal-ticket-header']")).toBeNull()
    expect(container.querySelector("[data-testid='thermal-ticket-footer']")).toBeNull()
    expect(container.textContent).toContain("SH001 • Chidlom")
    act(() => root.unmount())
  })

  it("centers header/footer/identity/tax title in full-width blocks", () => {
    const cases = [
      { label: "short Thai", text: "อาสา เซอร์วิส", fontSize: 13 },
      {
        label: "long Thai",
        text: "บริษัท เอเอสเอ เซอร์วิสเซส จำกัด (มหาชน) สาขาใหญ่",
        fontSize: 13,
      },
      { label: "English", text: "ASA SERVICES", fontSize: 14 },
      { label: "multi-line", text: "Line A\nLine B\nLine C", fontSize: 12 },
    ] as const

    for (const { text, fontSize } of cases) {
      const ticketLayout = buildLayout(branch, {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerBlockText: text,
        headerFontSize: fontSize,
        footerBlockText: text,
        footerFontSize: fontSize,
        subHeaderBlockText: "ใบกำกับภาษีอย่างย่อ",
        showAbbreviatedTaxTitle: false,
      })

      const { container, root } = renderPreview(ticketLayout)

      const header = container.querySelector("[data-testid='thermal-ticket-header']") as HTMLElement
      expect(header.style.width).toBe("100%")
      expect(header.classList.contains("receipt-slip-block-centered")).toBe(true)
      const headerText = header.querySelector(".receipt-slip-block-text") as HTMLElement
      expect(headerText.classList.contains("w-full")).toBe(true)
      expect(headerText.classList.contains("text-center")).toBe(true)

      const footer = container.querySelector("[data-testid='thermal-ticket-footer']") as HTMLElement
      expect(footer.style.width).toBe("100%")
      expect(footer.classList.contains("receipt-slip-block-centered")).toBe(true)

      const identity = container.querySelector(
        "[data-testid='receipt-slip-identity']"
      ) as HTMLElement
      expect(identity.style.width).toBe("100%")
      expect(identity.classList.contains("receipt-slip-block-centered")).toBe(true)
      expect(identity.querySelector(".receipt-slip-block-text")?.classList.contains("text-center")).toBe(
        true
      )

      const taxTitle = container.querySelector("[data-testid='thermal-ticket-subheader']") as HTMLElement
      expect(taxTitle.style.width).toBe("100%")
      expect(taxTitle.classList.contains("receipt-slip-block-centered")).toBe(true)

      act(() => root.unmount())
    }
  })

  it("keeps full-width centering when header font size changes", () => {
    for (const fontSize of [9, 13, 18]) {
      const ticketLayout = buildLayout(branch, {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerBlockText: "อาสา เซอร์วิส",
        headerFontSize: fontSize,
      })

      const { container, root } = renderPreview(ticketLayout)
      const header = container.querySelector("[data-testid='thermal-ticket-header']") as HTMLElement
      expect(header.style.width).toBe("100%")
      expect(header.style.fontSize).toBe(`${fontSize}px`)
      act(() => root.unmount())
    }
  })

  it("constrains mono item zone inside receipt paper width", () => {
    const { container, root } = renderPreview(buildLayout(branch))

    const monoBody = container.querySelector("[data-testid='thermal-ticket-body']") as HTMLElement
    expect(monoBody).toBeTruthy()

    const dividers = monoBody.querySelectorAll(".receipt-setup-mono-divider")
    expect(dividers.length).toBe(3)
    dividers.forEach((divider) => {
      expect(divider.textContent).toBe("")
      expect(divider.classList.contains("receipt-setup-mono-divider")).toBe(true)
    })

    const monoLines = monoBody.querySelectorAll(".receipt-slip-mono-line")
    expect(monoLines.length).toBeGreaterThan(0)
    monoLines.forEach((line) => {
      expect(line.classList.contains("receipt-slip-mono-line")).toBe(true)
    })

    const amountRow = monoBody.querySelector(".receipt-setup-mono-amount-row")
    expect(amountRow?.querySelector(".truncate")).toBeTruthy()
    expect(amountRow?.querySelector(".tabular-nums")?.textContent).toBe("60.00")

    act(() => root.unmount())
  })
})
