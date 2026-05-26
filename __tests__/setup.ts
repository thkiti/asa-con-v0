const { Decimal } = require("@prisma/client/runtime/client")

jest.mock("@/generated/prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    code
    clientVersion
    constructor(message, { code, clientVersion }) {
      super(message)
      this.name = "PrismaClientKnownRequestError"
      this.code = code
      this.clientVersion = clientVersion
    }
  }
  return {
    Prisma: {
      Decimal,
      PrismaClientKnownRequestError,
    },
    ProductType: {
      TRACKED: "TRACKED",
      CONSUMABLE: "CONSUMABLE",
    },
    PaymentMethod: {
      CASH: "CASH",
      CARD: "CARD",
      QR: "QR",
      TRANSFER: "TRANSFER",
      OTHER: "OTHER",
    },
    LedgerSkipReason: {
      CONSUMABLE: "CONSUMABLE",
    },
    SaleStatus: {
      COMPLETED: "COMPLETED",
    },
    GlAccountType: {
      ASSET: "ASSET",
      LIABILITY: "LIABILITY",
      EQUITY: "EQUITY",
      REVENUE: "REVENUE",
      EXPENSE: "EXPENSE",
    },
    VoucherStatus: {
      DRAFT: "DRAFT",
      POSTED: "POSTED",
      VOIDED: "VOIDED",
    },
    AccountingPeriodStatus: {
      OPEN: "OPEN",
      SOFT_CLOSED: "SOFT_CLOSED",
      HARD_CLOSED: "HARD_CLOSED",
    },
    DocType: {
      PURCHASE: "PURCHASE",
      TRANSFER_OUT: "TRANSFER_OUT",
      TRANSFER_IN: "TRANSFER_IN",
      ADJUSTMENT: "ADJUSTMENT",
      PERFORMANCE: "PERFORMANCE",
    },
    DocStatus: {
      DRAFT: "DRAFT",
      SUBMITTED: "SUBMITTED",
      CONFIRMED: "CONFIRMED",
      POSTED: "POSTED",
      VOID: "VOID",
    },
  }
})
