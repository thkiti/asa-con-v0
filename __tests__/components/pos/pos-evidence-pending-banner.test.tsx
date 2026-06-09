/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { PosEvidencePendingBanner } from "@/components/pos/PosEvidencePendingBanner"

describe("PosEvidencePendingBanner", () => {
  it("renders nothing when count is zero", () => {
    const html = renderToStaticMarkup(
      <PosEvidencePendingBanner count={0} onOpen={() => {}} />
    )
    expect(html).toBe("")
  })

  it("renders blinking banner when pending slips exist", () => {
    const html = renderToStaticMarkup(
      <PosEvidencePendingBanner count={2} onOpen={() => {}} />
    )
    expect(html).toContain('data-testid="pos-evidence-pending-banner"')
    expect(html).toContain("pos-evidence-pending-blink")
    expect(html).toContain("SLIP PENDING")
    expect(html).toContain("2 bank transfer receipts")
  })
})
