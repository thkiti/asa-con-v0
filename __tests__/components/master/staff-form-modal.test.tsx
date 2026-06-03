/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { StaffFormModal } from "@/components/master/staff/StaffFormModal"

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
        }}
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).toContain("Edit staff")
    expect(html).toContain("Staff ID cannot be changed")
    expect(html).not.toContain('type="password"')
  })
})
