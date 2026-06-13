/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { StaffEvidenceBadgeCell } from "@/components/master/staff/StaffEvidenceBadgeCell"
import { fetchMasterStaffEvidence } from "@/lib/master-ui/fetchers"

jest.mock("@/lib/master-ui/fetchers", () => ({
  fetchMasterStaffEvidence: jest.fn(),
}))

const mockedFetch = fetchMasterStaffEvidence as jest.MockedFunction<
  typeof fetchMasterStaffEvidence
>

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

  it("opens preview modal on dot click and fetches evidence on demand", async () => {
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: false,
      evidenceComplete: false,
      photoUrl: "https://blob/103-ph.jpg",
      idCardUrl: null,
    })

    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    await act(async () => {
      root.render(
        <StaffEvidenceBadgeCell
          staffRowId="row-1"
          staffCode="103"
          photoUploaded={true}
          idUploaded={false}
        />
      )
      await Promise.resolve()
    })

    expect(mockedFetch).not.toHaveBeenCalled()

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-dot-ph"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(mockedFetch).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-testid="staff-evidence-view-modal-ph"]')).toBeTruthy()

    const img = document.querySelector(
      '[data-testid="staff-evidence-view-image-ph"]'
    ) as HTMLImageElement
    expect(img?.src).toContain("103-ph.jpg")

    act(() => {
      img?.dispatchEvent(new Event("load"))
    })

    expect(document.body.textContent).not.toContain("Loading…")

    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
