/** COL pay-in archive workflow statuses passed to the vault resolver. */
export const COL_PAY_IN_ARCHIVE_WORKFLOW = {
  NOT_APPLICABLE: "COL_NOT_APPLICABLE",
  AWAITING_PAY_IN: "COL_AWAITING_PAY_IN",
  PAY_IN_POSTED: "COL_PAY_IN_POSTED",
} as const

export type ColPayInArchiveWorkflowStatus =
  (typeof COL_PAY_IN_ARCHIVE_WORKFLOW)[keyof typeof COL_PAY_IN_ARCHIVE_WORKFLOW]

export function resolveColPayInArchiveWorkflowStatus(input: {
  pickupStatus: string
  depositStatus: string
}): ColPayInArchiveWorkflowStatus {
  const pickup = String(input.pickupStatus ?? "").trim().toUpperCase()
  const deposit = String(input.depositStatus ?? "").trim().toUpperCase()

  if (pickup !== "POSTED") {
    return COL_PAY_IN_ARCHIVE_WORKFLOW.NOT_APPLICABLE
  }

  if (deposit === "POSTED") {
    return COL_PAY_IN_ARCHIVE_WORKFLOW.PAY_IN_POSTED
  }

  if (deposit === "NOT_POSTED") {
    return COL_PAY_IN_ARCHIVE_WORKFLOW.AWAITING_PAY_IN
  }

  return COL_PAY_IN_ARCHIVE_WORKFLOW.NOT_APPLICABLE
}

export function isColPayInEvidenceRequiredWorkflow(
  workflowStatus: string | null | undefined
): boolean {
  return (
    String(workflowStatus ?? "").trim() === COL_PAY_IN_ARCHIVE_WORKFLOW.AWAITING_PAY_IN
  )
}
