import { Prisma as PrismaNamespace } from "@/generated/prisma/client"
import {
  allocateInvoiceVoucherNo,
} from "@/lib/finance/invoice-voucher/invoice-voucher-allocate-no"
import {
  allocateManualJournalEntryNo,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-allocate-no"
import {
  allocatePaymentVoucherNo,
} from "@/lib/finance/payment-voucher/payment-voucher-allocate-no"
import {
  allocatePettyCashVoucherNo,
} from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-allocate-no"
import {
  allocateRevenueVoucherNo,
} from "@/lib/finance/revenue-voucher/revenue-voucher-allocate-no"

/**
 * Regression: AS and AD may share the same business document number string
 * (e.g. MJV-260001) because uniqueness is scoped by legalEntityCode.
 */
describe("finance document number entity scope regression", () => {
  const documentDate = new Date("2026-06-14T12:00:00.000Z")

  function createFinanceTx(seed: {
    manualJournal?: string[]
    payment?: string[]
    pettyCash?: string[]
    revenue?: string[]
    invoice?: string[]
  }) {
    const filterByEntity = (
      rows: Array<{ legalEntityCode: string; entryNo: string }>,
      where: { legalEntityCode: string; entryNo?: { startsWith: string } }
    ) =>
      rows
        .filter(
          (row) =>
            row.legalEntityCode === where.legalEntityCode &&
            (!where.entryNo?.startsWith ||
              row.entryNo.startsWith(where.entryNo.startsWith))
        )
        .map((row) => ({ entryNo: row.entryNo }))

    const manualRows = (seed.manualJournal ?? []).flatMap((entryNo) => [
      { legalEntityCode: "AD", entryNo, entryType: "MANUAL" as const },
    ])
    const paymentRows = (seed.payment ?? []).flatMap((entryNo) => [
      { legalEntityCode: "AD", entryNo },
    ])
    const pettyRows = (seed.pettyCash ?? []).flatMap((entryNo) => [
      { legalEntityCode: "AD", entryNo },
    ])
    const revenueRows = (seed.revenue ?? []).flatMap((entryNo) => [
      { legalEntityCode: "AD", entryNo },
    ])
    const invoiceRows = (seed.invoice ?? []).flatMap((entryNo) => [
      { legalEntityCode: "AD", entryNo },
    ])

    return {
      manualJournalEntry: {
        findMany: jest.fn(async ({ where }: {
          where: {
            legalEntityCode: string
            entryType: string
            entryNo?: { startsWith: string }
          }
        }) =>
          filterByEntity(
            manualRows.map((row) => ({
              legalEntityCode: row.legalEntityCode,
              entryNo: row.entryNo,
            })),
            where
          )
        ),
      },
      paymentVoucher: {
        findMany: jest.fn(async ({ where }: {
          where: { legalEntityCode: string; entryNo?: { startsWith: string } }
        }) => filterByEntity(paymentRows, where)),
      },
      pettyCashVoucher: {
        findMany: jest.fn(async ({ where }: {
          where: { legalEntityCode: string; entryNo?: { startsWith: string } }
        }) => filterByEntity(pettyRows, where)),
      },
      revenueVoucher: {
        findMany: jest.fn(async ({ where }: {
          where: { legalEntityCode: string; entryNo?: { startsWith: string } }
        }) => filterByEntity(revenueRows, where)),
      },
      invoiceVoucher: {
        findMany: jest.fn(async ({ where }: {
          where: { legalEntityCode: string; entryNo?: { startsWith: string } }
        }) => filterByEntity(invoiceRows, where)),
      },
    }
  }

  it.each([
    ["MJV-260001", allocateManualJournalEntryNo, "manualJournalEntry", { entryType: "MANUAL" as const, entryDate: documentDate }],
    ["PAV-260001", allocatePaymentVoucherNo, "paymentVoucher", { entryDate: documentDate }],
    ["PCV-260001", allocatePettyCashVoucherNo, "pettyCashVoucher", { entryDate: documentDate }],
    ["REV-260001", allocateRevenueVoucherNo, "revenueVoucher", { entryDate: documentDate }],
    ["INV-260001", allocateInvoiceVoucherNo, "invoiceVoucher", { invoiceDate: documentDate }],
  ] as const)(
    "AS may allocate %s when AD already holds the same number",
    async (expectedNo, allocator, tableKey, extraInput) => {
      const seedKey =
        tableKey === "manualJournalEntry"
          ? "manualJournal"
          : tableKey === "paymentVoucher"
            ? "payment"
            : tableKey === "pettyCashVoucher"
              ? "pettyCash"
              : tableKey === "revenueVoucher"
                ? "revenue"
                : "invoice"

      const tx = createFinanceTx({
        [seedKey]: [expectedNo],
      })

      const no = await allocator(tx as never, {
        legalEntityCode: "AS",
        ...extraInput,
      } as never)

      expect(no).toBe(expectedNo)
    }
  )

  it("createWithAllocatedEntryNoRetry retries on composite unique races", async () => {
    const { createWithAllocatedEntryNoRetry, isPrismaUniqueConstraintError } =
      await import("@/lib/finance/document-number-allocation")

    const p2002 = new PrismaNamespace.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "test" }
    )

    expect(isPrismaUniqueConstraintError(p2002)).toBe(true)

    let attempts = 0
    const result = await createWithAllocatedEntryNoRetry({
      maxAttempts: 3,
      allocate: async () => {
        attempts += 1
        return attempts === 1 ? "PAV-260001" : "PAV-260002"
      },
      create: async (entryNo) => {
        if (entryNo === "PAV-260001") throw p2002
        return { entryNo }
      },
      allocationFailedError: () => new Error("failed"),
    })

    expect(result).toEqual({ entryNo: "PAV-260002" })
    expect(attempts).toBe(2)
  })
})
