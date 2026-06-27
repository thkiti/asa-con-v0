/**
 * @jest-environment jsdom
 */
import { printRefundAndExit } from "@/lib/pos-ui/print-refund-and-exit"

jest.mock("@/lib/pos-ui/pos-refund-client", () => ({
  fetchPosRefund: jest.fn(),
}))

import { fetchPosRefund } from "@/lib/pos-ui/pos-refund-client"

const mockedFetchRefund = fetchPosRefund as jest.MockedFunction<typeof fetchPosRefund>

describe("printRefundAndExit", () => {
  const printSpy = jest.spyOn(window, "print").mockImplementation(() => {})

  afterEach(() => {
    document.body.innerHTML = ""
    printSpy.mockClear()
    mockedFetchRefund.mockReset()
  })

  afterAll(() => {
    printSpy.mockRestore()
  })

  it("persists, prints, and exits on success", async () => {
    document.body.innerHTML = `
      <div data-thermal-print-source="pos-refund-receipt" class="thermal-print-area">
        <pre>refund slip</pre>
      </div>
    `
    const onExit = jest.fn()
    const onSaved = jest.fn()

    mockedFetchRefund.mockResolvedValue({
      ok: true,
      refund: {
        id: "refund-1",
        refundNo: "REF-SH001-202606-0001",
        amount: "50.00",
      },
    })

    const result = await printRefundAndExit(
      { saleId: "sale-1", amount: "50.00", reasonCode: "KEY_BLANK_MISTAKE" },
      onExit,
      onSaved
    )

    expect(result).toEqual({ ok: true })
    expect(mockedFetchRefund).toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalledWith({
      id: "refund-1",
      refundNo: "REF-SH001-202606-0001",
      amount: "50.00",
    })
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it("stays open when save fails", async () => {
    const onExit = jest.fn()
    mockedFetchRefund.mockResolvedValue({
      ok: false,
      status: 400,
      error: "Refund failed",
    })

    const result = await printRefundAndExit(
      { saleId: "sale-1", reasonCode: "KEY_BLANK_MISTAKE" },
      onExit
    )

    expect(result).toEqual({ ok: false, error: "Refund failed", phase: "save" })
    expect(onExit).not.toHaveBeenCalled()
    expect(printSpy).not.toHaveBeenCalled()
  })

  it("stays open when print source is missing after save", async () => {
    document.body.innerHTML = ""
    const onExit = jest.fn()
    mockedFetchRefund.mockResolvedValue({
      ok: true,
      refund: {
        id: "refund-1",
        refundNo: "REF-SH001-202606-0001",
        amount: "50.00",
      },
    })

    const result = await printRefundAndExit(
      { saleId: "sale-1", reasonCode: "KEY_BLANK_MISTAKE" },
      onExit
    )

    expect(result).toEqual({
      ok: false,
      error: "พิมพ์ใบคืนเงินไม่สำเร็จ",
      phase: "print",
    })
    expect(onExit).not.toHaveBeenCalled()
  })
})
