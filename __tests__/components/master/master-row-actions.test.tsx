/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MasterRowActions } from "@/components/master/shared/MasterRowActions"

describe("MasterRowActions", () => {
  it("renders disabled edit and delete buttons with titles", () => {
    const html = renderToStaticMarkup(
      <MasterRowActions editTitle="Edit planned" deleteTitle="Delete planned" />
    )
    expect(html).toContain('disabled=""')
    expect(html).toContain("Edit planned")
    expect(html).toContain("Delete planned")
    expect(html).toContain("✎")
    expect(html).toContain("🗑")
    expect(html).not.toContain("opacity-50")
  })

  it("renders enabled buttons when handlers provided", () => {
    const html = renderToStaticMarkup(
      <MasterRowActions
        editTitle="Edit branch"
        deleteTitle="Delete branch"
        editDisabled={false}
        deleteDisabled={false}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(html).not.toContain('disabled=""')
    expect(html).toContain("Edit branch")
  })

  it("renders restore in trash mode", () => {
    const html = renderToStaticMarkup(
      <MasterRowActions
        trashMode
        editTitle="Edit"
        deleteTitle="Delete"
        restoreTitle="Restore branch"
        editDisabled={false}
        restoreDisabled={false}
        onEdit={() => {}}
        onRestore={() => {}}
      />
    )
    expect(html).toContain("Restore branch")
    expect(html).toContain("↩")
    expect(html).not.toContain("🗑")
  })

  it("enables product trash when handler provided and delete not disabled", () => {
    const html = renderToStaticMarkup(
      <MasterRowActions
        editTitle="Edit"
        deleteTitle="Trash product"
        editDisabled={false}
        deleteDisabled={false}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(html).toContain("Trash product")
    expect(html).not.toMatch(/title="Trash product"[^>]*disabled/)
  })
})
