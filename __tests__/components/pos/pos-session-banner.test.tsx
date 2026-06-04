/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { PosSessionBanner } from "@/components/pos/PosSessionBanner"
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

describe("PosSessionBanner", () => {
  it("shows compact branch and staff rows", () => {
    const html = renderToStaticMarkup(<PosSessionBanner session={session} />)
    expect(html).toContain("Branch:")
    expect(html).toContain("SH001 • Chidlom")
    expect(html).toContain("Staff:")
    expect(html).toContain("103 • Somsak Kamnuch")
    expect(html).not.toContain("Branch code")
    expect(html).not.toContain("Staff ID")
  })
})
