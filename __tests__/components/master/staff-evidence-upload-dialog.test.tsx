/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { StaffEvidenceUploadDialog } from "@/components/master/staff/StaffEvidenceUploadDialog"
import {
  fetchMasterStaffEvidenceMobileLink,
  fetchMasterStaffEvidenceMobileStatus,
} from "@/lib/master-ui/staff-evidence-mobile-client"
import { processStaffEvidenceFileForKind } from "@/lib/pos-ui/staff-evidence-image"

jest.mock("@/lib/master-ui/staff-evidence-mobile-client", () => ({
  fetchMasterStaffEvidenceMobileLink: jest.fn(),
  fetchMasterStaffEvidenceMobileStatus: jest.fn(),
}))

jest.mock("@/lib/pos-ui/staff-evidence-image", () => ({
  processStaffEvidenceFileForKind: jest.fn(async (blob: Blob) => blob),
  rotateStaffEvidenceImageForUpload: jest.fn(async (blob: Blob) => blob),
  STAFF_EVIDENCE_UPLOAD_DIALOG_PHOTO_PREVIEW_CLASS: "photo-preview",
  STAFF_EVIDENCE_UPLOAD_DIALOG_ID_PREVIEW_CLASS: "id-preview",
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockedProcess = processStaffEvidenceFileForKind as jest.MockedFunction<
  typeof processStaffEvidenceFileForKind
>
const mockedMobileLink = fetchMasterStaffEvidenceMobileLink as jest.MockedFunction<
  typeof fetchMasterStaffEvidenceMobileLink
>
const mockedMobileStatus = fetchMasterStaffEvidenceMobileStatus as jest.MockedFunction<
  typeof fetchMasterStaffEvidenceMobileStatus
>

function pickLocalFile(container: HTMLElement, index: number, file: File) {
  const input = container.querySelectorAll('input[type="file"]')[index] as HTMLInputElement
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

describe("StaffEvidenceUploadDialog", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    global.URL.createObjectURL = jest.fn(() => "blob:preview")
    global.URL.revokeObjectURL = jest.fn()
    mockedProcess.mockImplementation(async (blob: Blob) => blob)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it("supports local PC upload for both images and confirm", async () => {
    const onConfirm = jest.fn()

    await act(async () => {
      root.render(
        <StaffEvidenceUploadDialog
          open
          staffRowId="row-1"
          onClose={() => {}}
          onConfirm={onConfirm}
        />
      )
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="staff-evidence-pick-photo-mobile"]')).toBeTruthy()

    await act(async () => {
      pickLocalFile(
        container,
        0,
        new File(["photo"], "photo.jpg", { type: "image/jpeg" })
      )
      pickLocalFile(container, 1, new File(["id"], "id.jpg", { type: "image/jpeg" }))
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="staff-evidence-photo-preview"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="staff-evidence-id-preview"]')).toBeTruthy()

    await act(async () => {
      container
        .querySelector('[data-testid="staff-evidence-upload-confirm"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(onConfirm).toHaveBeenCalledWith({
      photo: expect.any(Blob),
      idCard: expect.any(Blob),
    })
  })

  it("polls master mobile status and fills preview from mobile upload", async () => {
    jest.useFakeTimers()
    const onConfirm = jest.fn()

    mockedMobileLink
      .mockResolvedValueOnce({
        ok: true,
        uploadUrl: "http://localhost/staff-evidence/mobile/ph-token",
        token: "ph-token",
        expiresAt: "2099-01-01T00:00:00.000Z",
        kind: "ph",
        staffId: "103",
      })
      .mockResolvedValueOnce({
        ok: true,
        uploadUrl: "http://localhost/staff-evidence/mobile/id-token",
        token: "id-token",
        expiresAt: "2099-01-01T00:00:00.000Z",
        kind: "id",
        staffId: "103",
      })

    mockedMobileStatus
      .mockResolvedValueOnce({
        ok: true,
        ready: true,
        blobUrl: "https://blob.example/ph.jpg",
        kind: "ph",
        staffId: "103",
      })
      .mockResolvedValueOnce({
        ok: true,
        ready: true,
        blobUrl: "https://blob.example/id.jpg",
        kind: "id",
        staffId: "103",
      })

    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => new Blob(["jpeg"], { type: "image/jpeg" }),
    })) as typeof fetch

    await act(async () => {
      root.render(
        <StaffEvidenceUploadDialog
          open
          staffRowId="row-1"
          onClose={() => {}}
          onConfirm={onConfirm}
        />
      )
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-pick-photo-mobile"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    await act(async () => {
      jest.advanceTimersByTime(2100)
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-pick-id-mobile"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    await act(async () => {
      jest.advanceTimersByTime(2100)
      await Promise.resolve()
    })

    expect(mockedMobileLink).toHaveBeenCalledWith("row-1", { kind: "ph" })
    expect(mockedMobileLink).toHaveBeenCalledWith("row-1", { kind: "id" })
    expect(container.querySelector('[data-testid="staff-evidence-photo-preview"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="staff-evidence-id-preview"]')).toBeTruthy()

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-upload-confirm"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    expect(onConfirm).toHaveBeenCalledWith({
      photo: expect.any(Blob),
      idCard: expect.any(Blob),
    })
  })
})
