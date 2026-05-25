import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  canManagePeriodStatus,
  canOverridePeriod,
  canPostToPeriod,
  classifyPeriodStatus,
  ClosePolicyError,
  requireOpenPeriodForPosting,
} from "@/lib/finance/close-policy"

describe("close-policy", () => {
  describe("canManagePeriodStatus", () => {
    it("allows HO_FINANCE and HO_ADMIN only", () => {
      expect(canManagePeriodStatus("HO_FINANCE")).toBe(true)
      expect(canManagePeriodStatus("HO_ADMIN")).toBe(true)
      expect(canManagePeriodStatus("ROUTINE")).toBe(false)
    })
  })

  describe("canPostToPeriod", () => {
    it("allows all roles when OPEN", () => {
      expect(canPostToPeriod(AccountingPeriodStatus.OPEN, "ROUTINE", false)).toBe(true)
      expect(canPostToPeriod(AccountingPeriodStatus.OPEN, "HO_FINANCE", false)).toBe(true)
      expect(canPostToPeriod(AccountingPeriodStatus.OPEN, "HO_ADMIN", false)).toBe(true)
    })

    it("blocks ROUTINE on SOFT_CLOSED", () => {
      expect(canPostToPeriod(AccountingPeriodStatus.SOFT_CLOSED, "ROUTINE", false)).toBe(
        false
      )
      expect(canPostToPeriod(AccountingPeriodStatus.SOFT_CLOSED, "ROUTINE", true)).toBe(
        false
      )
    })

    it("allows finance/admin override on SOFT_CLOSED with reason", () => {
      expect(
        canPostToPeriod(AccountingPeriodStatus.SOFT_CLOSED, "HO_FINANCE", true)
      ).toBe(true)
      expect(
        canPostToPeriod(AccountingPeriodStatus.SOFT_CLOSED, "HO_ADMIN", true)
      ).toBe(true)
      expect(
        canPostToPeriod(AccountingPeriodStatus.SOFT_CLOSED, "HO_FINANCE", false)
      ).toBe(false)
    })

    it("blocks ROUTINE and HO_FINANCE on HARD_CLOSED", () => {
      expect(canPostToPeriod(AccountingPeriodStatus.HARD_CLOSED, "ROUTINE", false)).toBe(
        false
      )
      expect(canPostToPeriod(AccountingPeriodStatus.HARD_CLOSED, "ROUTINE", true)).toBe(
        false
      )
      expect(
        canPostToPeriod(AccountingPeriodStatus.HARD_CLOSED, "HO_FINANCE", true)
      ).toBe(false)
    })

    it("allows HO_ADMIN with reason on HARD_CLOSED", () => {
      expect(
        canPostToPeriod(AccountingPeriodStatus.HARD_CLOSED, "HO_ADMIN", true)
      ).toBe(true)
      expect(
        canPostToPeriod(AccountingPeriodStatus.HARD_CLOSED, "HO_ADMIN", false)
      ).toBe(false)
    })
  })

  describe("canOverridePeriod", () => {
    it("returns false for OPEN", () => {
      expect(canOverridePeriod(AccountingPeriodStatus.OPEN, "HO_FINANCE", true)).toBe(
        false
      )
    })

    it("allows finance/admin on SOFT_CLOSED with reason", () => {
      expect(
        canOverridePeriod(AccountingPeriodStatus.SOFT_CLOSED, "HO_FINANCE", true)
      ).toBe(true)
      expect(
        canOverridePeriod(AccountingPeriodStatus.SOFT_CLOSED, "HO_ADMIN", true)
      ).toBe(true)
    })

    it("allows only HO_ADMIN on HARD_CLOSED with reason", () => {
      expect(
        canOverridePeriod(AccountingPeriodStatus.HARD_CLOSED, "HO_ADMIN", true)
      ).toBe(true)
      expect(
        canOverridePeriod(AccountingPeriodStatus.HARD_CLOSED, "HO_FINANCE", true)
      ).toBe(false)
    })
  })

  describe("classifyPeriodStatus", () => {
    it("returns descriptive labels", () => {
      expect(classifyPeriodStatus(AccountingPeriodStatus.OPEN).label).toBe("Open")
      expect(classifyPeriodStatus(AccountingPeriodStatus.SOFT_CLOSED).label).toBe(
        "Soft closed"
      )
      expect(classifyPeriodStatus(AccountingPeriodStatus.HARD_CLOSED).label).toBe(
        "Hard closed"
      )
    })
  })

  describe("requireOpenPeriodForPosting", () => {
    it("passes for OPEN routine posting", () => {
      expect(() =>
        requireOpenPeriodForPosting(
          { status: AccountingPeriodStatus.OPEN, periodKey: "2026-05" },
          { role: "ROUTINE" }
        )
      ).not.toThrow()
    })

    it("passes for finance override on SOFT_CLOSED", () => {
      expect(() =>
        requireOpenPeriodForPosting(
          { status: AccountingPeriodStatus.SOFT_CLOSED },
          { role: "HO_FINANCE", overrideReason: "Month-end adjustment" }
        )
      ).not.toThrow()
    })

    it("throws for routine posting on SOFT_CLOSED", () => {
      expect(() =>
        requireOpenPeriodForPosting(
          { status: AccountingPeriodStatus.SOFT_CLOSED },
          { role: "ROUTINE" }
        )
      ).toThrow(ClosePolicyError)
    })

    it("throws for finance on HARD_CLOSED", () => {
      expect(() =>
        requireOpenPeriodForPosting(
          { status: AccountingPeriodStatus.HARD_CLOSED },
          { role: "HO_FINANCE", overrideReason: "Adjustment" }
        )
      ).toThrow(ClosePolicyError)
    })
  })
})
