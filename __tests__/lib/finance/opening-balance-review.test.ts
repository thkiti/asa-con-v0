jest.mock("@/lib/finance/reports/trial-balance", () => ({
  getTrialBalance: jest.fn(),
}))

import { buildOpeningBalanceReviewForPeriod } from "@/lib/finance/opening-balance-review"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"

const mockGetTrialBalance = getTrialBalance as jest.MockedFunction<typeof getTrialBalance>

const periodId = "period-ob-1"
const periodRow = {
  id: periodId,
  periodKey: "2025-12",
  legalEntityCode: "AS",
  branchId: "branch-1",
  status: "OPEN",
  closedAt: null,
  openedAt: new Date("2025-12-01T00:00:00.000Z"),
}

function createPrismaMock(overrides?: {
  openingJournal?: {
    id: string
    entryNo: string
    status: "POSTED" | "DRAFT"
    postedAt: Date | null
    postedJournalEntryId: string | null
    postedVoucherId: string | null
    lines: Array<{ debit: string; credit: string }>
    postedVoucher?: { voucherNo: string } | null
  } | null
  chartCount?: number
}) {
  const openingJournal = overrides?.openingJournal ?? null
  return {
    accountingPeriod: {
      findUnique: jest.fn().mockResolvedValue(periodRow),
    },
    manualJournalEntry: {
      findFirst: jest.fn().mockResolvedValue(
        openingJournal
          ? {
              ...openingJournal,
              lines: openingJournal.lines.map((line, index) => ({
                id: `line-${index}`,
                debit: line.debit,
                credit: line.credit,
              })),
            }
          : null
      ),
    },
    glAccount: {
      count: jest.fn().mockResolvedValue(overrides?.chartCount ?? 10),
    },
    journalEntryLine: {},
  }
}

describe("buildOpeningBalanceReviewForPeriod", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetTrialBalance.mockResolvedValue({
      periodKey: "2025-12",
      legalEntityCode: "AS",
      rows: [],
      totalDebits: "100.00",
      totalCredits: "100.00",
      isBalanced: true,
    })
  })

  it("returns BLOCKED when opening balance journal is missing", async () => {
    const prisma = createPrismaMock({ openingJournal: null })
    const review = await buildOpeningBalanceReviewForPeriod(prisma, periodId)

    expect(review.status).toBe("BLOCKED")
    expect(review.items.find((item) => item.id === "ob-journal-exists")?.passed).toBe(false)
    expect(review.items.find((item) => item.id === "accounting-period-exists")?.passed).toBe(true)
  })

  it("returns READY when posted journal and trial balance are balanced", async () => {
    const prisma = createPrismaMock({
      openingJournal: {
        id: "opb-1",
        entryNo: "OPB-260001",
        status: "POSTED",
        postedAt: new Date("2025-12-31T00:00:00.000Z"),
        postedJournalEntryId: "je-1",
        postedVoucherId: "v-1",
        lines: [
          { debit: "100.00", credit: "0.00" },
          { debit: "0.00", credit: "100.00" },
        ],
        postedVoucher: { voucherNo: "V-2025-12-00001" },
      },
    })

    const review = await buildOpeningBalanceReviewForPeriod(prisma, periodId)

    expect(review.status).toBe("READY")
    expect(review.openingJournal.entryNo).toBe("OPB-260001")
    expect(review.openingJournal.voucherNo).toBe("V-2025-12-00001")
    expect(review.items.every((item) => item.passed)).toBe(true)
  })

  it("rejects non-opening-balance periods", async () => {
    const prisma = createPrismaMock()
    prisma.accountingPeriod.findUnique.mockResolvedValue({
      ...periodRow,
      periodKey: "2026-01",
    })

    await expect(buildOpeningBalanceReviewForPeriod(prisma, periodId)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    })
  })
})
