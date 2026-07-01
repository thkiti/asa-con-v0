/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { GlAccountCombobox } from "@/components/finance/GlAccountCombobox"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const allAccounts: GlAccountListRow[] = [
  {
    id: "acc-1161",
    code: "1161",
    name: "ลูกหนี้อื่น",
    accountType: "ASSET",
    parentId: null,
    parentCode: null,
    parentName: null,
    isActive: true,
    deleted: false,
    hasJournalLines: false,
    childCount: 0,
  },
  {
    id: "acc-1306",
    code: "1306",
    name: "สินค้าคงเหลือ",
    accountType: "ASSET",
    parentId: null,
    parentCode: null,
    parentName: null,
    isActive: true,
    deleted: false,
    hasJournalLines: false,
    childCount: 0,
  },
  {
    id: "acc-6003",
    code: "6003",
    name: "ต้นทุนขาย-วัสดุรองเท้า",
    accountType: "EXPENSE",
    parentId: null,
    parentCode: null,
    parentName: null,
    isActive: true,
    deleted: false,
    hasJournalLines: false,
    childCount: 0,
  },
  {
    id: "acc-6100",
    code: "6100",
    name: "ค่าใช้จ่ายในการขาย",
    accountType: "EXPENSE",
    parentId: null,
    parentCode: null,
    parentName: null,
    isActive: true,
    deleted: false,
    hasJournalLines: false,
    childCount: 0,
  },
  {
    id: "acc-101",
    code: "101",
    name: "สำรองตามกฎหมาย",
    accountType: "EQUITY",
    parentId: null,
    parentCode: null,
    parentName: null,
    isActive: true,
    deleted: false,
    hasJournalLines: false,
    childCount: 0,
  },
  {
    id: "acc-1021001",
    code: "1021001",
    name: "เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266",
    accountType: "ASSET",
    parentId: null,
    parentCode: null,
    parentName: null,
    isActive: true,
    deleted: false,
    hasJournalLines: true,
    childCount: 0,
  },
]

const mockFetchGlAccounts = jest.fn().mockResolvedValue({
  view: "flat",
  accounts: allAccounts,
  total: allAccounts.length,
})

jest.mock("@/lib/finance-ui/gl-accounts", () => ({
  fetchGlAccounts: (...args: unknown[]) => mockFetchGlAccounts(...args),
}))

describe("GlAccountCombobox", () => {
  let container: HTMLDivElement
  let root: Root
  const onAccountChange = jest.fn()

  beforeEach(() => {
    jest.useFakeTimers()
    mockFetchGlAccounts.mockClear()
    onAccountChange.mockClear()
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
    jest.useRealTimers()
  })

  function input(): HTMLInputElement {
    const el = container.querySelector('[data-testid="gl-account-combobox-input"]')
    if (!(el instanceof HTMLInputElement)) {
      throw new Error("Combobox input not found")
    }
    return el
  }

  function panel(): HTMLDivElement {
    const el = container.querySelector('[data-testid="gl-account-combobox-list"]')
    if (!(el instanceof HTMLDivElement)) {
      throw new Error("Combobox panel not found")
    }
    return el
  }

  async function typeInInput(value: string) {
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeInputValueSetter?.call(input(), value)
      input().dispatchEvent(new Event("input", { bubbles: true }))
      input().dispatchEvent(new Event("change", { bubbles: true }))
    })
    await act(async () => {
      jest.advanceTimersByTime(200)
    })
  }

  it("renders two-column FinanceAccountOption rows in the option list", async () => {
    await act(async () => {
      root.render(
        <GlAccountCombobox accountCode="" onAccountChange={onAccountChange} />
      )
    })

    await act(async () => {
      input().focus()
    })

    await act(async () => {
      jest.advanceTimersByTime(200)
    })

    const html = container.innerHTML
    expect(html).toContain('data-testid="gl-account-combobox-list"')
    expect(html).toContain('class="finance-account-option"')
    expect(html).toContain('class="finance-account-option-code">1021001</span>')
    expect(html).toContain('class="finance-account-option-name">• เงินฝากธนาคารกรุงเทพ')
    expect(html).toContain("สำรองตามกฎหมาย")
    expect(html).not.toContain("acc-1021001")
    expect(html).not.toContain('class="finance-account-display finance-account"')
  })

  it('typing "6" shows only account codes starting with 6', async () => {
    await act(async () => {
      root.render(
        <GlAccountCombobox accountCode="" onAccountChange={onAccountChange} />
      )
    })

    await act(async () => {
      input().focus()
    })

    await typeInInput("6")

    const dropdown = panel()
    expect(dropdown.querySelector('[data-testid="gl-account-option-6003"]')).not.toBeNull()
    expect(dropdown.querySelector('[data-testid="gl-account-option-6100"]')).not.toBeNull()
    expect(dropdown.querySelector('[data-testid="gl-account-option-1161"]')).toBeNull()
    expect(dropdown.querySelector('[data-testid="gl-account-option-1306"]')).toBeNull()
  })

  it("uses a compact dropdown panel anchored to the compact input", async () => {
    await act(async () => {
      root.render(
        <GlAccountCombobox accountCode="" onAccountChange={onAccountChange} />
      )
    })

    expect(container.querySelector(".gl-account-combobox-root")).not.toBeNull()

    await act(async () => {
      input().focus()
    })

    await act(async () => {
      jest.advanceTimersByTime(200)
    })

    const dropdown = panel()
    expect(dropdown.className).toContain("account-combobox-dropdown")
    expect(dropdown.className).toContain("gl-account-combobox-panel")
    expect(dropdown.className).not.toContain("w-full")
  })

  it("shows plain code • name in the input when an account is selected", async () => {
    await act(async () => {
      root.render(
        <GlAccountCombobox
          accountCode="101"
          accountName="สำรองตามกฎหมาย"
          onAccountChange={onAccountChange}
        />
      )
    })

    expect(input().value).toBe("101 • สำรองตามกฎหมาย")
  })

  it("selects exact code match on Enter", async () => {
    await act(async () => {
      root.render(
        <GlAccountCombobox accountCode="" onAccountChange={onAccountChange} />
      )
    })

    await act(async () => {
      input().focus()
    })

    await typeInInput("6003")

    await act(async () => {
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })

    expect(onAccountChange).toHaveBeenCalledWith("6003", "ต้นทุนขาย-วัสดุรองเท้า")
  })

  it("does not apply partial numeric code on blur", async () => {
    await act(async () => {
      root.render(
        <GlAccountCombobox
          accountCode="101"
          accountName="สำรองตามกฎหมาย"
          onAccountChange={onAccountChange}
        />
      )
    })

    await act(async () => {
      input().focus()
    })

    await typeInInput("6")

    await act(async () => {
      input().blur()
    })

    expect(onAccountChange).not.toHaveBeenCalledWith("6", expect.anything())
    expect(input().value).toBe("101 • สำรองตามกฎหมาย")
  })
})
