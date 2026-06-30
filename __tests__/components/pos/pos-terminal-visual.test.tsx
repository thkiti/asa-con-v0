/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { PosBarcodeCapture } from "@/components/pos/PosBarcodeCapture"
import { PosKeypadMessageBlock } from "@/components/pos/PosKeypadMessageBlock"
import { PosReceiptPanel } from "@/components/pos/PosReceiptPanel"
import { PosSessionBanner } from "@/components/pos/PosSessionBanner"
import { PosTerminalLiveClock } from "@/components/pos/PosTerminalLiveClock"
import {
  posTerminalBanner,
  posTerminalBannerText,
  posTerminalBarcodeInput,
  posTerminalCartBody,
  posTerminalCartBrand,
  posTerminalClock,
  posTerminalClockStrip,
  posTerminalTitle,
  posTerminalTitleStrip,
} from "@/lib/pos-ui/pos-terminal-classes"
import type { PosTerminalSession } from "@/lib/pos-ui/types"

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

describe("POS terminal visual classes", () => {
  it("session banner uses readable banner text classes", () => {
    const html = renderToStaticMarkup(<PosSessionBanner session={session} />)
    expect(html).toContain(posTerminalBanner)
    expect(html).toContain(posTerminalBannerText)
    expect(html).not.toContain("text-zinc-900")
  })

  it("barcode input uses high-contrast terminal classes", () => {
    const html = renderToStaticMarkup(
      <PosBarcodeCapture value="" onChange={() => {}} />
    )
    expect(html).toContain(posTerminalBarcodeInput)
    expect(html).not.toContain("text-zinc-900")
  })

  it("clock strip and clock use readable terminal classes", () => {
    const stripHtml = renderToStaticMarkup(
      <PosKeypadMessageBlock
        pendingEvidenceCount={0}
        onOpenPendingEvidence={() => {}}
      />
    )
    expect(stripHtml).toContain(posTerminalClockStrip)

    const clockHtml = renderToStaticMarkup(<PosTerminalLiveClock />)
    expect(clockHtml).toContain(posTerminalClock)
    expect(clockHtml).not.toContain("text-zinc-800")
  })

  it("receipt panel uses orange cart body with readable text classes", () => {
    const html = renderToStaticMarkup(
      <PosReceiptPanel
        session={session}
        receiptNo="REC-SH001-202606-0001"
        lines={[]}
        onIncrementQty={() => {}}
        onDecrementQty={() => {}}
        onRemoveLine={() => {}}
        onClearCart={() => {}}
      />
    )
    expect(html).toContain(posTerminalCartBody)
    expect(html).toContain(posTerminalCartBrand)
    expect(html).toContain("pos-terminal-cart-total-footer")
    expect(html).toContain("TOTAL")
  })
})

describe("POS terminal title strip classes", () => {
  it("exports title strip and title classes for shell markup", () => {
    expect(posTerminalTitleStrip).toBe("pos-terminal-title-strip")
    expect(posTerminalTitle).toBe("pos-terminal-title")
  })
})
