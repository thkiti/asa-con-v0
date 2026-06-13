/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { StaffPage } from "@/components/master/staff/StaffPage"
import {
  fetchMasterBranches,
  fetchMasterStaff,
  patchMasterStaff,
} from "@/lib/master-ui/fetchers"

jest.mock("@/lib/master-ui/fetchers", () => ({
  fetchMasterBranches: jest.fn(),
  fetchMasterStaff: jest.fn(),
  createMasterStaff: jest.fn(),
  patchMasterStaff: jest.fn(),
}))

jest.mock("@/components/master/staff/StaffEvidenceBadgeCell", () => ({
  StaffEvidenceBadgeCell: () => <span data-testid="staff-evidence-badge" />,
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockedBranches = fetchMasterBranches as jest.MockedFunction<typeof fetchMasterBranches>
const mockedStaff = fetchMasterStaff as jest.MockedFunction<typeof fetchMasterStaff>
const mockedPatch = patchMasterStaff as jest.MockedFunction<typeof patchMasterStaff>

const staffRow = {
  id: "row-1",
  staffId: "103",
  name: "Staff A",
  role: "SH_STAFF" as const,
  deleted: false,
  branchId: "b-sh",
  branchCode: "SH999",
  branchName: "Buffer",
  posCanCollect: false,
  allowAnyBranchLogin: false,
  evidencePhotoUploaded: false,
  evidenceIdUploaded: false,
}

describe("StaffPage edit save", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    jest.useFakeTimers()

    mockedBranches.mockResolvedValue({
      items: [
        {
          id: "b-sh",
          code: "SH999",
          name: "Buffer",
          type: "SH",
          isActive: true,
          deleted: false,
        },
      ],
    })
    mockedStaff.mockResolvedValue({ items: [staffRow] })
    mockedPatch.mockResolvedValue({ item: { ...staffRow, name: "Staff B" } })
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it("closes edit modal and refreshes list after successful save", async () => {
    await act(async () => {
      root.render(<StaffPage documentEntityCode="ASA" />)
      await Promise.resolve()
    })

    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[aria-label="Edit staff 103"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(document.body.textContent).toContain("Edit staff")

    await act(async () => {
      const saveButton = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "Save"
      )
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockedPatch).toHaveBeenCalledWith(
      "row-1",
      expect.objectContaining({ name: "Staff A", role: "SH_STAFF" })
    )
    expect(document.body.textContent).not.toContain("Edit staff")
    expect(mockedStaff.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
