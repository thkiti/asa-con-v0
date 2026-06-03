import { masterTableHead, masterTableWrap } from "@/lib/master-ui/table-classes"

describe("master table sticky classes", () => {
  it("defines scroll wrap and sticky header for all Master tables", () => {
    expect(masterTableWrap).toContain("overflow-auto")
    expect(masterTableWrap).toContain("max-h-[calc(100vh-20rem)]")
    expect(masterTableHead).toContain("sticky")
    expect(masterTableHead).toContain("top-0")
    expect(masterTableHead).toContain("bg-card")
    expect(masterTableHead).toContain("text-foreground")
  })
})
