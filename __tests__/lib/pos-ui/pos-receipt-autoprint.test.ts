import {
  isReceiptTabOpenedByScript,
  POS_RECEIPT_CLOSE_HINT,
  setupReceiptAutoprint,
} from "@/lib/pos-ui/pos-receipt-autoprint"

describe("pos-receipt-autoprint", () => {
  it("detects script-opened tab via opener", () => {
    expect(isReceiptTabOpenedByScript({ opener: {} } as Window)).toBe(true)
    expect(isReceiptTabOpenedByScript({ opener: null } as Window)).toBe(false)
  })

  it("does nothing when autoPrint is false", () => {
    const print = jest.fn()
    const cleanup = setupReceiptAutoprint({
      autoPrint: false,
      win: { print, setTimeout: jest.fn(), addEventListener: jest.fn() } as unknown as Window,
    })
    cleanup()
    expect(print).not.toHaveBeenCalled()
  })

  it("schedules print and closes tab on afterprint when opened by script", () => {
    jest.useFakeTimers()
    const close = jest.fn()
    const print = jest.fn()
    const onShowCloseHint = jest.fn()
    let afterPrintHandler: (() => void) | null = null
    const win = {
      opener: {},
      closed: false,
      close,
      print,
      onafterprint: null as (() => void) | null,
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
      addEventListener: (type: string, handler: () => void) => {
        if (type === "afterprint") afterPrintHandler = handler
      },
      removeEventListener: jest.fn(),
    } as unknown as Window

    const cleanup = setupReceiptAutoprint({
      autoPrint: true,
      win,
      printDelayMs: 300,
      onShowCloseHint,
    })

    jest.advanceTimersByTime(300)
    expect(print).toHaveBeenCalled()

    win.onafterprint?.()
    afterPrintHandler?.()
    expect(close).toHaveBeenCalled()
    expect(onShowCloseHint).not.toHaveBeenCalled()

    cleanup()
    jest.useRealTimers()
  })

  it("shows close hint when browser blocks window.close", () => {
    jest.useFakeTimers()
    const onShowCloseHint = jest.fn()
    const win = {
      opener: {},
      closed: false,
      close: jest.fn(),
      print: jest.fn(),
      onafterprint: null as (() => void) | null,
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as unknown as Window

    setupReceiptAutoprint({ autoPrint: true, win, onShowCloseHint })
    win.onafterprint?.()
    jest.advanceTimersByTime(300)
    expect(onShowCloseHint).toHaveBeenCalled()

    jest.useRealTimers()
  })

  it("does not auto-close when tab was not opened by script", () => {
    const close = jest.fn()
    const win = {
      opener: null,
      close,
      print: jest.fn(),
      onafterprint: null as (() => void) | null,
      setTimeout: (fn: () => void) => {
        fn()
        return 0
      },
      clearTimeout: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as unknown as Window

    setupReceiptAutoprint({ autoPrint: true, win })
    win.onafterprint?.()
    expect(close).not.toHaveBeenCalled()
  })

  it("exports close hint copy", () => {
    expect(POS_RECEIPT_CLOSE_HINT).toBe("You may close this tab")
  })
})
