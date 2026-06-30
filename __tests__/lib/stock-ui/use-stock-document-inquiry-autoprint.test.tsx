/**
 * @jest-environment jsdom
 */
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { useStockDocumentInquiryAutoprint } from "@/lib/stock-ui/use-stock-document-inquiry-autoprint"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const mockRunPrint = jest.fn()

jest.mock("@/components/stock/StockDocumentPrintActions", () => ({
  runStockDocumentInquiryPrint: () => mockRunPrint(),
}))

const mockSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}))

function AutoprintProbe({ enabled }: { enabled: boolean }) {
  useStockDocumentInquiryAutoprint(enabled)
  return null
}

function mount(ui: ReactElement) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(ui)
  })
  return { container, root }
}

describe("useStockDocumentInquiryAutoprint", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams.delete("autoprint")
  })

  it("triggers print once when autoprint=1 and enabled", async () => {
    mockSearchParams.set("autoprint", "1")
    mount(<AutoprintProbe enabled />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockRunPrint).toHaveBeenCalledTimes(1)
  })

  it("does not print when autoprint is absent", async () => {
    mount(<AutoprintProbe enabled />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockRunPrint).not.toHaveBeenCalled()
  })

  it("does not print when disabled", async () => {
    mockSearchParams.set("autoprint", "1")
    mount(<AutoprintProbe enabled={false} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockRunPrint).not.toHaveBeenCalled()
  })
})
