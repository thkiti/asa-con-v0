import type { BankStatementDetail } from "@/lib/finance/bank-statement/bank-statement-types"
import { matchStatementLinesToJournal } from "@/lib/finance/bank-statement-match"
import {
  areQuickLinesDirty,
  buildQuickStatementPatchPayload,
  completeBankStatementCheck,
  findOrCreateBankStatementWorkspace,
  isQuickStatementFullyMatched,
  mapDetailToQuickLines,
  pickBankStatementWorkspaceRow,
  quickLinesToMatchLines,
  saveQuickStatementLines,
  type QuickStatementLine,
} from "@/lib/finance-ui/bank-cash-workspace"
import type { BankStatementRow } from "@/lib/finance/bank-statement"

jest.mock("@/lib/finance-ui/bank-statements", () => ({
  createBankStatement: jest.fn(),
  fetchBankStatement: jest.fn(),
  fetchBankStatements: jest.fn(),
  patchBankStatement: jest.fn(),
}))

import {
  createBankStatement,
  fetchBankStatement,
  fetchBankStatements,
  patchBankStatement,
} from "@/lib/finance-ui/bank-statements"

const mockCreate = createBankStatement as jest.Mock
const mockList = fetchBankStatements as jest.Mock
const mockPatch = patchBankStatement as jest.Mock
const mockFetch = fetchBankStatement as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

function sampleDetail(overrides: Partial<BankStatementDetail> = {}): BankStatementDetail {
  return {
    id: "stmt-1",
    legalEntityCode: "AD",
    bankAccountId: "bank-1",
    bankAccount: {
      id: "bank-1",
      bankName: "BBL",
      accountNumber: "123",
      accountName: "Operating",
      currencyCode: "THB",
      glAccount: { id: "gl-1", code: "1100", name: "Bank" },
    },
    periodKey: "2026-01",
    statementNo: "BS-2026-01-001",
    statementDate: "2026-01-31",
    openingBalance: "1000.00",
    closingBalance: "1500.00",
    status: "NEW",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdByStaffId: null,
    updatedByStaffId: null,
    lines: [],
    validation: {
      isValid: true,
      openingBalance: "1000.00",
      totalDeposits: "0.00",
      totalWithdrawals: "0.00",
      computedClosingBalance: "1000.00",
      declaredClosingBalance: "1500.00",
      message: "ok",
    },
    ...overrides,
  }
}

function quickLine(overrides: Partial<QuickStatementLine> = {}): QuickStatementLine {
  return {
    key: "line-local-1",
    depositAmount: "",
    withdrawalAmount: "",
    transactionDate: "",
    description: "",
    chequeNumber: "",
    showDetails: false,
    ...overrides,
  }
}

function listRow(overrides: Partial<BankStatementRow> = {}): BankStatementRow {
  const detail = sampleDetail(overrides as Partial<BankStatementDetail>)
  return {
    id: detail.id,
    legalEntityCode: detail.legalEntityCode,
    bankAccountId: detail.bankAccountId,
    bankAccount: detail.bankAccount,
    periodKey: detail.periodKey,
    statementNo: detail.statementNo,
    statementDate: detail.statementDate,
    openingBalance: detail.openingBalance,
    closingBalance: detail.closingBalance,
    status: detail.status,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    createdByStaffId: detail.createdByStaffId,
    updatedByStaffId: detail.updatedByStaffId,
    ...overrides,
  }
}

describe("buildQuickStatementPatchPayload", () => {
  const detail = sampleDetail()

  it("includes deposit-only quick input rows", () => {
    const payload = buildQuickStatementPatchPayload(detail, [
      quickLine({ depositAmount: "250.00" }),
    ])

    expect(payload.lines).toHaveLength(1)
    expect(payload.lines[0]).toMatchObject({
      depositAmount: "250.00",
      withdrawalAmount: null,
      description: "",
    })
  })

  it("includes withdrawal-only quick input rows", () => {
    const payload = buildQuickStatementPatchPayload(detail, [
      quickLine({ withdrawalAmount: "75.50" }),
    ])

    expect(payload.lines).toHaveLength(1)
    expect(payload.lines[0]).toMatchObject({
      depositAmount: null,
      withdrawalAmount: "75.50",
      description: "",
    })
  })

  it("defaults blank date to statementDate", () => {
    const payload = buildQuickStatementPatchPayload(detail, [
      quickLine({ depositAmount: "100.00", transactionDate: "" }),
    ])

    expect(payload.lines[0]?.transactionDate).toBe("2026-01-31")
  })

  it("allows blank description", () => {
    const payload = buildQuickStatementPatchPayload(detail, [
      quickLine({ depositAmount: "100.00", description: "   " }),
    ])

    expect(payload.lines[0]?.description).toBe("")
  })

  it("skips rows without deposit or withdrawal amounts", () => {
    const payload = buildQuickStatementPatchPayload(detail, [
      quickLine({ depositAmount: "100.00" }),
      quickLine({ key: "empty-row" }),
    ])

    expect(payload.lines).toHaveLength(1)
  })
})

describe("mapDetailToQuickLines", () => {
  it("reloads saved deposit and withdrawal amounts into quick input rows", () => {
    const detail = sampleDetail({
      status: "DRAFT",
      lines: [
        {
          id: "line-1",
          lineNo: 1,
          transactionDate: "2026-01-31",
          description: "",
          chequeNumber: null,
          depositAmount: "250.00",
          withdrawalAmount: null,
          runningBalance: "0.00",
        },
        {
          id: "line-2",
          lineNo: 2,
          transactionDate: "2026-01-31",
          description: "",
          chequeNumber: null,
          depositAmount: null,
          withdrawalAmount: "75.50",
          runningBalance: "0.00",
        },
      ],
    })

    const rows = mapDetailToQuickLines(detail)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      key: "line-1",
      serverId: "line-1",
      depositAmount: "250.00",
      withdrawalAmount: "",
    })
    expect(rows[1]).toMatchObject({
      key: "line-2",
      serverId: "line-2",
      depositAmount: "",
      withdrawalAmount: "75.50",
      showDetails: false,
    })
  })
})

describe("saveQuickStatementLines", () => {
  it("re-fetches and returns saved lines after patch", async () => {
    const detail = sampleDetail()
    const savedDetail = sampleDetail({
      status: "DRAFT",
      lines: [
        {
          id: "line-1",
          lineNo: 1,
          transactionDate: "2026-01-31",
          description: "",
          chequeNumber: null,
          depositAmount: "250.00",
          withdrawalAmount: null,
          runningBalance: "0.00",
        },
      ],
    })

    mockPatch.mockResolvedValue({ item: savedDetail })
    mockFetch.mockResolvedValue({ item: savedDetail })

    const result = await saveQuickStatementLines("AD", detail, [
      quickLine({ depositAmount: "250.00" }),
    ])

    expect(mockPatch).toHaveBeenCalledWith("AD", "stmt-1", expect.objectContaining({
      lines: [
        expect.objectContaining({
          depositAmount: "250.00",
          withdrawalAmount: null,
          transactionDate: "2026-01-31",
          description: "",
        }),
      ],
    }))
    expect(mockFetch).toHaveBeenCalledWith("AD", "stmt-1")
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0]?.depositAmount).toBe("250.00")
  })
})

describe("matching after saved lines reload", () => {
  it("re-runs amount matching using reloaded server line ids", () => {
    const detail = sampleDetail({
      lines: [
        {
          id: "line-1",
          lineNo: 1,
          transactionDate: "2026-01-31",
          description: "",
          chequeNumber: null,
          depositAmount: "250.00",
          withdrawalAmount: null,
          runningBalance: "0.00",
        },
      ],
    })

    const reloadedLines = mapDetailToQuickLines(detail)
    const summary = matchStatementLinesToJournal(
      quickLinesToMatchLines(reloadedLines),
      [{ id: "j-1", depositAmount: "250.00", withdrawalAmount: "0.00" }]
    )

    expect(summary.matchedStatementLineIds).toEqual(["line-1"])
    expect(summary.matchedJournalLineIds).toEqual(["j-1"])
  })

  it("matches amount-only rows immediately by side", () => {
    const lines = [
      quickLine({ key: "local-1", withdrawalAmount: "75.50" }),
    ]
    const summary = matchStatementLinesToJournal(
      quickLinesToMatchLines(lines),
      [{ id: "j-2", depositAmount: "0.00", withdrawalAmount: "75.50" }]
    )

    expect(summary.matchedStatementLineIds).toEqual(["local-1"])
    expect(summary.unmatchedStatementLineIds).toEqual([])
  })
})

describe("isQuickStatementFullyMatched", () => {
  it("returns false when unmatched statement rows remain", () => {
    const lines = [quickLine({ depositAmount: "100.00" }), quickLine({ key: "u", depositAmount: "5.00" })]
    const summary = matchStatementLinesToJournal(
      quickLinesToMatchLines(lines),
      [{ id: "j-1", depositAmount: "100.00", withdrawalAmount: "0.00" }]
    )

    expect(isQuickStatementFullyMatched(lines, summary)).toBe(false)
  })

  it("returns true when all amount rows are matched", () => {
    const lines = [quickLine({ depositAmount: "100.00" })]
    const summary = matchStatementLinesToJournal(
      quickLinesToMatchLines(lines),
      [{ id: "j-1", depositAmount: "100.00", withdrawalAmount: "0.00" }]
    )

    expect(isQuickStatementFullyMatched(lines, summary)).toBe(true)
  })

  it("returns false when there are no amount rows", () => {
    const lines = [quickLine()]
    const summary = matchStatementLinesToJournal(quickLinesToMatchLines(lines), [])

    expect(isQuickStatementFullyMatched(lines, summary)).toBe(false)
  })
})

describe("completeBankStatementCheck", () => {
  it("saves dirty lines then sets status to READY", async () => {
    const detail = sampleDetail({ status: "DRAFT", lines: [] })
    const lines = [quickLine({ depositAmount: "100.00" })]
    const savedDetail = sampleDetail({
      status: "DRAFT",
      lines: [
        {
          id: "line-1",
          lineNo: 1,
          transactionDate: "2026-01-31",
          description: "",
          chequeNumber: null,
          depositAmount: "100.00",
          withdrawalAmount: null,
          runningBalance: "0.00",
        },
      ],
    })
    const readyDetail = sampleDetail({ status: "READY", lines: savedDetail.lines })

    mockPatch.mockResolvedValue({ item: savedDetail })
    mockFetch
      .mockResolvedValueOnce({ item: savedDetail })
      .mockResolvedValueOnce({ item: readyDetail })

    const result = await completeBankStatementCheck("AD", detail, lines)

    expect(mockPatch).toHaveBeenCalledTimes(2)
    expect(mockPatch).toHaveBeenNthCalledWith(2, "AD", "stmt-1", { status: "READY" })
    expect(result.status).toBe("READY")
  })

  it("detects dirty quick lines before completion", () => {
    const detail = sampleDetail({ lines: [] })
    const lines = [quickLine({ depositAmount: "50.00" })]

    expect(areQuickLinesDirty(detail, lines)).toBe(true)
    expect(areQuickLinesDirty(detail, mapDetailToQuickLines(detail))).toBe(false)
  })
})

describe("pickBankStatementWorkspaceRow", () => {
  it("prefers READY over empty legacy NEW duplicate rows", () => {
    const picked = pickBankStatementWorkspaceRow([
      listRow({ id: "stmt-002", statementNo: "BS-2026-01-002", status: "NEW" }),
      listRow({ id: "stmt-001", statementNo: "BS-2026-01-001", status: "READY" }),
    ])

    expect(picked?.id).toBe("stmt-001")
    expect(picked?.status).toBe("READY")
  })

  it("returns earliest NEW/DRAFT when no READY exists among legacy duplicates", () => {
    const picked = pickBankStatementWorkspaceRow([
      listRow({ id: "stmt-002", statementNo: "BS-2026-01-002", status: "DRAFT" }),
      listRow({ id: "stmt-001", statementNo: "BS-2026-01-001", status: "NEW" }),
    ])

    expect(picked?.id).toBe("stmt-001")
  })
})

describe("findOrCreateBankStatementWorkspace", () => {
  const workspaceInput = {
    periodKey: "2026-01",
    bankAccountId: "bank-1",
    openingBalance: "1000.00",
    closingBalance: "1500.00",
  }

  it("reopens an existing READY statement without creating a duplicate", async () => {
    const ready = sampleDetail({ id: "stmt-ready", status: "READY" })
    mockList.mockResolvedValue({ items: [listRow({ id: ready.id, status: "READY" })], total: 1 })
    mockFetch.mockResolvedValue({ item: ready })

    const result = await findOrCreateBankStatementWorkspace("AD", workspaceInput)

    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith("AD", "stmt-ready")
    expect(result.status).toBe("READY")
  })

  it("creates a statement only when none exists for the period", async () => {
    const created = sampleDetail({ id: "stmt-new", status: "NEW" })
    mockList.mockResolvedValue({ items: [], total: 0 })
    mockCreate.mockResolvedValue({ item: created })

    const result = await findOrCreateBankStatementWorkspace("AD", workspaceInput)

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.id).toBe("stmt-new")
  })

  it("does not create a duplicate after Complete Check when reopening the workspace", async () => {
    const ready = sampleDetail({
      id: "1f253115-0a49-4ecd-94bf-5a183dca7e28",
      statementNo: "BS-2026-01-001",
      status: "READY",
    })
    mockList.mockResolvedValue({ items: [listRow({ id: ready.id, statementNo: ready.statementNo, status: "READY" })], total: 1 })
    mockFetch.mockResolvedValue({ item: ready })

    await findOrCreateBankStatementWorkspace("AD", workspaceInput)
    await findOrCreateBankStatementWorkspace("AD", workspaceInput)

    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockList).toHaveBeenCalledTimes(2)
  })
})
