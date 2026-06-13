/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { StaffFormModal } from "@/components/master/staff/StaffFormModal"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const branches = [
  {
    id: "b-ho",
    code: "HO999",
    name: "Head Office",
    type: "HO" as const,
    isActive: true,
    deleted: false,
  },
  {
    id: "b-sh",
    code: "SH999",
    name: "Buffer",
    type: "SH" as const,
    isActive: true,
    deleted: false,
  },
]

describe("StaffFormModal", () => {
  it("renders create form with password field", () => {
    const html = renderToStaticMarkup(
      <StaffFormModal
        open
        mode="create"
        branches={branches}
        defaultBranchId="b-sh"
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).toContain("Add staff")
    expect(html).toContain("Password")
    expect(html).toContain("1234")
    expect(html).toContain("Replacer / พนักงานแทน")
    expect(html).not.toContain("Collector (POS cash collection report)")
  })

  it("shows Collector checkbox for HO roles", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <StaffFormModal
          open
          mode="edit"
          branches={branches}
          staff={{
            id: "s1",
            staffId: "001",
            name: "Admin",
            role: "HO_ADMIN",
            deleted: false,
            branchId: "b-ho",
            branchCode: "HO999",
            branchName: "Head Office",
            posCanCollect: true,
            allowAnyBranchLogin: false,
          }}
          onClose={() => {}}
          onSubmit={async () => {}}
        />
      )
    })

    expect(container.textContent).toContain("Collector (POS cash collection report)")
    expect(container.textContent).not.toContain("Replacer / พนักงานแทน")

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("hides Collector checkbox for SH_STAFF edit", () => {
    const html = renderToStaticMarkup(
      <StaffFormModal
        open
        mode="edit"
        branches={branches}
        staff={{
          id: "s1",
          staffId: "002",
          name: "User",
          role: "SH_STAFF",
          deleted: false,
          branchId: "b-sh",
          branchCode: "SH999",
          branchName: "Buffer",
          posCanCollect: true,
          allowAnyBranchLogin: true,
        }}
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).not.toContain("Collector (POS cash collection report)")
    expect(html).toContain("Replacer / พนักงานแทน")
  })

  it("renders edit with read-only staff ID", () => {
    const html = renderToStaticMarkup(
      <StaffFormModal
        open
        mode="edit"
        branches={branches}
        staff={{
          id: "s1",
          staffId: "002",
          name: "User",
          role: "SH_STAFF",
          deleted: false,
          branchId: "b-sh",
          branchCode: "SH999",
          branchName: "Buffer",
          posCanCollect: false,
          allowAnyBranchLogin: true,
        }}
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).toContain("Edit staff")
    expect(html).toContain("Staff ID cannot be changed")
    expect(html).not.toContain('type="password"')
    expect(html).toContain("Replacer / พนักงานแทน")
  })

})
