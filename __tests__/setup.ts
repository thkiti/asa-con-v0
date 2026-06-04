if (typeof globalThis.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util")
  globalThis.TextEncoder = TextEncoder
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
}

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
    MarketType: {
      SERVICES: "SERVICES",
      OUTSIDERS: "OUTSIDERS",
    },
    PricingClass: {
      MATERIAL: "MATERIAL",
      MACHINERY: "MACHINERY",
      CONSUMABLE: "CONSUMABLE",
    },
    RoundingMode: {
      NONE: "NONE",
      CENT_01: "CENT_01",
      CENT_05: "CENT_05",
      BAHT_1: "BAHT_1",
      BAHT_10: "BAHT_10",
      BAHT_100: "BAHT_100",
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
    AccountingPeriodReopenRequestStatus: {
      PENDING: "PENDING",
      REJECTED: "REJECTED",
      CANCELLED: "CANCELLED",
      EXECUTED: "EXECUTED",
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
      SHIPPED: "SHIPPED",
      CONFIRMED: "CONFIRMED",
      RECEIVED: "RECEIVED",
      POSTED: "POSTED",
      TRANSFERRED: "TRANSFERRED",
      CANCELLED: "CANCELLED",
    },
    Role: {
      HO_FINANCE: "HO_FINANCE",
      HO_ADMIN: "HO_ADMIN",
      HO_OPERATIONS: "HO_OPERATIONS",
      SH_STAFF: "SH_STAFF",
    },
    BranchType: {
      SH: "SH",
      HO: "HO",
    },
  }
})
