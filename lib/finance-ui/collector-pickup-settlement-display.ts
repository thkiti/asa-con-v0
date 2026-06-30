import type { CollectorPickupSettlementStatus } from "./collector-pickup-settlement"
import type { BankDepositSettlementStatus } from "./bank-deposit-settlement"
import {
  themeBadgeOrange,
  themeBadgeSuccess,
  themeBadgeWarning,
} from "@/lib/finance-ui/finance-visual-classes"
import type { PayInEvidenceUiStatus } from "./pay-in-display"
import { isPayInEvidenceUploadedStatus } from "./pay-in-display"

export type CollectorPickupBusinessStatus =
  | "COLLECTED"
  | "NEEDS REPAIR"
  | "NOT COLLECTED"

export function mapCollectorPickupBusinessStatus(
  status: CollectorPickupSettlementStatus
): CollectorPickupBusinessStatus {
  switch (status) {
    case "POSTED":
      return "COLLECTED"
    case "NOT_POSTED":
    case "VARIANCE":
      return "NEEDS REPAIR"
    case "INVALID_SOURCE":
    default:
      return "NOT COLLECTED"
  }
}

export function isPayInSlipUploaded(input: {
  archiveAvailable?: boolean | null
  payInEvidenceStatus?: PayInEvidenceUiStatus | null
}): boolean {
  if (input.archiveAvailable === true) return true
  return isPayInEvidenceUploadedStatus(input.payInEvidenceStatus)
}

export function isEligibleForPayInEvidenceUpload(input: {
  pickupStatus: CollectorPickupSettlementStatus
  depositStatus: BankDepositSettlementStatus
  archiveAvailable?: boolean | null
  payInEvidenceStatus?: PayInEvidenceUiStatus | null
}): boolean {
  return (
    input.pickupStatus === "POSTED" &&
    input.depositStatus === "NOT_POSTED" &&
    !isPayInSlipUploaded({
      archiveAvailable: input.archiveAvailable,
      payInEvidenceStatus: input.payInEvidenceStatus,
    })
  )
}

export function shouldShowDepositPostButton(input: {
  pickupStatus: CollectorPickupSettlementStatus
  depositStatus: BankDepositSettlementStatus
  payInEvidenceStatus: PayInEvidenceUiStatus | null
  archiveAvailable?: boolean | null
}): boolean {
  return (
    input.pickupStatus === "POSTED" &&
    input.depositStatus === "NOT_POSTED" &&
    isPayInSlipUploaded({
      archiveAvailable: input.archiveAvailable,
      payInEvidenceStatus: input.payInEvidenceStatus,
    })
  )
}

export function shouldShowDepositPostDisabled(input: {
  pickupStatus: CollectorPickupSettlementStatus
  depositStatus: BankDepositSettlementStatus
  payInEvidenceStatus: PayInEvidenceUiStatus | null
  archiveAvailable?: boolean | null
}): boolean {
  return (
    input.pickupStatus === "POSTED" &&
    input.depositStatus === "NOT_POSTED" &&
    !isPayInSlipUploaded({
      archiveAvailable: input.archiveAvailable,
      payInEvidenceStatus: input.payInEvidenceStatus,
    })
  )
}

export const PAY_IN_EVIDENCE_MISSING_TOOLTIP =
  "Upload bank pay-in evidence before posting deposit."

export function depositColumnLabel(input: {
  depositStatus: BankDepositSettlementStatus
}): "POST" | "POSTED" | null {
  if (input.depositStatus === "POSTED") return "POSTED"
  if (
    input.depositStatus === "NOT_POSTED" ||
    input.depositStatus === "NOT_ELIGIBLE" ||
    input.depositStatus === "VARIANCE"
  ) {
    return "POST"
  }
  return null
}

/** Secondary repair — not shown in normal table flow by default */
export function shouldShowPickupRepairButton(
  status: CollectorPickupSettlementStatus
): boolean {
  return status === "NOT_POSTED" || status === "VARIANCE"
}

export function collectorPickupBusinessStatusTone(
  status: CollectorPickupBusinessStatus
): string {
  switch (status) {
    case "COLLECTED":
      return themeBadgeSuccess
    case "NEEDS REPAIR":
      return themeBadgeWarning
    case "NOT COLLECTED":
      return themeBadgeOrange
  }
}
