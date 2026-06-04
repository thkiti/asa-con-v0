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
}

const noop = () => {}

describe("PosReceiptPanel", () => {
  it("shows preview receipt number and combined Staff line", () => {
    const html = renderToStaticMarkup(
      <PosReceiptPanel
        session={session}
        receiptNo="REC-SH001-202606-0001"
        lines={[]}
        onIncrementQty={noop}
        onDecrementQty={noop}
        onRemoveLine={noop}
        onClearCart={noop}
      />
    )
    expect(html).toContain("Receipt:")
    expect(html).toContain("REC-SH001-202606-0001")
    expect(html).toContain("Staff:")
    expect(html).toContain("103 • Somsak Kamnuch")
    expect(html).not.toContain("Staff ID")
    expect(html).not.toContain("Staff name")
  })

  it("shows allocated receipt number when provided", () => {
    const html = renderToStaticMarkup(
      <PosReceiptPanel
        session={session}
        receiptNo="REC-SH001-202606-0002"
        lines={[]}
        onIncrementQty={noop}
        onDecrementQty={noop}
        onRemoveLine={noop}
        onClearCart={noop}
      />
    )
    expect(html).toContain("REC-SH001-202606-0002")
  })
})
