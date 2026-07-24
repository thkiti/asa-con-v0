/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { GeneralLedgerPage } from "@/components/finance/GeneralLedgerPage"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"
import type { GeneralLedgerResult } from "@/lib/finance-ui/types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const glAccounts: GlAccountListRow[] = [
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
]

const sampleResult: GeneralLedgerResult = {
  filter: {
    branchId: "branch-1",
    legalEntityCode: "AD",
    periodKey: "2026-05",
    accountCode: "101",
  },
  accounts: [
    {
      accountCode: "101",
      accountName: "สำรองตามกฎหมาย",
      accountType: "EQUITY",
      openingDebit: "0",
      openingCredit: "0",
      openingBalance: "0",
      closingBalance: "500.00",
      transactions: [
        {
          journalEntryId: "je-1",
          journalLineId: "jl-1",
          journalDate: "2026-05-10T00:00:00.000Z",
          entryNo: "MJV-260010",
          sourceRef: null,
          sourceRefType: null,
          sourceRefId: null,
          voucherId: null,
          description: "Test journal",
          lineMemo: null,
          debit: "500.00",
          credit: "0",
          signedMovement: "500",
          runningBalance: "500.00",
        },
      ],
    },
  ],
}

const mockFetchGlAccounts = jest.fn().mockResolvedValue({
  view: "flat",
  accounts: glAccounts,
  total: glAccounts.length,
})

const mockFetchGeneralLedger = jest.fn().mockResolvedValue(sampleResult)

jest.mock("@/lib/finance-ui/gl-accounts", () => ({
  fetchGlAccounts: (...args: unknown[]) => mockFetchGlAccounts(...args),
}))

jest.mock("@/lib/finance-ui/general-ledger", () => ({
  fetchGeneralLedger: (...args: unknown[]) => mockFetchGeneralLedger(...args),
  downloadGeneralLedgerCsv: jest.fn(),
}))

jest.mock("@/lib/finance-ui/use-accounting-period-options", () => ({
  useAccountingPeriodOptions: () => ({
    legalEntityCode: "AD",
    periods: [
      {
        id: "period-1",
        periodKey: "2026-07",
        legalEntityCode: "AD",
        branchId: "branch-1",
        branchName: "HO",
        status: "OPEN",
        openedAt: "2026-07-01T00:00:00.000Z",
        closedAt: null,
      },
    ],
    loading: false,
    loadError: null,
    hasPeriods: true,
    emptyMessage: "No accounting period found for this entity.",
  }),
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("GeneralLedgerPage", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    jest.useFakeTimers()
    mockFetchGlAccounts.mockClear()
    mockFetchGeneralLedger.mockClear()
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
      throw new Error("Account combobox input not found")
    }
    return el
  }

  async function selectAccountFromDropdown() {
    await act(async () => {
      input().focus()
    })
    await act(async () => {
      jest.advanceTimersByTime(200)
    })
    const option = container.querySelector('[data-testid="gl-account-option-101"]')
    if (!(option instanceof HTMLButtonElement)) {
      throw new Error("Account option not found")
    }
    await act(async () => {
      option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
      option.click()
    })
    await act(async () => {
      await Promise.resolve()
    })
  }

  it("auto-refreshes when account is selected from dropdown", async () => {
    await act(async () => {
      root.render(<GeneralLedgerPage />)
    })

    await selectAccountFromDropdown()

    expect(mockFetchGeneralLedger).toHaveBeenCalledWith(
      expect.objectContaining({
        accountCode: "101",
        periodKey: expect.any(String),
      })
    )
    expect(container.querySelector('[data-testid="gl-list-view"]')).not.toBeNull()
    expect(container.textContent).toContain("MJV-260010")
  })

  it("refreshes on Enter when highlighted account option exists", async () => {
    await act(async () => {
      root.render(<GeneralLedgerPage />)
    })

    await act(async () => {
      input().focus()
    })
    await act(async () => {
      jest.advanceTimersByTime(200)
    })

    await act(async () => {
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      )
    })
    await act(async () => {
      input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
      await Promise.resolve()
    })

    expect(mockFetchGeneralLedger).toHaveBeenCalledWith(
      expect.objectContaining({ accountCode: "101" })
    )
  })

  it("still refreshes when Refresh button is clicked", async () => {
    await act(async () => {
      root.render(<GeneralLedgerPage />)
    })

    await selectAccountFromDropdown()
    mockFetchGeneralLedger.mockClear()

    const refreshButton = container.querySelector('[data-testid="gl-refresh-button"]')
    if (!(refreshButton instanceof HTMLButtonElement)) {
      throw new Error("Refresh button not found")
    }

    await act(async () => {
      refreshButton.click()
      await Promise.resolve()
    })

    expect(mockFetchGeneralLedger).toHaveBeenCalledWith(
      expect.objectContaining({ accountCode: "101" })
    )
  })

  it("toggles between List and T-account views", async () => {
    await act(async () => {
      root.render(<GeneralLedgerPage />)
    })

    await selectAccountFromDropdown()

    expect(container.querySelector('[data-testid="gl-list-view"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="gl-t-account-view"]')).toBeNull()

    const tAccountToggle = container.querySelector('[data-testid="gl-view-t-account"]')
    if (!(tAccountToggle instanceof HTMLInputElement)) {
      throw new Error("T-account toggle not found")
    }

    await act(async () => {
      tAccountToggle.click()
    })

    expect(container.querySelector('[data-testid="gl-t-account-view"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="gl-t-account-debit"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="gl-t-account-credit"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="gl-list-view"]')).toBeNull()
  })

  it("does not render redundant report summary block after refresh", async () => {
    await act(async () => {
      root.render(<GeneralLedgerPage />)
    })

    await selectAccountFromDropdown()

    const report = container.querySelector(".general-ledger-report")
    expect(report).not.toBeNull()
    expect(report?.textContent).not.toMatch(/AD\s*•\s*GENERAL LEDGER/)
    expect(report?.textContent).not.toContain("Account ")
  })

  it("shows T-account title and balanced debit/credit columns", async () => {
    await act(async () => {
      root.render(<GeneralLedgerPage />)
    })

    await selectAccountFromDropdown()

    const tAccountToggle = container.querySelector('[data-testid="gl-view-t-account"]')
    if (!(tAccountToggle instanceof HTMLInputElement)) {
      throw new Error("T-account toggle not found")
    }

    await act(async () => {
      tAccountToggle.click()
    })

    expect(container.textContent).toContain("101")
    expect(container.textContent).toContain("สำรองตามกฎหมาย")
    expect(container.textContent).toContain("(EQUITY)")

    const columns = container.querySelector(".general-ledger-t-account-columns")
    expect(columns).not.toBeNull()
    const debitSide = container.querySelector('[data-testid="gl-t-account-debit"]')
    const creditSide = container.querySelector('[data-testid="gl-t-account-credit"]')
    expect(debitSide?.className).toContain("general-ledger-t-account-side-debit")
    expect(creditSide?.className).toContain("general-ledger-t-account-side-credit")
    expect(columns?.contains(debitSide!)).toBe(true)
    expect(columns?.contains(creditSide!)).toBe(true)

    expect(
      container.querySelector('[data-testid="gl-t-account-closing-balance"]')?.textContent
    ).toContain("500.00")
    expect(
      container.querySelector('[data-testid="gl-t-account-total-debit"]')?.textContent
    ).toContain("500.00")
  })
})
