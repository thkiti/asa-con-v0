export type ReconciliationSnapshotErrorCode = "INVALID_SCOPE"
  | "NOT_FOUND"
  | "BRANCH_NOT_FOUND"

export class ReconciliationSnapshotError extends Error {
  readonly code: ReconciliationSnapshotErrorCode

  constructor(message: string, code: ReconciliationSnapshotErrorCode) {
    super(message)
    this.name = "ReconciliationSnapshotError"
    this.code = code
  }
}
