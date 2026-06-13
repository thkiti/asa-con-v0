/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosStaffEvidenceOverlay } from "@/components/pos/PosStaffEvidenceOverlay"
import { captureVideoFrame, startCameraStream } from "@/lib/pos-ui/capture-video-frame"
import { processIdCardForUpload } from "@/lib/pos-ui/id-card-image-enhance"
import {
  fetchStaffEvidenceMobileLink,
  fetchStaffEvidenceMobileStatus,
} from "@/lib/pos-ui/staff-evidence-mobile-client"
import { submitStaffEvidenceCapture } from "@/lib/pos-ui/staff-evidence-client"
import { resizeStaffPhotoForUpload } from "@/lib/pos-ui/staff-evidence-image"
import type { PosTerminalSession } from "@/lib/pos-ui/types"

jest.mock("@/lib/pos-ui/staff-evidence-client", () => ({
  submitStaffEvidenceCapture: jest.fn(),
}))

jest.mock("@/lib/pos-ui/staff-evidence-mobile-client", () => ({
  fetchStaffEvidenceMobileLink: jest.fn(),
  fetchStaffEvidenceMobileStatus: jest.fn(),
}))

jest.mock("@/lib/pos-ui/capture-video-frame", () => ({
  captureVideoFrame: jest.fn(),
  startCameraStream: jest.fn(),
  stopMediaStream: jest.fn(),
}))

jest.mock("@/lib/pos-ui/staff-evidence-image", () => {
  const actual = jest.requireActual<typeof import("@/lib/pos-ui/staff-evidence-image")>(
    "@/lib/pos-ui/staff-evidence-image"
  )
  return {
    ...actual,
    resizeStaffPhotoForUpload: jest.fn(),
  }
})

jest.mock("@/lib/pos-ui/id-card-image-enhance", () => ({
  processIdCardForUpload: jest.fn(),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const session = {
  staffId: "103",
  name: "Test Staff",
  branchId: "B1",
  branchName: "Shop",
  role: "staff",
} as PosTerminalSession

const mockedResize = resizeStaffPhotoForUpload as jest.MockedFunction<
  typeof resizeStaffPhotoForUpload
>
const mockedIdProcess = processIdCardForUpload as jest.MockedFunction<
  typeof processIdCardForUpload
>
const mockedSubmit = submitStaffEvidenceCapture as jest.MockedFunction<
  typeof submitStaffEvidenceCapture
>
const mockedStartCamera = startCameraStream as jest.MockedFunction<typeof startCameraStream>
const mockedCapture = captureVideoFrame as jest.MockedFunction<typeof captureVideoFrame>
const mockedMobileLink = fetchStaffEvidenceMobileLink as jest.MockedFunction<
  typeof fetchStaffEvidenceMobileLink
>
const mockedMobileStatus = fetchStaffEvidenceMobileStatus as jest.MockedFunction<
  typeof fetchStaffEvidenceMobileStatus
>

describe("PosStaffEvidenceOverlay", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => "blob:preview")
    URL.revokeObjectURL = jest.fn()
    mockedResize.mockResolvedValue(new Blob(["resized-photo"], { type: "image/jpeg" }))
    mockedIdProcess.mockResolvedValue(new Blob(["resized-id"], { type: "image/jpeg" }))
    mockedSubmit.mockResolvedValue({
      staffId: "103",
      photoUploaded: true,
      idCardUploaded: true,
      evidenceComplete: true,
    })
    mockedStartCamera.mockResolvedValue({} as MediaStream)
    mockedCapture.mockResolvedValue(new Blob(["raw"], { type: "image/jpeg" }))
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it("starts directly at staff photo step with capture actions", () => {
    act(() => {
      root.render(
        <PosStaffEvidenceOverlay
          session={session}
          onClose={() => undefined}
          onEvidenceComplete={() => undefined}
        />
      )
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-choose-mode"]')).toBeNull()
    expect(container.querySelector('[data-testid="pos-staff-evidence-step"]')?.textContent).toBe(
      "ถ่ายรูปพนักงาน"
    )
    expect(container.querySelector('[data-testid="pos-staff-evidence-webcam-start"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="pos-staff-evidence-upload-start"]')).toBeTruthy()
  })

  it("opens webcam view when ถ่ายรูป is clicked", () => {
    act(() => {
      root.render(
        <PosStaffEvidenceOverlay
          session={session}
          onClose={() => undefined}
          onEvidenceComplete={() => undefined}
        />
      )
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-start"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-webcam-video"]')).toBeTruthy()
    expect(mockedStartCamera).toHaveBeenCalled()
  })

  it("shows horizontal compact confirm previews", async () => {
    jest.useFakeTimers()

    act(() => {
      root.render(
        <PosStaffEvidenceOverlay
          session={session}
          onClose={() => undefined}
          onEvidenceComplete={() => undefined}
        />
      )
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-start"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-capture"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-confirm"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    mockedMobileLink.mockResolvedValue({
      ok: true,
      uploadUrl: "http://localhost/staff-evidence/mobile/token",
      token: "token",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      kind: "id",
      staffId: "103",
    })
    mockedMobileStatus.mockResolvedValue({
      ok: true,
      ready: true,
      blobUrl: "https://blob.example/id.jpg",
      kind: "id",
      staffId: "103",
    })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["id-raw"], { type: "image/jpeg" }),
    }) as unknown as typeof fetch

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-upload-start"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    await act(async () => {
      jest.advanceTimersByTime(2100)
      await Promise.resolve()
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-confirm"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-upload-warning"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="pos-staff-evidence-preview-photo"]')?.className).toContain(
      "max-h-[260px]"
    )
    expect(container.querySelector('[data-testid="pos-staff-evidence-preview-id"]')?.className).toContain(
      "max-h-[220px]"
    )
  })
})
