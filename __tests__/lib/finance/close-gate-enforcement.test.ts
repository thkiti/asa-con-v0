jest.mock("@/lib/finance/reconciliation-snapshot", () => {
  const actual = jest.requireActual("@/lib/finance/reconciliation-snapshot")
  return {
    ...actual,
    findSnapshotsForPeriod: jest.fn(),
    createManualSnapshot: jest.fn(),
  }
})

jest.mock("@/lib/finance/reconciliation-snapshot-capture", () => ({
  captureReconciliationSnapshotPayload: jest.fn(),
}))

jest.mock("@/lib/finance/reconciliation", () => ({
  ...jest.requireActual("@/lib/finance/reconciliation"),
  runFinanceReconciliation: jest.fn(),
}))

jest.mock("@/lib/finance/posting", () => ({
  ...jest.requireActual("@/lib/finance/posting"),
  postOperationalVoucher: jest.fn(),
  postSaleVoucher: jest.fn(),
  postStockDocumentVoucher: jest.fn(),
}))

import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  assertCloseReadiness,
  buildCloseBlockerError,
  toCloseGateErrorPayload,
} from "@/lib/finance/close-gate"
import { CloseGateError } from "@/lib/finance/close-gate-errors"
import { STRICT_CLOSE_GATE_POLICY } from "@/lib/finance/close-gate-policy"
import { closeAccountingPeriod } from "@/lib/finance/period-close"
import {
  postOperationalVoucher,
  postSaleVoucher,
  postStockDocumentVoucher,
} from "@/lib/finance/posting"
import { runFinanceReconciliation } from "@/lib/finance/reconciliation"
import { captureReconciliationSnapshotPayload } from "@/lib/finance/reconciliation-snapshot-capture"
import {
  createManualSnapshot,
  findSnapshotsForPeriod,
} from "@/lib/finance/reconciliation-snapshot"
import { createFinanceMockTx } from "./mock-finance-tx"

const mockFindSnapshots = findSnapshotsForPeriod as jest.MockedFunction<
  typeof findSnapshotsForPeriod
>
const mockCreateManualSnapshot = createManualSnapshot as jest.MockedFunction<
  typeof createManualSnapshot
>
const mockCapturePayload = captureReconciliationSnapshotPayload as jest.MockedFunction<
  typeof captureReconciliationSnapshotPayload
>
const mockRunReconciliation = runFinanceReconciliation as jest.MockedFunction<
  typeof runFinanceReconciliation
>
const mockPostOperational = postOperationalVoucher as jest.MockedFunction<
  typeof postOperationalVoucher
>
const mockPostSale = postSaleVoucher as jest.MockedFunction<typeof postSaleVoucher>
const mockPostStock = postStockDocumentVoucher as jest.MockedFunction<
  typeof postStockDocumentVoucher
>

const branchId = "branch-1"
const periodKey = "2026-05"

const defaultClosedBy = {
  staffId: "staff-1",
  name: "Finance Admin",
  role: "HO_FINANCE",
}

function readySnapshots() {
  return {
    latest: {
      id: "snap-1",
      kind: "MANUAL" as const,
      branchId,
      fromDate: "2026-05-01",
      toDate: "2026-05-31",
      periodKey,
      label: null,
      checkedSales: 0,
      checkedStockDocuments: 0,
      issueCount: 0,
      dashboardRowCount: 2,
      matchedCount: 2,
      varianceCount: 0,
      totalVarianceAmount: "0.00",
      payloadVersion: 1 as const,
      createdAt: "2026-05-27T12:00:00.000Z",
      createdByStaffId: "staff-1",
      note: null,
      payload: {
        inventoryResult: {
          filter: {},
          operationalTotalValue: "0",
          glInventoryBalance: "0",
          variances: [],
        },
        salesResult: {
          filter: {},
          operationalRevenue: "0",
          glRevenueBalance: "0",
          paymentBreakdown: [],
          variances: [],
        },
        dashboardRows: [
          {
            id: "inv",
            sourceType: "inventory" as const,
            reference: "Inventory",
            branchId,
            periodLabel: periodKey,
            expectedAmount: "0",
            actualAmount: "0",
            variance: "0",
            status: "MATCHED" as const,
            domain: "inventory" as const,
            raw: {
              domain: "inventory" as const,
              label: "Inventory",
              operationalAmount: "0",
              glAmount: "0",
              variance: "0",
            },
          },
          {
            id: "rev",
            sourceType: "revenue" as const,
            reference: "Revenue",
            branchId,
            periodLabel: periodKey,
            expectedAmount: "0",
            actualAmount: "0",
            variance: "0",
            status: "MATCHED" as const,
            domain: "revenue" as const,
            raw: {
              domain: "revenue" as const,
              label: "Revenue",
              operationalAmount: "0",
              glAmount: "0",
              variance: "0",
            },
          },
        ],
        issuesPayload: {
          filter: {},
          checkedSales: 0,
          checkedStockDocuments: 0,
          issueCount: 0,
          issues: [],
        },
      },
    },
    prior: null,
  }
}

async function seedOpenPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  bId: string,
  pKey: string
) {
  return tx.accountingPeriod.create({
    data: { branchId: bId, periodKey: pKey, legalEntityCode: "AS", status: AccountingPeriodStatus.OPEN },
  })
}

function expectNoCloseSideEffects() {
  expect(mockCreateManualSnapshot).not.toHaveBeenCalled()
  expect(mockCapturePayload).not.toHaveBeenCalled()
  expect(mockRunReconciliation).not.toHaveBeenCalled()
  expect(mockPostOperational).not.toHaveBeenCalled()
  expect(mockPostSale).not.toHaveBeenCalled()
  expect(mockPostStock).not.toHaveBeenCalled()
}

describe("close gate enforcement guarantees", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindSnapshots.mockResolvedValue(readySnapshots())
  })

  describe("BLOCKED rejection and rollback", () => {
    it("rejects HARD close when readiness is BLOCKED and leaves period OPEN", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)
      mockFindSnapshots.mockResolvedValue({ latest: null, prior: null })
      const updateSpy = jest.spyOn(tx.accountingPeriod, "update")

      await expect(
        closeAccountingPeriod(tx, {
          branchId,
          periodKey,
          mode: "HARD",
          closedBy: defaultClosedBy,
        })
      ).rejects.toBeInstanceOf(CloseGateError)

      await expect(
        closeAccountingPeriod(tx, {
          branchId,
          periodKey,
          mode: "HARD",
          closedBy: defaultClosedBy,
        })
      ).rejects.toMatchObject({
        code: "CLOSE_SNAPSHOT_REQUIRED",
        readinessStatus: "BLOCKED",
        blockers: expect.arrayContaining([
          expect.objectContaining({ id: "snapshot-missing", severity: "BLOCKED" }),
        ]),
      })

      expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.OPEN)
      expect(state.accountingPeriods[0]?.closedAt).toBeNull()
      expect(state.accountingPeriodCloseEvidence).toHaveLength(0)
      expect(updateSpy).not.toHaveBeenCalled()
      expectNoCloseSideEffects()
      updateSpy.mockRestore()
    })

    it("builds structured CloseGateError payload for API mapping", async () => {
      const { buildCloseReadinessChecklistForPeriod } = await import(
        "@/lib/finance/close-readiness"
      )
      mockFindSnapshots.mockResolvedValue({ latest: null, prior: null })

      const checklist = await buildCloseReadinessChecklistForPeriod(
        {
          reconciliationSnapshot: {},
          branch: { findFirst: jest.fn() },
          accountingPeriod: {
            findUnique: jest.fn(async () => ({ id: "period-1" })),
          },
          glAccount: { findMany: jest.fn(async () => []) },
          journalEntryLine: { findMany: jest.fn(async () => []) },
          voucher: { findMany: jest.fn(async () => []) },
          journalEntry: { findMany: jest.fn(async () => []) },
        } as never,
        {
          id: "period-1",
          branchId,
          legalEntityCode: "AS",
          periodKey,
          status: AccountingPeriodStatus.OPEN,
          closedAt: null,
        }
      )

      const err = buildCloseBlockerError({ checklist })
      expect(toCloseGateErrorPayload(err)).toEqual({
        error: err.message,
        code: err.code,
        readinessStatus: err.readinessStatus,
        blockers: err.blockers,
      })
    })
  })

  describe("WARNING default behavior", () => {
    it("allows HARD close when only WARNING checklist items remain", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)
      mockFindSnapshots.mockResolvedValue({
        ...readySnapshots(),
        latest: {
          ...readySnapshots().latest!,
          createdAt: "2026-04-01T12:00:00.000Z",
        },
      })

      const closed = await closeAccountingPeriod(tx, {
        branchId,
        periodKey,
        mode: "HARD",
        closedBy: defaultClosedBy,
      })

      expect(closed.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
      expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
      expect(state.accountingPeriodCloseEvidence).toHaveLength(1)
      expect(state.accountingPeriodCloseEvidence[0]).toMatchObject({
        periodId: closed.id,
        closedByStaffId: defaultClosedBy.staffId,
        closedByName: defaultClosedBy.name,
        closedByRole: defaultClosedBy.role,
        reconciliationSnapshotId: "snap-1",
      })
      expectNoCloseSideEffects()
    })
  })

  describe("STRICT policy warning rejection", () => {
    it("rejects WARNING readiness when strict policy is applied at gate", () => {
      const checklist = {
        status: "WARNING" as const,
        blockerCount: 0,
        warningCount: 1,
        items: [
          {
            id: "snapshot-stale",
            group: "snapshot_evidence" as const,
            severity: "WARNING" as const,
            title: "Snapshot may be stale",
            detail: "stale",
          },
        ],
        latestSnapshotRef: null,
        metrics: {
          issueCount: 0,
          varianceCount: 0,
          matchedCount: 0,
          dashboardRowCount: 0,
          totalVarianceAmount: null,
          missingGlIssueCount: 0,
          missingSourceIssueCount: 0,
          inventoryDomainPresent: false,
          revenueDomainPresent: false,
          snapshotAgeDays: null,
          compareDriftDetected: false,
        },
        period: {
          id: "period-1",
          branchId,
          periodKey,
          status: AccountingPeriodStatus.OPEN,
          closedAt: null,
        },
      }

      expect(() => assertCloseReadiness(checklist, STRICT_CLOSE_GATE_POLICY)).toThrow(
        CloseGateError
      )

      try {
        assertCloseReadiness(checklist, STRICT_CLOSE_GATE_POLICY)
      } catch (err) {
        expect(err).toMatchObject({
          code: "CLOSE_READINESS_FAILED",
          readinessStatus: "WARNING",
        })
      }
    })
  })

  describe("HARD_CLOSED idempotent path", () => {
    it("returns existing period without re-running readiness on repeat HARD close", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      const first = await closeAccountingPeriod(tx, {
        branchId,
        periodKey,
        mode: "HARD",
        closedBy: defaultClosedBy,
      })
      mockFindSnapshots.mockClear()

      const second = await closeAccountingPeriod(tx, {
        branchId,
        periodKey,
        mode: "HARD",
        closedBy: defaultClosedBy,
      })

      expect(second.id).toBe(first.id)
      expect(second.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
      expect(mockFindSnapshots).not.toHaveBeenCalled()
      expect(state.accountingPeriodCloseEvidence).toHaveLength(1)
      expectNoCloseSideEffects()
    })
  })

  describe("SOFT close remains ungated", () => {
    it("closes OPEN period without readiness lookup or gate evaluation", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      const closed = await closeAccountingPeriod(tx, {
        branchId,
        periodKey,
        mode: "SOFT",
      })

      expect(closed.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
      expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
      expect(mockFindSnapshots).not.toHaveBeenCalled()
      expectNoCloseSideEffects()
    })
  })

  describe("no mutation side effects during close gate", () => {
    it("does not create snapshots, export evidence, post vouchers, or run reconciliation on blocked HARD close", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)
      mockFindSnapshots.mockResolvedValue({ latest: null, prior: null })

      await expect(
        closeAccountingPeriod(tx, {
          branchId,
          periodKey,
          mode: "HARD",
          closedBy: defaultClosedBy,
        })
      ).rejects.toBeInstanceOf(CloseGateError)

      expect(state.vouchers).toHaveLength(0)
      expect(state.accountingPeriodCloseEvidence).toHaveLength(0)
      expectNoCloseSideEffects()
    })

    it("does not create snapshots, export evidence, post vouchers, or run reconciliation on successful HARD close", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      await closeAccountingPeriod(tx, {
        branchId,
        periodKey,
        mode: "HARD",
        closedBy: defaultClosedBy,
      })

      expect(state.vouchers).toHaveLength(0)
      expect(state.accountingPeriodCloseEvidence).toHaveLength(1)
      expectNoCloseSideEffects()
    })

    it("only reads frozen snapshots via findSnapshotsForPeriod during HARD close", async () => {
      const { tx } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      await closeAccountingPeriod(tx, {
        branchId,
        periodKey,
        mode: "HARD",
        closedBy: defaultClosedBy,
      })

      expect(mockFindSnapshots).toHaveBeenCalledTimes(1)
      expect(mockFindSnapshots).toHaveBeenCalledWith(tx, { branchId, periodKey })
      expect(mockRunReconciliation).not.toHaveBeenCalled()
    })

  })

  describe("SOFT close evidence", () => {
    it("does not create close evidence on SOFT close", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      await closeAccountingPeriod(tx, {
        branchId,
        periodKey,
        mode: "SOFT",
      })

      expect(state.accountingPeriodCloseEvidence).toHaveLength(0)
    })
  })
})
