import { printThermalSlipClone, thermalPrintSourceSelector } from "@/lib/thermal/print-dom"
import { POS_REFUND_RECEIPT_PRINT_SOURCE } from "@/lib/pos-ui/pos-thermal-ticket-print"
import { setupThermalTicketAutoprint } from "@/lib/pos-ui/pos-thermal-ticket-autoprint"

jest.mock("@/lib/thermal/print-dom", () => ({
  printThermalSlipClone: jest.fn(() => true),
  thermalPrintSourceSelector: jest.fn((kind: string) => `[data-thermal-print-source="${kind}"]`),
}))

describe("pos-thermal-ticket-autoprint", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does nothing when autoPrint is false", () => {
    const cleanup = setupThermalTicketAutoprint({
      autoPrint: false,
      printSourceKind: POS_REFUND_RECEIPT_PRINT_SOURCE,
    })
    cleanup()
    expect(printThermalSlipClone).not.toHaveBeenCalled()
  })

  it("schedules clone print for the thermal print source kind", () => {
    jest.useFakeTimers()
    const win = {
      opener: null,
      closed: false,
      close: jest.fn(),
      onafterprint: null as (() => void) | null,
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as unknown as Window

    setupThermalTicketAutoprint({
      autoPrint: true,
      printSourceKind: POS_REFUND_RECEIPT_PRINT_SOURCE,
      win,
      printDelayMs: 300,
    })

    jest.advanceTimersByTime(300)
    expect(thermalPrintSourceSelector).toHaveBeenCalledWith(POS_REFUND_RECEIPT_PRINT_SOURCE)
    expect(printThermalSlipClone).toHaveBeenCalledWith(
      `[data-thermal-print-source="${POS_REFUND_RECEIPT_PRINT_SOURCE}"]`
    )

    jest.useRealTimers()
  })
})
