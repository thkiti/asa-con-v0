import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { FINANCE_UAT_MANUAL_REF_TYPES } from "./finance-uat-scopes"

/** GL ref types removed by the full finance workflow reset (excludes POS/stock). */
export const FINANCE_FULL_RESET_REF_TYPES: string[] = [
  ...FINANCE_UAT_MANUAL_REF_TYPES,
  FINANCE_REF_TYPES.PAYMENT_VOUCHER,
  FINANCE_REF_TYPES.PETTY_CASH_VOUCHER,
  FINANCE_REF_TYPES.REVENUE_VOUCHER,
]

export const FINANCE_FULL_RESET_CONFIRM_TOKEN = "FINANCE_RESET_CONFIRMED"

/** Physical table presence — Prisma models may exist before migration is applied. */
export type FinanceFullResetTablePresence = {
  paymentVoucher: boolean
  revenueVoucher: boolean
  pettyCashVoucher: boolean
}

export type FinanceFullResetCounts = {
  manualJournalEntry: number
  manualJournalEntryLine: number
  paymentVoucher: number
  paymentVoucherLine: number
  revenueVoucher: number
  revenueVoucherLine: number
  pettyCashVoucher: number
  pettyCashVoucherLine: number
  voucher: number
  voucherLine: number
  journalEntry: number
  journalEntryLine: number
  postedOpbSkipped: number
  pdfArtifacts: string[]
}

export type PreservedMasterCounts = {
  legalEntity: number
  branch: number
  glAccount: number
  accountingPeriod: number
  staff: number
  product: number
  sale: number
  stockDocument: number
  documentCounter: number
}

export type FinanceFullResetPreflight = {
  postedOpb: Array<{
    id: string
    entryNo: string
    postedVoucherId: string | null
    pdfPath: string | null
  }>
  postedNonOpbMje: number
  postedPaymentVoucher: number
  postedRevenueVoucher: number
  postedPettyCashVoucher: number
}

export type FinanceFullResetOptions = {
  execute: boolean
  confirm: string
  includePostedOpb: boolean
}

export function parseDatabaseTarget(connectionString: string): {
  host: string
  database: string
  maskedUrl: string
  isLocalhost: boolean
} {
  try {
    const url = new URL(connectionString)
    const host = url.hostname
    const database = url.pathname.replace(/^\//, "") || "(default)"
    const maskedUrl = connectionString.replace(
      /:([^:@/]+)@/,
      ":***@"
    )
    const isLocalhost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1"
    return { host, database, maskedUrl, isLocalhost }
  } catch {
    return {
      host: "(unparseable)",
      database: "(unparseable)",
      maskedUrl: "(invalid DATABASE_URL)",
      isLocalhost: false,
    }
  }
}

export async function financeTableExists(
  queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>,
  table: string
): Promise<boolean> {
  const rows = (await queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS exists`) as { exists: boolean }[]
  return rows[0]?.exists ?? false
}

async function countOptionalTable(
  exists: boolean,
  countFn: () => Promise<number>
): Promise<number> {
  if (!exists) return 0
  return countFn()
}

export async function countPreservedMaster(
  prisma: {
    legalEntity: { count: () => Promise<number> }
    branch: { count: (args: unknown) => Promise<number> }
    glAccount: { count: (args: unknown) => Promise<number> }
    accountingPeriod: { count: () => Promise<number> }
    staff: { count: (args: unknown) => Promise<number> }
    product: { count: (args: unknown) => Promise<number> }
    sale: { count: () => Promise<number> }
    stockDocument: { count: () => Promise<number> }
    documentCounter: { count: () => Promise<number> }
  }
): Promise<PreservedMasterCounts> {
  const [
    legalEntity,
    branch,
    glAccount,
    accountingPeriod,
    staff,
    product,
    sale,
    stockDocument,
    documentCounter,
  ] = await Promise.all([
    prisma.legalEntity.count(),
    prisma.branch.count({ where: { deleted: false } }),
    prisma.glAccount.count({ where: { deleted: false } }),
    prisma.accountingPeriod.count(),
    prisma.staff.count({ where: { deleted: false } }),
    prisma.product.count({ where: { deleted: false } }),
    prisma.sale.count(),
    prisma.stockDocument.count(),
    prisma.documentCounter.count(),
  ])
  return {
    legalEntity,
    branch,
    glAccount,
    accountingPeriod,
    staff,
    product,
    sale,
    stockDocument,
    documentCounter,
  }
}

export async function runFinanceFullResetPreflight(
  prisma: {
    manualJournalEntry: {
      findMany: (args: unknown) => Promise<
        Array<{
          id: string
          entryNo: string
          postedVoucherId: string | null
          pdfPath: string | null
        }>
      >
      count: (args: unknown) => Promise<number>
    }
    paymentVoucher: { count: (args: unknown) => Promise<number> }
    revenueVoucher?: { count: (args: unknown) => Promise<number> }
    pettyCashVoucher?: { count: (args: unknown) => Promise<number> }
    $queryRaw: (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => Promise<unknown>
  },
  tablePresence: FinanceFullResetTablePresence
): Promise<FinanceFullResetPreflight> {
  const [postedOpb, postedNonOpbMje, postedPaymentVoucher, postedRevenueVoucher, postedPettyCashVoucher] =
    await Promise.all([
      prisma.manualJournalEntry.findMany({
        where: { entryType: "OPENING_BALANCE", status: "POSTED" },
        select: {
          id: true,
          entryNo: true,
          postedVoucherId: true,
          pdfPath: true,
        },
      }),
      prisma.manualJournalEntry.count({
        where: {
          status: "POSTED",
          entryType: { not: "OPENING_BALANCE" },
        },
      }),
      tablePresence.paymentVoucher
        ? prisma.paymentVoucher.count({ where: { status: "POSTED" } })
        : Promise.resolve(0),
      tablePresence.revenueVoucher && prisma.revenueVoucher
        ? prisma.revenueVoucher.count({ where: { status: "POSTED" } })
        : Promise.resolve(0),
      tablePresence.pettyCashVoucher && prisma.pettyCashVoucher
        ? prisma.pettyCashVoucher.count({ where: { status: "POSTED" } })
        : Promise.resolve(0),
    ])

  return {
    postedOpb,
    postedNonOpbMje,
    postedPaymentVoucher,
    postedRevenueVoucher,
    postedPettyCashVoucher,
  }
}

export function assertNoPostedNonOpbDocuments(
  preflight: FinanceFullResetPreflight
): void {
  const problems: string[] = []
  if (preflight.postedNonOpbMje > 0) {
    problems.push(`${preflight.postedNonOpbMje} POSTED ManualJournalEntry (non-OPB)`)
  }
  if (preflight.postedPaymentVoucher > 0) {
    problems.push(`${preflight.postedPaymentVoucher} POSTED PaymentVoucher`)
  }
  if (preflight.postedRevenueVoucher > 0) {
    problems.push(`${preflight.postedRevenueVoucher} POSTED RevenueVoucher`)
  }
  if (preflight.postedPettyCashVoucher > 0) {
    problems.push(`${preflight.postedPettyCashVoucher} POSTED PettyCashVoucher`)
  }
  if (problems.length > 0) {
    throw new Error(
      `Refusing reset: unexpected POSTED finance documents exist — ${problems.join("; ")}`
    )
  }
}

export async function countFinanceFullResetTargets(
  prisma: {
    manualJournalEntry: {
      count: (args?: unknown) => Promise<number>
      findMany: (args: unknown) => Promise<Array<{ pdfPath: string | null }>>
    }
    manualJournalEntryLine: { count: (args?: unknown) => Promise<number> }
    paymentVoucher?: { count: (args?: unknown) => Promise<number> }
    paymentVoucherLine?: { count: () => Promise<number> }
    revenueVoucher?: { count: (args?: unknown) => Promise<number> }
    revenueVoucherLine?: { count: () => Promise<number> }
    pettyCashVoucher?: { count: (args?: unknown) => Promise<number> }
    pettyCashVoucherLine?: { count: () => Promise<number> }
    voucher: { count: (args: unknown) => Promise<number> }
    voucherLine: { count: (args: unknown) => Promise<number> }
    journalEntry: { count: (args: unknown) => Promise<number> }
    journalEntryLine: { count: (args: unknown) => Promise<number> }
  },
  refTypes: string[],
  options: {
    includePostedOpb: boolean
    postedOpbIds: string[]
    postedOpbVoucherIds: string[]
    tablePresence: FinanceFullResetTablePresence
  }
): Promise<FinanceFullResetCounts> {
  const mjeWhere = options.includePostedOpb
    ? undefined
    : {
        NOT: {
          entryType: "OPENING_BALANCE",
          status: "POSTED",
        },
      }

  const voucherWhere = {
    refType: { in: refTypes },
    ...(options.includePostedOpb || options.postedOpbVoucherIds.length === 0
      ? {}
      : { id: { notIn: options.postedOpbVoucherIds } }),
  }

  const mjeLineWhere = mjeWhere
    ? { manualJournalEntry: mjeWhere }
    : undefined

  const [
    manualJournalEntry,
    manualJournalEntryLine,
    paymentVoucher,
    paymentVoucherLine,
    revenueVoucher,
    revenueVoucherLine,
    pettyCashVoucher,
    pettyCashVoucherLine,
    voucher,
    voucherLine,
    journalEntry,
    journalEntryLine,
    pdfRows,
    postedOpbSkipped,
  ] = await Promise.all([
    prisma.manualJournalEntry.count(
      mjeWhere ? { where: mjeWhere } : undefined
    ),
    prisma.manualJournalEntryLine.count(
      mjeLineWhere ? { where: mjeLineWhere } : undefined
    ),
    countOptionalTable(
      options.tablePresence.paymentVoucher,
      () => prisma.paymentVoucher!.count()
    ),
    countOptionalTable(
      options.tablePresence.paymentVoucher,
      () => prisma.paymentVoucherLine!.count()
    ),
    countOptionalTable(
      options.tablePresence.revenueVoucher,
      () => prisma.revenueVoucher!.count()
    ),
    countOptionalTable(
      options.tablePresence.revenueVoucher,
      () => prisma.revenueVoucherLine!.count()
    ),
    countOptionalTable(
      options.tablePresence.pettyCashVoucher,
      () => prisma.pettyCashVoucher!.count()
    ),
    countOptionalTable(
      options.tablePresence.pettyCashVoucher,
      () => prisma.pettyCashVoucherLine!.count()
    ),
    prisma.voucher.count({ where: voucherWhere }),
    prisma.voucherLine.count({
      where: { voucher: voucherWhere },
    }),
    prisma.journalEntry.count({ where: { voucher: voucherWhere } }),
    prisma.journalEntryLine.count({
      where: { journalEntry: { voucher: voucherWhere } },
    }),
    prisma.manualJournalEntry.findMany({
      where: {
        pdfPath: { not: null },
        ...(mjeWhere ?? {}),
      },
      select: { pdfPath: true },
    }),
    options.includePostedOpb
      ? Promise.resolve(0)
      : prisma.manualJournalEntry.count({
          where: { entryType: "OPENING_BALANCE", status: "POSTED" },
        }),
  ])

  return {
    manualJournalEntry,
    manualJournalEntryLine,
    paymentVoucher,
    paymentVoucherLine,
    revenueVoucher,
    revenueVoucherLine,
    pettyCashVoucher,
    pettyCashVoucherLine,
    voucher,
    voucherLine,
    journalEntry,
    journalEntryLine,
    postedOpbSkipped,
    pdfArtifacts: pdfRows
      .map((r) => r.pdfPath)
      .filter((p): p is string => Boolean(p)),
  }
}

type ResetTx = {
  manualJournalEntry: {
    updateMany: (args: unknown) => Promise<unknown>
    deleteMany: (args?: unknown) => Promise<unknown>
  }
  paymentVoucher?: { updateMany: (args: unknown) => Promise<unknown>; deleteMany: (args?: unknown) => Promise<unknown> }
  revenueVoucher?: { updateMany: (args: unknown) => Promise<unknown>; deleteMany: (args?: unknown) => Promise<unknown> }
  pettyCashVoucher?: { updateMany: (args: unknown) => Promise<unknown>; deleteMany: (args?: unknown) => Promise<unknown> }
  voucher: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>
    deleteMany: (args: unknown) => Promise<unknown>
  }
  journalEntry: { deleteMany: (args: unknown) => Promise<unknown> }
}

export async function executeFinanceFullReset(
  tx: ResetTx,
  refTypes: string[],
  options: {
    includePostedOpb: boolean
    postedOpbIds: string[]
    postedOpbVoucherIds: string[]
    tablePresence: FinanceFullResetTablePresence
  }
): Promise<void> {
  const voucherWhere = {
    refType: { in: refTypes },
    ...(options.includePostedOpb || options.postedOpbVoucherIds.length === 0
      ? {}
      : { id: { notIn: options.postedOpbVoucherIds } }),
  }

  const voucherIds = (
    await tx.voucher.findMany({
      where: voucherWhere,
      select: { id: true },
    })
  ).map((v) => v.id)

  const clearPostedLinks = async (
    present: boolean,
    model:
      | ResetTx["paymentVoucher"]
      | ResetTx["revenueVoucher"]
      | ResetTx["pettyCashVoucher"]
  ) => {
    if (!present || !model || voucherIds.length === 0) return
    await model.updateMany({
      where: { postedVoucherId: { in: voucherIds } },
      data: {
        postedVoucherId: null,
        postedJournalEntryId: null,
      },
    })
  }

  if (voucherIds.length > 0) {
    await tx.manualJournalEntry.updateMany({
      where: {
        OR: [
          { postedVoucherId: { in: voucherIds } },
          { postedJournalEntry: { voucherId: { in: voucherIds } } },
          { reversalJournalEntry: { voucherId: { in: voucherIds } } },
        ],
      },
      data: {
        postedVoucherId: null,
        postedJournalEntryId: null,
        reversalJournalEntryId: null,
      },
    })

    await clearPostedLinks(
      options.tablePresence.paymentVoucher,
      tx.paymentVoucher
    )
    await clearPostedLinks(
      options.tablePresence.revenueVoucher,
      tx.revenueVoucher
    )
    await clearPostedLinks(
      options.tablePresence.pettyCashVoucher,
      tx.pettyCashVoucher
    )

    await tx.journalEntry.deleteMany({
      where: {
        reversalOfJournalEntryId: { not: null },
        voucherId: { in: voucherIds },
      },
    })
    await tx.journalEntry.deleteMany({
      where: { voucherId: { in: voucherIds } },
    })
    await tx.voucher.deleteMany({ where: { id: { in: voucherIds } } })
  }

  const mjeDeleteWhere = options.includePostedOpb
    ? undefined
    : {
        NOT: {
          entryType: "OPENING_BALANCE",
          status: "POSTED",
        },
      }

  await tx.manualJournalEntry.deleteMany(
    mjeDeleteWhere ? { where: mjeDeleteWhere } : undefined
  )

  if (options.tablePresence.paymentVoucher && tx.paymentVoucher) {
    await tx.paymentVoucher.deleteMany({})
  }
  if (options.tablePresence.revenueVoucher && tx.revenueVoucher) {
    await tx.revenueVoucher.deleteMany({})
  }
  if (options.tablePresence.pettyCashVoucher && tx.pettyCashVoucher) {
    await tx.pettyCashVoucher.deleteMany({})
  }
}

export function validateFinanceFullResetExecute(
  options: FinanceFullResetOptions,
  preflight: FinanceFullResetPreflight
): void {
  assertNoPostedNonOpbDocuments(preflight)

  if (!options.execute) return

  if (options.confirm !== FINANCE_FULL_RESET_CONFIRM_TOKEN) {
    throw new Error(
      `Refusing execute: pass --confirm=${FINANCE_FULL_RESET_CONFIRM_TOKEN}`
    )
  }

  if (preflight.postedOpb.length > 0 && !options.includePostedOpb) {
    throw new Error(
      `Refusing execute: ${preflight.postedOpb.length} POSTED opening balance document(s) exist. ` +
        `Pass --include-posted-opb to delete them (e.g. ${preflight.postedOpb.map((o) => o.entryNo).join(", ")}).`
    )
  }
}
