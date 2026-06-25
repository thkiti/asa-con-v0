/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { PosReceiptPanel } from "@/components/pos/PosReceiptPanel"
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

const noop = () => {}

describe("PosReceiptPanel receipt lookup mode", () => {
  it("shows embedded lookup panel instead of cart when receiptLookupOpen", () => {
    const html = renderToStaticMarkup(
      <PosReceiptPanel
        session={session}
        receiptNo="REC-SH001-202606-0001"
        lines={[
          {
            productId: "p1",
            code: "0101001",
            name: "Widget",
            qty: 1,
            unitPrice: "10.00",
            priceSource: "SELLING",
            catalogImageUrl: null,
          },
        ]}
        onIncrementQty={noop}
        onDecrementQty={noop}
        onRemoveLine={noop}
        onClearCart={noop}
        receiptLookupOpen
        onReceiptLookupClose={noop}
        receiptLookupRunningNo="0113"
        onReceiptLookupRunningNoChange={noop}
        receiptLookupFocusRequestId={1}
      />
    )

    expect(html).toContain('data-testid="pos-receipt-lookup-panel"')
    expect(html).toContain('data-testid="pos-receipt-lookup-back"')
    expect(html).toContain('data-testid="receipt-lookup-year"')
    expect(html).toContain('data-testid="receipt-lookup-search"')
    expect(html).not.toContain("Scan a product to add to cart")
    expect(html).not.toContain("pos-cart-row")
  })
})
