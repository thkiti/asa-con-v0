/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { StaffEvidenceSection } from "@/components/master/staff/StaffEvidenceSection"
import {
  deleteMasterStaffEvidence,
  fetchMasterStaffEvidence,
  uploadMasterStaffEvidence,
} from "@/lib/master-ui/fetchers"

jest.mock("@/lib/master-ui/fetchers", () => ({
  fetchMasterStaffEvidence: jest.fn(),
  deleteMasterStaffEvidence: jest.fn(),
  uploadMasterStaffEvidence: jest.fn(),
}))

jest.mock("@/lib/pos-ui/staff-evidence-image", () => ({
  processStaffEvidenceFileForKind: jest.fn(async (blob: Blob) => blob),
  processStaffEvidenceImageForUpload: jest.fn(async (blob: Blob) => blob),
  resizeStaffPhotoForUpload: jest.fn(async (blob: Blob) => blob),
  rotateStaffEvidenceImageForUpload: jest.fn(async (blob: Blob) => blob),
  STAFF_PHOTO_PREVIEW_IMAGE_CLASS: "staff-photo-preview",
  STAFF_ID_CARD_PREVIEW_IMAGE_CLASS: "staff-id-preview",
  STAFF_EVIDENCE_UPLOAD_DIALOG_PHOTO_PREVIEW_CLASS: "photo-preview",
  STAFF_EVIDENCE_UPLOAD_DIALOG_ID_PREVIEW_CLASS: "id-preview",
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockedFetch = fetchMasterStaffEvidence as jest.MockedFunction<
  typeof fetchMasterStaffEvidence
>
const mockedDelete = deleteMasterStaffEvidence as jest.MockedFunction<
  typeof deleteMasterStaffEvidence
>
const mockedUpload = uploadMasterStaffEvidence as jest.MockedFunction<
  typeof uploadMasterStaffEvidence
>

function pickLocalFile(container: HTMLElement, index: number, file: File) {
  const input = container.querySelectorAll('input[type="file"]')[index] as HTMLInputElement
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

function fireImageLoad(img: HTMLImageElement | null) {
  act(() => {
    img?.dispatchEvent(new Event("load"))
  })
}

describe("StaffEvidenceSection", () => {
  let container: HTMLDivElement
  let root: Root
  const originalFetch = global.fetch

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    global.URL.createObjectURL = jest.fn(() => "blob:preview")
    global.URL.revokeObjectURL = jest.fn()
    mockedDelete.mockResolvedValue({
      ok: true,
      staffId: "103",
      photoUploaded: false,
      idCardUploaded: false,
      evidenceComplete: false,
      photoUrl: null,
      idCardUrl: null,
      photoUpdatedAt: null,
      idCardUpdatedAt: null,
    })
    mockedUpload.mockResolvedValue({
      ok: true,
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: true,
      evidenceComplete: true,
      photoUrl: "https://blob/103-ph.jpg",
      idCardUrl: "https://blob/103-id.jpg",
      photoUpdatedAt: "2026-06-13T12:00:00.000Z",
      idCardUpdatedAt: "2026-06-13T12:00:00.000Z",
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
    jest.clearAllMocks()
    global.fetch = originalFetch
  })

  it("shows Upload button when staff has no evidence", async () => {
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: false,
      idCardUploaded: false,
      evidenceComplete: false,
      photoUrl: null,
      idCardUrl: null,
    })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="staff-evidence-upload-button"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="staff-evidence-view-ph"]')).toBeNull()
    expect(container.querySelector('[data-testid="staff-evidence-delete-button"]')).toBeNull()
  })

  it("shows Photo, ID Card, Delete when evidence exists", async () => {
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: true,
      evidenceComplete: true,
      photoUrl: "https://blob/103-ph.jpg",
      idCardUrl: "https://blob/103-id.jpg",
      photoUpdatedAt: "2026-06-13T10:00:00.000Z",
      idCardUpdatedAt: "2026-06-13T10:00:00.000Z",
    })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="staff-evidence-upload-button"]')).toBeNull()
    expect(container.querySelector('[data-testid="staff-evidence-view-ph"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="staff-evidence-view-id"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="staff-evidence-delete-button"]')).toBeTruthy()
  })

  it("does not show Upload when partial evidence exists", async () => {
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: false,
      evidenceComplete: false,
      photoUrl: "https://blob/103-ph.jpg",
      idCardUrl: null,
    })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="staff-evidence-upload-button"]')).toBeNull()
    expect(container.querySelector('[data-testid="staff-evidence-view-ph"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="staff-evidence-delete-button"]')).toBeTruthy()
  })

  it("loads staff photo on demand and clears loading after image load", async () => {
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: true,
      evidenceComplete: true,
      photoUrl: "https://blob/103-ph.jpg",
      idCardUrl: "https://blob/103-id.jpg",
      photoUpdatedAt: "2026-06-13T10:00:00.000Z",
      idCardUpdatedAt: "2026-06-13T10:00:00.000Z",
    })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    expect(mockedFetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-view-ph"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(mockedFetch).toHaveBeenCalledTimes(2)
    expect(document.querySelector('[data-testid="staff-evidence-view-modal-ph"]')).toBeTruthy()
    expect(document.body.textContent).not.toContain("Staff photo")
    expect(document.body.textContent).not.toContain("Staff 103")

    const img = document.querySelector(
      '[data-testid="staff-evidence-view-image-ph"]'
    ) as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.src).toContain("103-ph.jpg")
    expect(img.src).toMatch(/[?&]v=/)
    expect(img.className).toContain("object-contain")

    fireImageLoad(img)

    expect(document.body.textContent).not.toContain("Loading…")
    expect(document.querySelector('[data-testid="staff-evidence-view-not-found"]')).toBeNull()
  })

  it("view modal is read-only with close control only", async () => {
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: true,
      evidenceComplete: true,
      photoUrl: "https://blob/103-ph.jpg",
      idCardUrl: "https://blob/103-id.jpg",
      photoUpdatedAt: "2026-06-13T10:00:00.000Z",
      idCardUpdatedAt: "2026-06-13T10:00:00.000Z",
    })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-view-id"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(document.querySelector('[data-testid="staff-evidence-view-close"]')).toBeTruthy()
    expect(document.querySelector('[data-testid="staff-evidence-view-rotate"]')).toBeNull()
    expect(document.querySelector('[data-testid="staff-evidence-view-image-id"]')).toBeTruthy()
  })

  it("loads ID card on demand with idCardUrl", async () => {
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: true,
      evidenceComplete: true,
      photoUrl: "https://blob/103-ph.jpg",
      idCardUrl: "https://blob/103-id.jpg",
      photoUpdatedAt: "2026-06-13T10:00:00.000Z",
      idCardUpdatedAt: "2026-06-13T10:00:00.000Z",
    })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-view-id"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    const img = document.querySelector(
      '[data-testid="staff-evidence-view-image-id"]'
    ) as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.src).toContain("103-id.jpg")
    expect(img.src).not.toContain("103-ph.jpg")

    fireImageLoad(img)

    expect(document.body.textContent).not.toContain("Loading…")
  })

  it("shows Image not found when evidence URL is missing", async () => {
    mockedFetch
      .mockResolvedValueOnce({
        staffId: "103",
        photoUploaded: true,
        idCardUploaded: true,
        evidenceComplete: true,
        photoUrl: "https://blob/103-ph.jpg",
        idCardUrl: "https://blob/103-id.jpg",
      })
      .mockResolvedValueOnce({
        staffId: "103",
        photoUploaded: true,
        idCardUploaded: true,
        evidenceComplete: true,
        photoUrl: "https://blob/103-ph.jpg",
        idCardUrl: null,
      })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-view-id"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(document.querySelector('[data-testid="staff-evidence-view-not-found"]')?.textContent).toBe(
      "Image not found"
    )
    expect(document.body.textContent).not.toContain("Loading…")
  })

  it("shows fetch error and never stays loading when API fails", async () => {
    mockedFetch
      .mockResolvedValueOnce({
        staffId: "103",
        photoUploaded: true,
        idCardUploaded: true,
        evidenceComplete: true,
        photoUrl: "https://blob/103-ph.jpg",
        idCardUrl: "https://blob/103-id.jpg",
      })
      .mockRejectedValueOnce(new Error("network down"))

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-view-id"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(document.querySelector('[data-testid="staff-evidence-view-fetch-error"]')?.textContent).toBe(
      "Failed to load image"
    )
    expect(document.body.textContent).not.toContain("Loading…")
  })

  it("close button dismisses the view modal", async () => {
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: true,
      evidenceComplete: true,
      photoUrl: "https://blob/103-ph.jpg",
      idCardUrl: "https://blob/103-id.jpg",
      photoUpdatedAt: "2026-06-13T10:00:00.000Z",
      idCardUpdatedAt: "2026-06-13T10:00:00.000Z",
    })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-view-ph"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    act(() => {
      document.querySelector('[data-testid="staff-evidence-view-close"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    expect(document.querySelector('[data-testid="staff-evidence-view-modal-ph"]')).toBeNull()
  })

  it("backdrop click dismisses the view modal", async () => {
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: true,
      evidenceComplete: true,
      photoUrl: "https://blob/103-ph.jpg",
      idCardUrl: "https://blob/103-id.jpg",
      photoUpdatedAt: "2026-06-13T10:00:00.000Z",
      idCardUpdatedAt: "2026-06-13T10:00:00.000Z",
    })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-view-ph"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    act(() => {
      document.querySelector('[data-testid="staff-evidence-view-modal-ph"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    expect(document.querySelector('[data-testid="staff-evidence-view-modal-ph"]')).toBeNull()
  })

  it("latest click wins when Photo and ID Card are opened quickly", async () => {
    mockedFetch
      .mockResolvedValueOnce({
        staffId: "103",
        photoUploaded: true,
        idCardUploaded: true,
        evidenceComplete: true,
        photoUrl: "https://blob/103-ph.jpg",
        idCardUrl: "https://blob/103-id.jpg",
      })
      .mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return {
          staffId: "103",
          photoUploaded: true,
          idCardUploaded: true,
          evidenceComplete: true,
          photoUrl: "https://blob/103-ph.jpg",
          idCardUrl: "https://blob/103-id.jpg",
        }
      })

    await act(async () => {
      root.render(
        <StaffEvidenceSection staffRowId="row-1" staffCode="103" onEvidenceChanged={() => {}} />
      )
      await Promise.resolve()
    })

    act(() => {
      container.querySelector('[data-testid="staff-evidence-view-ph"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      container.querySelector('[data-testid="staff-evidence-view-id"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(document.querySelector('[data-testid="staff-evidence-view-modal-id"]')).toBeTruthy()
    expect(document.querySelector('[data-testid="staff-evidence-view-modal-ph"]')).toBeNull()

    const img = document.querySelector(
      '[data-testid="staff-evidence-view-image-id"]'
    ) as HTMLImageElement
    expect(img?.src).toContain("103-id.jpg")
  })

  it("calls onUploadSuccess after confirm upload succeeds", async () => {
    const onUploadSuccess = jest.fn()
    mockedFetch.mockResolvedValue({
      staffId: "103",
      photoUploaded: false,
      idCardUploaded: false,
      evidenceComplete: false,
      photoUrl: null,
      idCardUrl: null,
    })

    await act(async () => {
      root.render(
        <StaffEvidenceSection
          staffRowId="row-1"
          staffCode="103"
          onEvidenceChanged={() => {}}
          onUploadSuccess={onUploadSuccess}
        />
      )
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-upload-button"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    await act(async () => {
      pickLocalFile(
        container,
        0,
        new File(["photo"], "photo.jpg", { type: "image/jpeg" })
      )
      pickLocalFile(container, 1, new File(["id"], "id.jpg", { type: "image/jpeg" }))
      await Promise.resolve()
    })

    await act(async () => {
      container.querySelector('[data-testid="staff-evidence-upload-confirm"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(mockedUpload).toHaveBeenCalledWith("row-1", {
      photo: expect.any(Blob),
      idCard: expect.any(Blob),
    })
    expect(onUploadSuccess).toHaveBeenCalled()
    expect(container.querySelector('[data-testid="staff-evidence-upload-dialog"]')).toBeNull()
  })
})
