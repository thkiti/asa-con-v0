import {
  masterTableHeadSticky,
  masterTableWrapSticky,
} from "@/lib/master-ui/table-classes"

describe("master table sticky classes", () => {
  it("defines sticky scroll wrap and header for Product-Reference", () => {
    expect(masterTableWrapSticky).toContain("overflow-auto")
    expect(masterTableWrapSticky).toContain("max-h-[calc(100vh-20rem)]")
    expect(masterTableHeadSticky).toContain("sticky")
    expect(masterTableHeadSticky).toContain("top-0")
    expect(masterTableHeadSticky).toContain("bg-card")
  })
})
