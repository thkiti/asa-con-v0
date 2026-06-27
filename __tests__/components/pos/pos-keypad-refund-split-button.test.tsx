/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { PosKeypadRefundSplitButton } from "@/components/pos/PosKeypadRefundSplitButton"

describe("PosKeypadRefundSplitButton", () => {
  it("uses rose for REFUND and blue for LOOKUP", () => {
    const html = renderToStaticMarkup(
      <PosKeypadRefundSplitButton
        col={1}
        row={1}
        onRefund={() => {}}
        onReceiptLookup={() => {}}
      />
    )

    expect(html).toContain('data-testid="pos-keypad-refund"')
    expect(html).toContain('data-testid="pos-keypad-receipt-lookup"')
    expect(html).toContain("bg-rose-700")
    expect(html).toContain("bg-blue-600")
  })
})
