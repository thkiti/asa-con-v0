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

  it("uses no-reference delete title when configured", () => {
    const html = renderToStaticMarkup(
      <MasterRowActions
        editTitle="Add/Edit link planned"
        deleteTitle="No reference to delete"
        deleteAriaLabel="No reference to delete"
      />
    )
    expect(html).toContain("No reference to delete")
    expect(html).toContain("Add/Edit link planned")
  })
})
