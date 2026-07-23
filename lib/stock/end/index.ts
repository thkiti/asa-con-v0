import "server-only"

/**
 * Server-only END domain barrel.
 * Client Components must import client-safe helpers by direct path, e.g.:
 * - `@/lib/stock/end/end-permissions`
 * - `@/lib/stock/end/end-public-types`
 * - `@/lib/stock-ui/end-permissions`
 */
export { EndError, EndErrorCodes } from "./end-errors"
export type { EndErrorCode } from "./end-errors"

export {
  INITIAL_END_PERIOD,
  parsePeriodMonth,
  periodBounds,
  previousPeriodMonth,
  endPeriodKey,
  isInitialEndPeriod,
} from "./end-period"

export {
  calcActualQty,
  calcEndingQty,
  calcAdjQty,
  calcAdjAmount,
  calcEndLine,
  sumAdjAmounts,
  formulasReconcile,
} from "./end-calc"

export type {
  GetOrCreateEndInput,
  GetOrCreateEndResult,
  RebuildEndInput,
  RebuildEndResult,
  LockEndInput,
  LockEndResult,
  ReopenEndInput,
  ReopenEndResult,
  SubmitEndInput,
  SubmitEndResult,
  ImportEndCsvInput,
  ImportEndCsvResult,
  ConfirmShopReceiptInput,
  ConfirmShopReceiptResult,
  EndCompleteness,
  EndCompletenessIssue,
} from "./end-types"

export type { EndCompleteness as EndCompletenessPublic } from "./end-public-types"

export {
  canViewEnd,
  canRebuildEnd,
  canImportEnd,
  canLockEnd,
  canSubmitEnd,
  canReopenEnd,
  canConfirmShopReceipt,
} from "./end-permissions"

export { getOrCreateEndDocument } from "./end-get-or-create"
export { rebuildEndDocument } from "./end-rebuild"
export { lockEndDocument } from "./end-lock"
export { reopenEndDocument } from "./end-reopen"
export { submitEndDocument } from "./end-submit"
export { importEndCsv } from "./end-import-csv"
export { applyEndManualOpeningLines } from "./end-manual-opening"
export { confirmShopReceipt } from "./end-shop-receipt"
export { getEndDocumentDetail } from "./end-detail"
export { collectEndSources } from "./end-sources"
export { evaluateEndCompleteness } from "./end-completeness"
