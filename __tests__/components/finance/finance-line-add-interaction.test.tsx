/**
 * @jest-environment jsdom
 */
import { createRoot } from "react-dom/client"
import { act } from "react"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { PaymentVoucherEditorPage } from "@/components/finance/PaymentVoucherEditorPage"
import { PettyCashVoucherEditorPage } from "@/components/finance/PettyCashVoucherEditorPage"
import { RevenueVoucherEditorPage } from "@/components/finance/RevenueVoucherEditorPage"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/finance-ui/finance-voucher-local-font", () => ({
  financeVoucherLocalFont: {
    variable: "font-finance-voucher",
    className: "font-finance-voucher",
  },
}))

jest.mock("@/lib/finance-ui/use-finance-current-return-path", () => ({
  useFinanceCurrentReturnPath: () => "/finance/test",
}))

jest.mock("@/lib/finance-ui/manual-journal-entry-session", () => ({
  fetchManualJournalSessionContext: jest.fn().mockResolvedValue({
    staffId: "staff-1",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
    documentEntityCode: "AS",
  }),
}))

jest.mock("@/lib/finance-ui/gl-accounts", () => ({
  fetchGlAccounts: jest.fn().mockResolvedValue({
    view: "flat",
    accounts: [
      {
        id: "acc-bank-1021001",
        code: "1021001",
        name: "เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266",
        accountType: "ASSET",
        isActive: true,
        deleted: false,
      },
      {
        id: "acc-petty-1011",
        code: "1011",
        name: "เงินสดย่อย",
        accountType: "ASSET",
        isActive: true,
        deleted: false,
      },
    ],
    total: 2,
  }),
}))

function mount(ui: React.ReactElement) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(ui)
  })
  return {
    container,
    cleanup() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function userLineCount(container: HTMLElement): number {
  return container.querySelectorAll('[data-testid="line-remove"]').length
}

function pressEnterOnLastMemo(container: HTMLElement) {
  const memoInputs = container.querySelectorAll('[data-testid="line-memo"]')
  const last = memoInputs[memoInputs.length - 1] as HTMLInputElement | undefined
  if (!last) throw new Error("Memo input not found")
  act(() => {
    last.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    )
  })
}

describe("Finance editor keyboard line entry", () => {
  it("does not render Add line buttons in create mode", () => {
    const editors = [
      <ManualJournalEntryEditorPage key="mjv" mode="create" initialEntryType="MANUAL" />,
      <PaymentVoucherEditorPage key="pav" mode="create" />,
      <RevenueVoucherEditorPage key="rev" mode="create" />,
      <PettyCashVoucherEditorPage key="pcv" mode="create" />,
    ]
    for (const editor of editors) {
      const { container, cleanup } = mount(editor)
      expect(container.querySelector('[data-testid="action-add-line"]')).toBeNull()
      expect(container.querySelector('[data-testid="line-add-tip"]')).toBeNull()
      cleanup()
    }
  })

  describe("ManualJournalEntryEditorPage", () => {
    it("adds a row when Enter is pressed in Memo on the last row", () => {
      const { container, cleanup } = mount(
        <ManualJournalEntryEditorPage mode="create" initialEntryType="MANUAL" />
      )
      const before = userLineCount(container)
      expect(before).toBe(2)
      pressEnterOnLastMemo(container)
      expect(userLineCount(container)).toBe(before + 1)
      cleanup()
    })
  })

  describe("PaymentVoucherEditorPage", () => {
    it("adds a row when Enter is pressed in Memo on the last row", () => {
      const { container, cleanup } = mount(<PaymentVoucherEditorPage mode="create" />)
      const before = userLineCount(container)
      expect(before).toBe(2)
      pressEnterOnLastMemo(container)
      expect(userLineCount(container)).toBe(before + 1)
      cleanup()
    })
  })

  describe("RevenueVoucherEditorPage", () => {
    it("adds a row when Enter is pressed in Memo on the last row", () => {
      const { container, cleanup } = mount(<RevenueVoucherEditorPage mode="create" />)
      const before = userLineCount(container)
      expect(before).toBe(2)
      pressEnterOnLastMemo(container)
      expect(userLineCount(container)).toBe(before + 1)
      cleanup()
    })
  })

  describe("PettyCashVoucherEditorPage", () => {
    it("adds a row when Enter is pressed in Memo on the last row", () => {
      const { container, cleanup } = mount(<PettyCashVoucherEditorPage mode="create" />)
      const before = userLineCount(container)
      expect(before).toBe(2)
      pressEnterOnLastMemo(container)
      expect(userLineCount(container)).toBe(before + 1)
      cleanup()
    })
  })
})
