export {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  HO_BRANCH_CODE,
  LEGAL_ENTITY_CODES,
  LEGAL_ENTITY_DISPLAY_NAMES,
  getLegalEntityDisplayName,
  type DocumentEntityCode,
} from "./constants"
export {
  formatEntityDisplay,
  formatEntityShort,
  formatEntityThai,
  normalizeDocumentEntityCode,
  type EntityDisplayLocale,
} from "./display"
export {
  formatEntityContextTitle,
  formatEntityContextTitleOrDefault,
} from "./context-title"
export {
  DocumentEntityError,
  assertDocumentEntityChangeAllowed,
  canChooseDocumentEntity,
  parseDocumentEntityCode,
  resolveLoginDocumentEntityCode,
} from "./document-entity"
