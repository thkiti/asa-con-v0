import fs from "fs"
import path from "path"
import { PaymentMethod, Prisma, ProductType } from "@/generated/prisma/client"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { sumCogsFromLedgerIssues } from "@/lib/pos/checkout-finance"
import { checkout } from "@/lib/pos/checkout"
import {
  sumInboundValueFromLedger,
  sumOutboundValueFromLedger,
} from "@/lib/stock/posting-finance"
import { postDocument } from "@/lib/stock/posting"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import {
  createCheckoutMockTx,
  type CheckoutMockState,
} from "../pos/mock-checkout-tx"
import { mockResolvedRetailPrice } from "../pos/helpers/mock-retail-price"
import { createPostingMockTx } from "../stock/posting/mock-posting-tx"

jest.mock("@/lib/pricing/resolve-pos-retail-price", () => ({
  resolvePosRetailPrice: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    branch: { findUnique: jest.fn() },
    product: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/finance/config", () => ({
  isFinancePostingEnabled: jest.fn(),
}))

jest.mock("@/lib/finance/posting", () => ({
  postSaleVoucher: jest.fn(),
  postStockDocumentVoucher: jest.fn(),
}))

import { isFinancePostingEnabled } from "@/lib/finance/config"
import { postSaleVoucher, postStockDocumentVoucher } from "@/lib/finance/posting"
import { resolvePosRetailPrice } from "@/lib/pricing/resolve-pos-retail-price"
import { prisma } from "@/lib/shared/prisma"

const resolveMock = resolvePosRetailPrice as jest.Mock

const ROOT = path.join(__dirname, "..", "..", "..")

const WIRED_FILES = [
  "lib/pos/checkout.ts",
  "lib/pos/checkout-finance.ts",
  "lib/stock/posting.ts",
  "lib/stock/posting-finance.ts",
]

const FORBIDDEN_IMPORT_PATTERN =
  /from ['"]@\/lib\/finance\/(account-map|voucher|journal|validation)|resolveAccountsFor|createVoucherWithLines|createJournalForVoucher|postOperationalVoucher/

const DIRECT_ENV_PATTERN = /process\.env\.FINANCE_POSTING_ENABLED/

const branchId = "branch-1"
const productId = "p-tracked"
const trackedProduct = {
  id: productId,
  productType: ProductType.TRACKED,
  deleted: false,
}

function seedTrackedStock(
  state: CheckoutMockState,
  qty: number,
  avgCost: number
) {
  const key = `${branchId}:${productId}`
  state.stocks.set(key, {
    id: "stock-1",
    branchId,
    productId,
    qty,
    avgCost: new Prisma.Decimal(avgCost),
  })
  state.layers.push({
    id: "layer-1",
    branchId,
    productId,
    qty,
    qtyRemain: qty,
    unitCost: new Prisma.Decimal(avgCost),
    refType: null,
    refId: null,
    createdAt: new Date("2026-01-01"),
  })
}

function stockDoc(
  partial: Partial<StockDocumentWithLines> &
    Pick<StockDocumentWithLines, "docType" | "status">
): StockDocumentWithLines {
  return {
    id: "doc-1",
    refNo: "REF-1",
    date: new Date("2026-01-15"),
    branchId: "branch-owner",
    periodMonth: null,
    fromLocId: "branch-from",
    toLocId: "branch-to",
    submittedAt: null,
    confirmedAt: null,
    postedAt: null,
    createdByStaffId: null,
    confirmedByStaffId: null,
    postedByStaffId: null,
    createdAt: new Date("2026-01-01"),
    lines: [],
    ...partial,
  }
}

describe("finance operational wiring import boundary", () => {
  for (const rel of WIRED_FILES) {
    it(`${rel} has no forbidden finance imports`, () => {
      const source = fs.readFileSync(path.join(ROOT, rel), "utf8")
      expect(source.match(FORBIDDEN_IMPORT_PATTERN)).toBeNull()
    })
  }

  it("orchestrators do not read FINANCE_POSTING_ENABLED directly", () => {
    for (const rel of ["lib/pos/checkout.ts", "lib/stock/posting.ts"]) {
      const source = fs.readFileSync(path.join(ROOT, rel), "utf8")
      expect(source.match(DIRECT_ENV_PATTERN)).toBeNull()
    }
  })
})

describe("isFinancePostingEnabled", () => {
  const { isFinancePostingEnabled: realIsFinancePostingEnabled } =
    jest.requireActual<typeof import("@/lib/finance/config")>("@/lib/finance/config")

  const original = process.env.FINANCE_POSTING_ENABLED

  afterEach(() => {
    if (original === undefined) delete process.env.FINANCE_POSTING_ENABLED
    else process.env.FINANCE_POSTING_ENABLED = original
  })

  it("defaults to false when unset", () => {
    delete process.env.FINANCE_POSTING_ENABLED
    expect(realIsFinancePostingEnabled()).toBe(false)
  })

  it("returns true only for literal 'true'", () => {
    process.env.FINANCE_POSTING_ENABLED = "true"
    expect(realIsFinancePostingEnabled()).toBe(true)
    process.env.FINANCE_POSTING_ENABLED = "1"
    expect(realIsFinancePostingEnabled()).toBe(false)
  })
})

describe("operational wiring — checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.branch.findUnique as jest.Mock).mockResolvedValue({
      id: branchId,
      deleted: false,
      isActive: true,
    })
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(false)
    ;(postSaleVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      alreadyPosted: false,
    })
    resolveMock.mockResolvedValue(mockResolvedRetailPrice(50))
  })

  function setupCheckoutTx(initial?: Parameters<typeof createCheckoutMockTx>[0]) {
    const { tx, state } = createCheckoutMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )
    return { tx, state }
  }

  function setupCheckoutTxWithRollback(
    initial?: Parameters<typeof createCheckoutMockTx>[0]
  ) {
    const { tx, state } = createCheckoutMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => {
        const snapshot = {
          sales: [...state.sales],
          saleItems: [...state.saleItems],
          transactions: [...state.transactions],
        }
        try {
          return await fn(tx)
        } catch (err) {
          state.sales = snapshot.sales
          state.saleItems = snapshot.saleItems
          state.transactions = snapshot.transactions
          throw err
        }
      }
    )
    return { tx, state }
  }

  it("flag OFF: checkout succeeds and postSaleVoucher is not called", async () => {
    const { state } = setupCheckoutTx()
    seedTrackedStock(state, 5, 10)

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 50,
      lines: [{ productId, qty: 1 }],
    })

    expect(state.sales.length).toBe(1)
    expect(postSaleVoucher).not.toHaveBeenCalled()
  })

  it("flag ON: postSaleVoucher called with same tx object", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const { tx, state } = setupCheckoutTx()
    seedTrackedStock(state, 5, 10)

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 50,
      lines: [{ productId, qty: 1 }],
    })

    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
    const payload = (postSaleVoucher as jest.Mock).mock.calls[0][0]
    expect(payload.tx).toBe(tx)
  })

  it("finance throw: outer transaction rejects with no partial Sale commit", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    ;(postSaleVoucher as jest.Mock).mockRejectedValue(
      new FinancePostingError("period closed", "PERIOD_CLOSED")
    )
    const { state } = setupCheckoutTxWithRollback()
    seedTrackedStock(state, 5, 10)

    await expect(
      checkout({
        branchId,
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 50,
        lines: [{ productId, qty: 1 }],
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
    expect(state.sales.length).toBe(0)
    expect(state.saleItems.length).toBe(0)
    expect(state.transactions.length).toBe(0)
  })
})

describe("operational wiring — postDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(false)
    ;(postStockDocumentVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      alreadyPosted: false,
    })
  })

  function setupPostingTx(initial: StockDocumentWithLines) {
    const mock = createPostingMockTx(initial)
    const { tx, state, getDocument } = mock
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )
    return { tx, state, getDocument }
  }

  function setupPostingTxWithRollback(initial: StockDocumentWithLines) {
    const mock = createPostingMockTx(initial)
    const { tx, state, getDocument, restoreDocument } = mock
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => {
        const snapshot = {
          document: structuredClone(getDocument()),
          transactions: [...state.transactions],
        }
        try {
          return await fn(tx)
        } catch (err) {
          restoreDocument(snapshot.document)
          state.transactions = snapshot.transactions
          throw err
        }
      }
    )
    return { tx, state, getDocument }
  }

  it("flag OFF: postDocument succeeds and postStockDocumentVoucher is not called", async () => {
    const initial = stockDoc({
      docType: "PURCHASE",
      status: "RECEIVED",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 2,
          endingQty: null,
          reviewPostingDelta: null,
        },
      ],
    })
    const { getDocument } = setupPostingTx(initial)

    const result = await postDocument({
      documentId: "doc-1",
      postedByStaffId: "staff-1",
    })

    expect(postStockDocumentVoucher).not.toHaveBeenCalled()
    expect(result.document.status).toBe("POSTED")
    expect(getDocument().status).toBe("POSTED")
  })

  it("flag ON: still does not call postStockDocumentVoucher (inventory finance retired)", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const initial = stockDoc({
      docType: "PURCHASE",
      status: "RECEIVED",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 3,
          endingQty: null,
          reviewPostingDelta: null,
        },
      ],
    })
    const { state } = setupPostingTx(initial)

    await postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })

    expect(postStockDocumentVoucher).not.toHaveBeenCalled()
    expect(state.transactions.length).toBe(0)
  })

  it("posts without StockTransaction regardless of finance flag", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const initial = stockDoc({
      docType: "PURCHASE",
      status: "RECEIVED",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 2,
          endingQty: null,
          reviewPostingDelta: null,
        },
      ],
    })
    const { getDocument, state } = setupPostingTxWithRollback(initial)

    await postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })

    expect(getDocument().status).toBe("POSTED")
    expect(state.transactions.length).toBe(0)
    expect(postStockDocumentVoucher).not.toHaveBeenCalled()
  })
})

describe("operational wiring — ledger ownership", () => {
  it("sumCogsFromLedgerIssues uses qtyOut × unitCost from ledger rows", () => {
    const ledgerRows = [
      { qtyOut: 2, unitCost: new Prisma.Decimal("12.50") },
      { qtyOut: 1, unitCost: new Prisma.Decimal("8.00") },
    ]
    const retailTotal = 2 * 99 + 1 * 50

    const cogs = sumCogsFromLedgerIssues(ledgerRows)

    expect(cogs.toNumber()).toBe(33)
    expect(cogs.toNumber()).not.toBe(retailTotal)
  })

  it("sumInboundValueFromLedger uses ledger qtyIn × unitCost only", () => {
    const inbound = sumInboundValueFromLedger([
      { qtyIn: 3, qtyOut: 0, unitCost: new Prisma.Decimal("12.50") },
      { qtyIn: 2, qtyOut: 0, unitCost: new Prisma.Decimal("8.00") },
    ])
    const retailTotal = 3 * 99 + 2 * 50

    expect(inbound.toNumber()).toBe(53.5)
    expect(inbound.toNumber()).not.toBe(retailTotal)
    expect(
      sumInboundValueFromLedger([
        { qtyIn: 0, qtyOut: 5, unitCost: new Prisma.Decimal("999") },
      ]).toNumber()
    ).toBe(0)
  })

  it("sumOutboundValueFromLedger uses ledger qtyOut × unitCost only", () => {
    const outbound = sumOutboundValueFromLedger([
      { qtyIn: 0, qtyOut: 2, unitCost: new Prisma.Decimal("10") },
      { qtyIn: 0, qtyOut: 1, unitCost: new Prisma.Decimal("7.5") },
    ])
    const retailTotal = 2 * 99 + 1 * 50

    expect(outbound.toNumber()).toBe(27.5)
    expect(outbound.toNumber()).not.toBe(retailTotal)
    expect(
      sumOutboundValueFromLedger([
        { qtyIn: 4, qtyOut: 0, unitCost: new Prisma.Decimal("999") },
      ]).toNumber()
    ).toBe(0)
  })
})