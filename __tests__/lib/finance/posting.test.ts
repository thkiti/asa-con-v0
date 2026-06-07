import fs from "fs"
import path from "path"
import { AccountingPeriodStatus, PaymentMethod, Prisma } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  postOperationalVoucher,
  postRefundVoucher,
  postSaleVoucher,
} from "@/lib/finance/posting"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { createFinanceMockTx } from "./mock-finance-tx"

const ROOT = path.join(__dirname, "..", "..", "..")
const FINANCE_SOURCES = [
  "lib/finance/posting.ts",
  "lib/finance/voucher.ts",
  "lib/finance/journal.ts",
  "lib/finance/account-map.ts",
  "lib/finance/validation.ts",
  "lib/finance/decimal.ts",
  "lib/finance/posting-types.ts",
  "lib/finance/posting-errors.ts",
  "lib/finance/index.ts",
]

async function seedOpenPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  branchId: string,
  date: Date
) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  await tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey: `${y}-${m}`,
      status: AccountingPeriodStatus.OPEN,
    },
  })
}

describe("finance posting", () => {
  it("creates exactly one journal entry per voucher", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, "branch-1", new Date("2026-05-15T12:00:00.000Z"))
    const cash = state.glAccounts.find((a) => a.code === "1100")!
    const revenue = state.glAccounts.find((a) => a.code === "4000")!

    await postOperationalVoucher({
      tx,
      branchId: "branch-1",
      date: new Date("2026-05-15T12:00:00.000Z"),
      refType: FINANCE_REF_TYPES.POS_SALE,
      refId: "sale-1",
      lines: [
        { glAccountId: cash.id, debit: new Prisma.Decimal("50"), credit: new Prisma.Decimal("0") },
        { glAccountId: revenue.id, debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("50") },
      ],
    })

    expect(state.vouchers).toHaveLength(1)
    expect(state.journalEntries).toHaveLength(1)
    expect(state.journalEntries[0]?.voucherId).toBe(state.vouchers[0]?.id)
  })

  it("joins caller tx without nested prisma.$transaction in posting modules", () => {
    for (const rel of ["lib/finance/posting.ts", "lib/finance/voucher.ts", "lib/finance/journal.ts"]) {
      const source = fs.readFileSync(path.join(ROOT, rel), "utf8")
      expect(source).not.toMatch(/\.\$transaction\b/)
    }
  })

  it("is idempotent on refType + refId", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, "branch-1", new Date("2026-05-15T12:00:00.000Z"))
    const input = {
      tx,
      branchId: "branch-1",
      date: new Date("2026-05-15T12:00:00.000Z"),
      refType: FINANCE_REF_TYPES.STOCK_DOC_POST,
      refId: "doc-1",
      lines: [] as { glAccountId: string; debit: Prisma.Decimal; credit: Prisma.Decimal }[],
    }

    const cash = state.glAccounts.find((a) => a.code === "1100")!
    const revenue = state.glAccounts.find((a) => a.code === "4000")!
    input.lines = [
      { glAccountId: cash.id, debit: new Prisma.Decimal("20"), credit: new Prisma.Decimal("0") },
      { glAccountId: revenue.id, debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("20") },
    ]

    const first = await postOperationalVoucher(input)
    const second = await postOperationalVoucher(input)

    expect(second.alreadyPosted).toBe(true)
    expect(second.voucherId).toBe(first.voucherId)
    expect(state.vouchers).toHaveLength(1)
    expect(state.journalEntries).toHaveLength(1)
  })

  it("requires tx for postOperationalVoucher", async () => {
    await expect(
      postOperationalVoucher({
        tx: undefined as unknown as Prisma.TransactionClient,
        branchId: "b",
        date: new Date(),
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "x",
        lines: [],
      })
    ).rejects.toThrow(FinancePostingError)
  })

  it("posts refund voucher using refund.id ref", async () => {
    const { tx, state } = createFinanceMockTx()
    const createdAt = new Date("2026-05-20T14:00:00.000Z")
    await seedOpenPeriod(tx, "branch-1", createdAt)
    const result = await postRefundVoucher({
      tx,
      refund: {
        id: "refund-uuid-1",
        branchId: "branch-1",
        refundNo: "REF-SH001-202605-0001",
        amount: "50",
        createdAt,
      },
      paymentMethod: PaymentMethod.CASH,
    })

    expect(result.voucherId).toBeTruthy()
    const voucher = state.vouchers[0]
    expect(voucher?.refId).toBe("refund-uuid-1")
    expect(voucher?.refType).toBe(FINANCE_REF_TYPES.POS_REFUND)
    expect(voucher?.refNo).toBe("REF-SH001-202605-0001")
  })

  it("is idempotent for postRefundVoucher on refType + refId", async () => {
    const { tx, state } = createFinanceMockTx()
    const createdAt = new Date("2026-05-20T14:00:00.000Z")
    await seedOpenPeriod(tx, "branch-1", createdAt)
    const input = {
      tx,
      refund: {
        id: "refund-uuid-2",
        branchId: "branch-1",
        refundNo: "REF-SH001-202605-0002",
        amount: "30",
        createdAt,
      },
      paymentMethod: PaymentMethod.CASH,
    }
    const first = await postRefundVoucher(input)
    const second = await postRefundVoucher(input)
    expect(second.alreadyPosted).toBe(true)
    expect(second.voucherId).toBe(first.voucherId)
    expect(state.vouchers).toHaveLength(1)
  })

  it("posts sale voucher using sale.id ref", async () => {
    const { tx, state } = createFinanceMockTx()
    const now = new Date()
    await seedOpenPeriod(tx, "branch-1", now)
    const result = await postSaleVoucher({
      tx,
      sale: {
        id: "sale-uuid-1",
        branchId: "branch-1",
        total: "100",
        paymentMethod: PaymentMethod.CASH,
      },
      ledgerResult: { cogsAmount: "30" },
    })

    expect(result.voucherId).toBeTruthy()
    const voucher = state.vouchers[0]
    expect(voucher?.refId).toBe("sale-uuid-1")
    expect(voucher?.refType).toBe(FINANCE_REF_TYPES.POS_SALE)
  })

  it("finance sources do not mutate stock or sales", () => {
    const forbidden = [
      /issueStock\s*\(/,
      /receiveStock\s*\(/,
      /\.stock\.(update|create|upsert|delete)/,
      /sale\.(create|update|upsert|delete)/,
    ]
    for (const rel of FINANCE_SOURCES) {
      const source = fs.readFileSync(path.join(ROOT, rel), "utf8")
      for (const pattern of forbidden) {
        expect({ file: rel, pattern: pattern.toString() }).toEqual(
          expect.objectContaining({ file: rel })
        )
        expect(source.match(pattern)).toBeNull()
      }
    }
  })
})