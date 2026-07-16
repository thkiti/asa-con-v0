import { Prisma } from "@/generated/prisma/client"
import {
  createBankStatement,
  updateBankStatement,
} from "@/lib/finance/bank-statement/bank-statement-save"
import { BankStatementErrorCodes } from "@/lib/finance/bank-statement"

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

describe("createBankStatement statementNo allocation", () => {
  const baseInput = {
    legalEntityCode: "AS",
    statementDate: "2026-01-31",
    openingBalance: "100.00",
    closingBalance: "100.00",
    status: "NEW" as const,
  }

  function createPrismaMock(options: {
    existingNos?: string[]
    findManyWhereCapture?: Array<unknown>
    duplicateId?: string | null
    createImpl?: (args: {
      data: { statementNo: string; bankAccountId: string; periodKey: string }
    }) => Promise<{ id: string }>
  }) {
    const existingNos = options.existingNos ?? []
    const findMany = jest.fn().mockImplementation(async ({ where }: { where: unknown }) => {
      options.findManyWhereCapture?.push(where)
      return existingNos.map((statementNo) => ({ statementNo }))
    })

    return {
      bankAccount: {
        findFirst: jest.fn().mockResolvedValue({ id: "bank-1" }),
      },
      bankStatement: {
        findMany,
        findUnique: jest.fn().mockResolvedValue(
          options.duplicateId ? { id: options.duplicateId } : null
        ),
        create:
          options.createImpl ??
          jest.fn().mockResolvedValue({ id: "created-1" }),
      },
    }
  }

  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockResolvedValue({ id: "created-1", statementNo: "BS-2026-01-001" })
  })

  it("allocates 001 then 002 for two bank accounts in the same period", async () => {
    const findManyWhereCapture: unknown[] = []
    const createdNos: string[] = []

    const prisma = createPrismaMock({
      existingNos: [],
      findManyWhereCapture,
      createImpl: async ({ data }) => {
        createdNos.push(data.statementNo)
        return { id: `created-${createdNos.length}` }
      },
    })

    mockGet.mockResolvedValueOnce({ id: "created-1", statementNo: "BS-2026-01-001" })
    await createBankStatement(prisma, {
      ...baseInput,
      bankAccountId: "bank-a",
      periodKey: "2026-01",
    })

    prisma.bankStatement.findMany.mockImplementation(async ({ where }: { where: unknown }) => {
      findManyWhereCapture.push(where)
      return [{ statementNo: "BS-2026-01-001" }]
    })
    mockGet.mockResolvedValueOnce({ id: "created-2", statementNo: "BS-2026-01-002" })
    await createBankStatement(prisma, {
      ...baseInput,
      bankAccountId: "bank-b",
      periodKey: "2026-01",
    })

    expect(createdNos).toEqual(["BS-2026-01-001", "BS-2026-01-002"])
    expect(findManyWhereCapture).toEqual([
      { legalEntityCode: "AS", periodKey: "2026-01" },
      { legalEntityCode: "AS", periodKey: "2026-01" },
    ])
    expect(findManyWhereCapture.every((where) => !("bankAccountId" in (where as object)))).toBe(
      true
    )
  })

  it("starts each period from 001 independently", async () => {
    const createdNos: string[] = []
    const prisma = createPrismaMock({
      createImpl: async ({ data }) => {
        createdNos.push(data.statementNo)
        return { id: `created-${createdNos.length}` }
      },
    })

    prisma.bankStatement.findMany.mockResolvedValueOnce([])
    mockGet.mockResolvedValueOnce({ id: "created-1", statementNo: "BS-2026-01-001" })
    await createBankStatement(prisma, {
      ...baseInput,
      bankAccountId: "bank-a",
      periodKey: "2026-01",
    })

    prisma.bankStatement.findMany.mockResolvedValueOnce([])
    mockGet.mockResolvedValueOnce({ id: "created-2", statementNo: "BS-2026-12-001" })
    await createBankStatement(prisma, {
      ...baseInput,
      bankAccountId: "bank-a",
      periodKey: "2026-12",
      statementDate: "2026-12-31",
    })

    expect(createdNos).toEqual(["BS-2026-01-001", "BS-2026-12-001"])
  })

  it("allocates max suffix + 1 when gaps exist (001 and 003 → 004)", async () => {
    const prisma = createPrismaMock({
      existingNos: ["BS-2026-01-001", "BS-2026-01-003", "OTHER-001", "BS-2026-01-x"],
    })
    const create = prisma.bankStatement.create as jest.Mock
    mockGet.mockResolvedValue({ id: "created-1", statementNo: "BS-2026-01-004" })

    await createBankStatement(prisma, {
      ...baseInput,
      bankAccountId: "bank-b",
      periodKey: "2026-01",
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statementNo: "BS-2026-01-004" }),
      })
    )
  })

  it("returns the existing duplicate error for an explicit statementNo collision", async () => {
    const prisma = createPrismaMock({
      duplicateId: "existing-stmt",
    })

    await expect(
      createBankStatement(prisma, {
        ...baseInput,
        bankAccountId: "bank-b",
        periodKey: "2026-01",
        statementNo: "BS-2026-01-001",
      })
    ).rejects.toMatchObject({
      name: "BankStatementError",
      message: "Statement number already exists for this legal entity",
      code: BankStatementErrorCodes.DUPLICATE,
      status: 409,
    })

    expect(prisma.bankStatement.create).not.toHaveBeenCalled()
    expect(prisma.bankStatement.findMany).not.toHaveBeenCalled()
  })

  it("surfaces the account+period unique constraint when the same bank account and period already exist", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    })
    Object.defineProperty(p2002, "meta", {
      value: { target: ["legalEntityCode", "bankAccountId", "periodKey"] },
      enumerable: true,
    })

    const prisma = createPrismaMock({
      existingNos: [],
      createImpl: async () => {
        throw p2002
      },
    })

    await expect(
      createBankStatement(prisma, {
        ...baseInput,
        bankAccountId: "bank-a",
        periodKey: "2026-01",
      })
    ).rejects.toBe(p2002)

    expect(p2002.code).toBe("P2002")
    expect(p2002.meta).toEqual({
      target: ["legalEntityCode", "bankAccountId", "periodKey"],
    })
  })
})
