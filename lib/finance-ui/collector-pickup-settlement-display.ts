import type { CollectorPickupSettlementStatus } from "./collector-pickup-settlement"
import type { BankDepositSettlementStatus } from "./bank-deposit-settlement"
import { isPayInEvidenceUploadedStatus, type PayInEvidenceUiStatus } from "./pay-in-display"

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

export function isPayInSlipUploaded(
  status: PayInEvidenceUiStatus | null | undefined
): boolean {
  return isPayInEvidenceUploadedStatus(status)
}

export function shouldShowDepositPostButton(input: {
  pickupStatus: CollectorPickupSettlementStatus
  depositStatus: BankDepositSettlementStatus
  payInEvidenceStatus: PayInEvidenceUiStatus | null
}): boolean {
  return (
    input.pickupStatus === "POSTED" &&
    input.depositStatus === "NOT_POSTED" &&
    isPayInSlipUploaded(input.payInEvidenceStatus)
  )
}

export function shouldShowDepositPostDisabled(input: {
  pickupStatus: CollectorPickupSettlementStatus
  depositStatus: BankDepositSettlementStatus
  payInEvidenceStatus: PayInEvidenceUiStatus | null
}): boolean {
  return (
    input.pickupStatus === "POSTED" &&
    input.depositStatus === "NOT_POSTED" &&
    !isPayInSlipUploaded(input.payInEvidenceStatus)
  )
}

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
      return "bg-green-100 text-green-800"
    case "NEEDS REPAIR":
      return "bg-amber-100 text-amber-900"
    case "NOT COLLECTED":
      return "bg-orange-100 text-orange-900"
  }
}
