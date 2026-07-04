import { Prisma } from "@/generated/prisma/client"
import { updateBankStatement } from "@/lib/finance/bank-statement/bank-statement-save"

jest.mock("@/lib/finance/bank-statement/bank-statement-read", () => ({
  getBankStatementById: jest.fn(),
}))

import { getBankStatementById as mockGetById } from "@/lib/finance/bank-statement/bank-statement-read"

const mockGet = mockGetById as jest.Mock

describe("updateBankStatement lines", () => {
  const statementId = "stmt-1"
  const existing = {
    id: statementId,
    status: "DRAFT" as const,
    statementNo: "BS-2026-01-001",
  }

  it("persists lines via replaceLines and returns detail from read", async () => {
    const createdLines: unknown[] = []

    const tx = {
      bankStatement: {
        update: jest.fn().mockResolvedValue({}),
      },
      bankStatementLine: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockImplementation(({ data }) => {
          createdLines.push(...data)
          return Promise.resolve({ count: data.length })
        }),
      },
    }

    const prisma = {
      bankStatement: {
        findFirst: jest.fn().mockResolvedValue({
          ...existing,
          statementDate: new Date("2026-01-31T00:00:00.000Z"),
        }),
        findUnique: jest.fn(),
      },
      bankAccount: { findFirst: jest.fn() },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
    }

    mockGet.mockResolvedValue({
      id: statementId,
      legalEntityCode: "AD",
      openingBalance: "908539.12",
      closingBalance: "638317.53",
      lines: [
        {
          id: "line-1",
          lineNo: 1,
          transactionDate: "2026-01-30",
          description: "Deposit",
          chequeNumber: null,
          depositAmount: "220289.49",
          withdrawalAmount: null,
          runningBalance: "638317.53",
        },
      ],
      validation: {
        isValid: true,
        openingBalance: "908539.12",
        totalDeposits: "220289.49",
        totalWithdrawals: "490511.08",
        computedClosingBalance: "638317.53",
        declaredClosingBalance: "638317.53",
        message: "ok",
      },
    })

    const result = await updateBankStatement(prisma, {
      id: statementId,
      legalEntityCode: "AD",
      lines: [
        {
          lineNo: 1,
          transactionDate: "2026-01-30",
          description: "Deposit",
          depositAmount: "220289.49",
          withdrawalAmount: null,
          runningBalance: "638317.53",
        },
      ],
    })

    expect(tx.bankStatementLine.deleteMany).toHaveBeenCalledWith({
      where: { bankStatementId: statementId },
    })
    expect(tx.bankStatementLine.createMany).toHaveBeenCalledTimes(1)
    expect(createdLines).toHaveLength(1)
    expect(createdLines[0]).toMatchObject({
      bankStatementId: statementId,
      lineNo: 1,
      description: "Deposit",
      depositAmount: new Prisma.Decimal("220289.49"),
      withdrawalAmount: null,
      runningBalance: new Prisma.Decimal("638317.53"),
    })
    expect(mockGet).toHaveBeenCalledWith(tx, {
      id: statementId,
      legalEntityCode: "AD",
    })
    expect(result.lines).toHaveLength(1)
    expect(result.validation.totalDeposits).toBe("220289.49")
  })

  it("persists amount-only quick entry lines without description", async () => {
    const createdLines: unknown[] = []

    const tx = {
      bankStatement: {
        update: jest.fn().mockResolvedValue({}),
      },
      bankStatementLine: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockImplementation(({ data }) => {
          createdLines.push(...data)
          return Promise.resolve({ count: data.length })
        }),
      },
    }

    const prisma = {
      bankStatement: {
        findFirst: jest.fn().mockResolvedValue({
          ...existing,
          statementDate: new Date("2026-01-31T00:00:00.000Z"),
        }),
        findUnique: jest.fn(),
      },
      bankAccount: { findFirst: jest.fn() },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
    }

    mockGet.mockResolvedValue({
      id: statementId,
      legalEntityCode: "AD",
      statementDate: "2026-01-31",
      lines: [
        {
          id: "line-1",
          lineNo: 1,
          transactionDate: "2026-01-31",
          description: "",
          chequeNumber: null,
          depositAmount: "150.00",
          withdrawalAmount: null,
          runningBalance: "0.00",
        },
      ],
      validation: {
        isValid: false,
        totalDeposits: "150.00",
        totalWithdrawals: "0.00",
      },
    })

    await updateBankStatement(prisma, {
      id: statementId,
      legalEntityCode: "AD",
      lines: [
        {
          lineNo: 1,
          transactionDate: "",
          description: "",
          depositAmount: "150.00",
          withdrawalAmount: null,
          runningBalance: "0",
        },
      ],
    })

    expect(createdLines[0]).toMatchObject({
      description: "",
      depositAmount: new Prisma.Decimal("150.00"),
    })
  })

  it("persists withdrawal-only quick entry lines", async () => {
    const createdLines: unknown[] = []

    const tx = {
      bankStatement: {
        update: jest.fn().mockResolvedValue({}),
      },
      bankStatementLine: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockImplementation(({ data }) => {
          createdLines.push(...data)
          return Promise.resolve({ count: data.length })
        }),
      },
    }

    const prisma = {
      bankStatement: {
        findFirst: jest.fn().mockResolvedValue({
          ...existing,
          statementDate: new Date("2026-01-31T00:00:00.000Z"),
        }),
        findUnique: jest.fn(),
      },
      bankAccount: { findFirst: jest.fn() },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
    }

    mockGet.mockResolvedValue({
      id: statementId,
      lines: [
        {
          id: "line-1",
          lineNo: 1,
          transactionDate: "2026-01-31",
          description: "",
          chequeNumber: null,
          depositAmount: null,
          withdrawalAmount: "75.50",
          runningBalance: "0.00",
        },
      ],
    })

    const result = await updateBankStatement(prisma, {
      id: statementId,
      legalEntityCode: "AD",
      statementDate: "2026-01-31",
      lines: [
        {
          lineNo: 1,
          transactionDate: "",
          description: "",
          depositAmount: null,
          withdrawalAmount: "75.50",
          runningBalance: "0",
        },
      ],
    })

    expect(createdLines[0]).toMatchObject({
      description: "",
      depositAmount: null,
      withdrawalAmount: new Prisma.Decimal("75.50"),
    })
    expect(result.lines[0]?.withdrawalAmount).toBe("75.50")
  })
})
