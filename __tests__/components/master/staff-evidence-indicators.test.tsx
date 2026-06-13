/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { StaffEvidenceBadgeCell } from "@/components/master/staff/StaffEvidenceBadgeCell"

jest.mock("@/lib/master-ui/fetchers", () => ({
  fetchMasterStaffEvidence: jest.fn(),
}))

describe("StaffEvidenceBadgeCell", () => {
  it("renders two circular indicators without PH/ID text", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <StaffEvidenceBadgeCell
          staffRowId="row-1"
          staffCode="103"
          photoUploaded={true}
          idUploaded={false}
        />
      )
    })

    expect(container.querySelector('[data-testid="staff-evidence-indicators"]')).toBeTruthy()
    expect(container.textContent).not.toContain("PH")
    expect(container.textContent).not.toContain("ID")

    const photoDot = container.querySelector('[data-testid="staff-evidence-dot-ph"]')
    const idDot = container.querySelector('[data-testid="staff-evidence-dot-id"]')
    expect(photoDot?.getAttribute("data-evidence-present")).toBe("true")
    expect(idDot?.getAttribute("data-evidence-present")).toBe("false")
    expect(photoDot?.className).toContain("bg-emerald-500")
    expect(photoDot?.className).toContain("rounded-full")
    expect(idDot?.className).toContain("bg-zinc-300")
    expect(photoDot?.getAttribute("title")).toBe("Photo")
    expect(idDot?.getAttribute("title")).toBe("ID Card")

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("uses blue for present ID card indicator", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <StaffEvidenceBadgeCell
          staffRowId="row-1"
          staffCode="103"
          photoUploaded={false}
          idUploaded={true}
        />
      )
    })

    const idDot = container.querySelector('[data-testid="staff-evidence-dot-id"]')
    expect(idDot?.className).toContain("bg-blue-500")

    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
