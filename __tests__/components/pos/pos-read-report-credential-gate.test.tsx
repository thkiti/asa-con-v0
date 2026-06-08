/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosReadReportCredentialGate } from "@/components/pos/PosReadReportCredentialGate"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

jest.mock("@/lib/pos-ui/read-report-client", () => ({
  verifyPosStaffCredential: jest.fn(),
  fetchPosReadReport: jest.fn(),
}))

import {
  fetchPosReadReport,
  verifyPosStaffCredential,
} from "@/lib/pos-ui/read-report-client"

const mockedVerify = verifyPosStaffCredential as jest.MockedFunction<
  typeof verifyPosStaffCredential
>
const mockedFetch = fetchPosReadReport as jest.MockedFunction<
  typeof fetchPosReadReport
>

const sampleReport: ReadReportPayload = {
  mode: "X",
  bangkokDate: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "Test Staff",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  grandTotal: 0,
  saleCount: 0,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 0,
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

function setInputValue(element: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

describe("PosReadReportCredentialGate", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    window.alert = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("auto-opens report after valid credential without OK button", async () => {
    mockedVerify.mockResolvedValue({
      ok: true,
      staffId: "001",
      staffName: "Test Staff",
    })
    mockedFetch.mockResolvedValue({ ok: true, report: sampleReport })

    const onReport = jest.fn()
    const onClose = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosReadReportCredentialGate mode="X" onClose={onClose} onReport={onReport} />
      )
    })

    const input = container.querySelector("input") as HTMLInputElement
    act(() => {
      setInputValue(input, "001/secret")
    })
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })
    await act(async () => {
      await flushPromises()
    })

    expect(mockedVerify).toHaveBeenCalledWith({
      intent: "READ",
      staffId: "001",
      password: "secret",
    })
    expect(container.textContent).toContain("กำลังเปิดรายงาน")

    await act(async () => {
      jest.advanceTimersByTime(400)
      await flushPromises()
    })

    expect(mockedFetch).toHaveBeenCalledWith({
      staffId: "001",
      password: "secret",
      mode: "X",
    })
    expect(onReport).toHaveBeenCalledWith(sampleReport)
    expect(
      [...container.querySelectorAll("button")].some((btn) =>
        btn.textContent?.includes("ตกลง")
      )
    ).toBe(false)
  })
})
