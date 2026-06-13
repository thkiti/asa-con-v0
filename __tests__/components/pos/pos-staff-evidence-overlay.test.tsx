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
import { resizeStaffPhotoForUpload, rotateStaffEvidenceImageForUpload } from "@/lib/pos-ui/staff-evidence-image"
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
    rotateStaffEvidenceImageForUpload: jest.fn(),
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
const mockedRotate = rotateStaffEvidenceImageForUpload as jest.MockedFunction<
  typeof rotateStaffEvidenceImageForUpload
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

  function renderOverlay(onEvidenceComplete = jest.fn()) {
    act(() => {
      root.render(
        <PosStaffEvidenceOverlay
          session={session}
          onClose={() => undefined}
          onEvidenceComplete={onEvidenceComplete}
        />
      )
    })
    return onEvidenceComplete
  }

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => "blob:preview")
    URL.revokeObjectURL = jest.fn()
    mockedResize.mockResolvedValue(new Blob(["resized-photo"], { type: "image/jpeg" }))
    mockedRotate.mockImplementation(async (blob) => new Blob(["rotated", blob], { type: "image/jpeg" }))
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

  it("auto-starts camera on mount at step 1 with mobile upload button", async () => {
    renderOverlay()

    await act(async () => {
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-webcam-video"]')).toBeTruthy()
    expect(mockedStartCamera).toHaveBeenCalled()
    expect(container.querySelector('[data-testid="pos-staff-evidence-webcam-start"]')).toBeNull()
    expect(container.querySelector('[data-testid="pos-staff-evidence-upload-start"]')?.textContent).toBe(
      "Upload from Mobile"
    )
    expect(container.querySelector('[data-testid="pos-staff-evidence-step"]')?.textContent).toBe(
      "Step 1/3 — ถ่ายรูปพนักงาน"
    )
  })

  it("captures photo, advances to step 2 via ถัดไป", async () => {
    renderOverlay()

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-capture"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-preview-image"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="pos-staff-evidence-next"]')).toBeTruthy()

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-step"]')?.textContent).toBe(
      "Step 2/3 — สแกนบัตรประชาชน"
    )
  })

  it("shows horizontal compact confirm previews after full flow", async () => {
    jest.useFakeTimers()

    renderOverlay()

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-capture"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
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
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-upload-warning"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="pos-staff-evidence-preview-photo"]')?.className).toContain(
      "max-h-[260px]"
    )
    expect(container.querySelector('[data-testid="pos-staff-evidence-preview-id"]')?.className).toContain(
      "max-h-[260px]"
    )
  })

  it("keeps staff photo preview URL valid on step 3 after both captures", async () => {
    let urlCounter = 0
    ;(URL.createObjectURL as jest.Mock).mockImplementation(
      () => `blob:preview-${++urlCounter}`
    )

    renderOverlay()

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-capture"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
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
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    const staffImg = container.querySelector(
      '[data-testid="pos-staff-evidence-preview-photo"]'
    ) as HTMLImageElement
    const idImg = container.querySelector(
      '[data-testid="pos-staff-evidence-preview-id"]'
    ) as HTMLImageElement

    expect(staffImg).toBeTruthy()
    expect(idImg).toBeTruthy()
    expect(staffImg.src).toContain("blob:preview-")
    expect(idImg.src).toContain("blob:preview-")
    expect(staffImg.src).not.toBe(idImg.src)

    const revokedUrls = (URL.revokeObjectURL as jest.Mock).mock.calls.map((call) => call[0])
    expect(revokedUrls).not.toContain(staffImg.src)
    expect(revokedUrls).not.toContain(idImg.src)
  })

  it("does not show Confirm & Upload until step 3 with both photos", async () => {
    renderOverlay()

    expect(container.querySelector('[data-testid="pos-staff-evidence-upload"]')).toBeNull()

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-capture"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-upload"]')).toBeNull()

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-capture"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    const uploadBtn = container.querySelector(
      '[data-testid="pos-staff-evidence-upload"]'
    ) as HTMLButtonElement
    expect(uploadBtn).toBeTruthy()
    expect(uploadBtn.disabled).toBe(false)
  })

  it("retake staff photo from step 3 returns to step 1", async () => {
    renderOverlay()

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-capture"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
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
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-retake-staff"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-step"]')?.textContent).toBe(
      "Step 1/3 — ถ่ายรูปพนักงาน"
    )
    expect(container.querySelector('[data-testid="pos-staff-evidence-webcam-video"]')).toBeTruthy()
  })

  it("submits once on Confirm & Upload and calls onEvidenceComplete", async () => {
    jest.useFakeTimers()
    const onComplete = jest.fn()
    renderOverlay(onComplete)

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-capture"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    act(() => {
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
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
      container.querySelector('[data-testid="pos-staff-evidence-next"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
    })

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-upload"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(mockedSubmit).toHaveBeenCalledTimes(1)
    const submitArgs = mockedSubmit.mock.calls[0][0]
    expect(submitArgs.photo.type).toBe("image/jpeg")
    expect(submitArgs.idCard.type).toBe("image/jpeg")
    expect(submitArgs.photo.name).toBe("staff-photo.jpg")
    expect(submitArgs.idCard.name).toBe("staff-id.jpg")
    expect(container.querySelector('[data-testid="pos-staff-evidence-success"]')).toBeTruthy()

    await act(async () => {
      jest.advanceTimersByTime(1500)
      await Promise.resolve()
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it("shows rotate in preview and updates draft via rotateStaffEvidenceImageForUpload", async () => {
    renderOverlay()

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-webcam-capture"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="pos-staff-evidence-rotate"]')).toBeTruthy()

    await act(async () => {
      container.querySelector('[data-testid="pos-staff-evidence-rotate"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      )
      await Promise.resolve()
    })

    expect(mockedRotate).toHaveBeenCalledTimes(1)
    expect(mockedSubmit).not.toHaveBeenCalled()
  })
})
