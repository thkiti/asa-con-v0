/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import {
  BankCashCheckStatusDot,
  bankCashCheckStatusTooltip,
} from "@/components/finance/bank-cash/BankCashCheckStatusDot"

describe("BankCashCheckStatusDot", () => {
  it("shows green dot and tooltip for READY status", () => {
    const html = renderToStaticMarkup(<BankCashCheckStatusDot status="READY" />)

    expect(bankCashCheckStatusTooltip("READY")).toBe("Bank statement check completed.")
    expect(html).toContain('data-testid="bank-cash-check-status-ready"')
    expect(html).toContain("Bank statement check completed.")
    expect(html).toContain("tone-success")
  })

  it("shows yellow dot for DRAFT status", () => {
    const html = renderToStaticMarkup(<BankCashCheckStatusDot status="DRAFT" />)

    expect(html).toContain('data-testid="bank-cash-check-status-draft"')
    expect(html).toContain("Draft — check in progress")
  })

  it("shows red dot for NEW status", () => {
    const html = renderToStaticMarkup(<BankCashCheckStatusDot status="NEW" />)

    expect(html).toContain('data-testid="bank-cash-check-status-new"')
    expect(html).toContain("New — not yet reviewed")
    expect(html).toContain("tone-error")
  })
})
