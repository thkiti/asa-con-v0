/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { BranchFormModal } from "@/components/master/branch/BranchFormModal"
describe("BranchFormModal", () => {
  it("renders create fields when open", () => {
    const html = renderToStaticMarkup(
      <BranchFormModal
        open
        mode="create"
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).toContain("Add branch")
    expect(html).toContain("HO — Head Office")
    expect(html).toContain("SH — Shop")
    expect(html).not.toContain("cannot be changed")
  })

  it("renders edit with read-only code and type hints", () => {
    const html = renderToStaticMarkup(
      <BranchFormModal
        open
        mode="edit"
        branch={{
          id: "b1",
          code: "HO999",
          name: "Head Office",
          type: "HO",
          isActive: true,
          deleted: false,
        }}
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).toContain("Edit branch")
    expect(html).toContain("Code cannot be changed")
    expect(html).toContain("Type cannot be changed")
    expect(html).toContain("readOnly")
    expect(html).toContain('disabled=""')
  })

  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <BranchFormModal
        open={false}
        mode="create"
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).toBe("")
  })
})
