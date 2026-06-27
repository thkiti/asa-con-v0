/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosCollectorOverlay } from "@/components/pos/PosCollectorOverlay"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

jest.mock("@/lib/pos-ui/read-report-client", () => ({
  verifyPosStaffCredential: jest.fn(),
  fetchPosCollectReport: jest.fn(),
  fetchCollectorDefaultDates: jest.fn(),
}))

import {
  fetchCollectorDefaultDates,
  fetchPosCollectReport,
  verifyPosStaffCredential,
} from "@/lib/pos-ui/read-report-client"

const mockedVerify = verifyPosStaffCredential as jest.MockedFunction<
  typeof verifyPosStaffCredential
>
const mockedFetch = fetchPosCollectReport as jest.MockedFunction<
  typeof fetchPosCollectReport
>
const mockedDefaultDates = fetchCollectorDefaultDates as jest.MockedFunction<
  typeof fetchCollectorDefaultDates
>

const branchId = "b1"

const collectReport: ReadReportPayload = {
  mode: "COLLECT",
  bangkokDate: "2026-06-01 – 2026-06-07",
  bangkokDateFrom: "2026-06-01",
  bangkokDateTo: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "HO Collector",
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

function credentialInput(container: HTMLElement) {
  return container.querySelector(
    'input[name="pos-collect-staff-credential"]'
  ) as HTMLInputElement
}

function dateFromInput(container: HTMLElement) {
  return container.querySelector('input[type="date"]') as HTMLInputElement
}

describe("PosCollectorOverlay", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.alert = jest.fn()
    mockedDefaultDates.mockResolvedValue({
      ok: true,
      dateFrom: "2026-06-10",
      dateTo: "2026-06-25",
    })
  })

  it("renders HO credential gate title", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <PosCollectorOverlay branchId={branchId} onClose={() => {}} onReport={() => {}} />
      )
    })

    expect(container.textContent).toContain("COLLECTOR — เก็บยอดจาก Cash Register")
    expect(container.textContent).toContain("ยืนยันตัวตนพนักงาน HO")
    expect(dateFromInput(container).disabled).toBe(true)

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("blocks invalid HO password and stays on credential gate", async () => {
    mockedVerify.mockResolvedValue({
      ok: false,
      error: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง",
    })

    const onReport = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosCollectorOverlay branchId={branchId} onClose={() => {}} onReport={onReport} />
      )
    })

    const input = credentialInput(container)
    act(() => {
      setInputValue(input, "001/wrong")
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
      intent: "COLLECT",
      staffId: "001",
      password: "wrong",
    })
    expect(window.alert).toHaveBeenCalledWith("รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง")
    expect(dateFromInput(container).disabled).toBe(true)
    expect(onReport).not.toHaveBeenCalled()

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("blocks non-HO staff password and stays on credential gate", async () => {
    mockedVerify.mockResolvedValue({
      ok: false,
      error: "COLLECTOR is available to HO staff only",
    })

    const onReport = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosCollectorOverlay branchId={branchId} onClose={() => {}} onReport={onReport} />
      )
    })

    const input = credentialInput(container)
    act(() => {
      setInputValue(input, "103/shop")
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
      intent: "COLLECT",
      staffId: "103",
      password: "shop",
    })
    expect(window.alert).toHaveBeenCalledWith("COLLECTOR is available to HO staff only")
    expect(onReport).not.toHaveBeenCalled()

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("advances to date range after valid HO credentials", async () => {
    mockedVerify.mockResolvedValue({
      ok: true,
      staffId: "001",
      staffName: "HO Collector",
    })

    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosCollectorOverlay branchId={branchId} onClose={() => {}} onReport={() => {}} />
      )
    })

    const input = credentialInput(container)
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

    expect(input.value).toContain("001")
    expect(input.value).toContain("HO Collector")
    expect(dateFromInput(container).disabled).toBe(false)
    expect(mockedDefaultDates).toHaveBeenCalledWith(branchId)
    expect(dateFromInput(container).value).toBe("2026-06-10")

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("submits collect report with shop branch payload from server", async () => {
    mockedVerify.mockResolvedValue({
      ok: true,
      staffId: "001",
      staffName: "HO Collector",
    })
    mockedFetch.mockResolvedValue({ ok: true, report: collectReport })

    const onReport = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosCollectorOverlay branchId={branchId} onClose={() => {}} onReport={onReport} />
      )
    })

    const input = credentialInput(container)
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

    const submitBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("ตกลง")
    )
    act(() => {
      submitBtn!.click()
    })
    await act(async () => {
      await flushPromises()
    })

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        staffId: "001",
        password: "secret",
        persist: false,
      })
    )
    expect(onReport).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "COLLECT",
        staffId: "001",
        staffName: "HO Collector",
        branchCode: "SH001",
        branchName: "Chidlom",
      }),
      expect.objectContaining({
        staffId: "001",
        password: "secret",
        dateFrom: expect.any(String),
        dateTo: expect.any(String),
      })
    )

    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
