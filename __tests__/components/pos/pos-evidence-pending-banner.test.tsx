/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { PosKeypadMessageBlock } from "@/components/pos/PosKeypadMessageBlock"

describe("PosKeypadMessageBlock", () => {
  it("always renders the reserved fixed-height message slot", () => {
    const html = renderToStaticMarkup(
      <PosKeypadMessageBlock pendingEvidenceCount={0} onOpenPendingEvidence={() => {}} />
    )
    expect(html).toContain('data-testid="pos-keypad-message-block"')
    expect(html).toContain('data-testid="pos-terminal-live-clock"')
  })

  it("renders blinking slip pending warning inside the reserved slot", () => {
    const html = renderToStaticMarkup(
      <PosKeypadMessageBlock pendingEvidenceCount={2} onOpenPendingEvidence={() => {}} />
    )
    expect(html).toContain('data-testid="pos-keypad-message-block"')
    expect(html).toContain('data-testid="pos-evidence-pending-banner"')
    expect(html).toContain("pos-evidence-pending-blink")
    expect(html).toContain("text-2xl")
    expect(html).toContain("font-black")
    expect(html).toContain("SLIP PENDING")
    expect(html).toContain("2 bank transfer receipts")
  })

  it("shows cart lookup errors when no slip pending warnings", () => {
    const html = renderToStaticMarkup(
      <PosKeypadMessageBlock
        pendingEvidenceCount={0}
        onOpenPendingEvidence={() => {}}
        cartLookupError="Cart is empty"
      />
    )
    expect(html).toContain('data-testid="pos-keypad-cart-error"')
    expect(html).toContain("Cart is empty")
  })
})
