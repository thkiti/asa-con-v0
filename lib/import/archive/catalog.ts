import type { LegacyArchiveFileSpec } from "./types"

export const DEVBOARD_V1_ARCHIVE_NAME = "devboard-v1"

export const DEVBOARD_V1_LEGACY_FILES: LegacyArchiveFileSpec[] = [
  {
    filename: "SHP.DBF",
    category: "dbf",
    importRole: "branch",
    required: true,
    encoding: "TIS-620",
    notes: "Shop branch master (SH-{S_ID})",
  },
  {
    filename: "POSINY.DBF",
    category: "dbf",
    importRole: "product",
    required: true,
    encoding: "TIS-620",
    notes: "Product master (7-digit undashed code from I_ID)",
  },
  {
    filename: "EME.DBF",
    category: "dbf",
    importRole: "staff",
    required: true,
    encoding: "TIS-620",
    notes: "Employee master; archived for future staff import",
  },
  {
    filename: "SHP.DBT",
    category: "dbf",
    importRole: "other",
    required: false,
    encoding: "TIS-620",
    notes: "Optional DBF memo companion for SHP.DBF",
  },
  {
    filename: "kCode.csv",
    category: "csv",
    importRole: "reference-stock",
    required: true,
    encoding: "UTF-8",
    notes: "Home Key reference stock (hookGroup K)",
  },
  {
    filename: "cCode.csv",
    category: "csv",
    importRole: "reference-stock",
    required: true,
    encoding: "UTF-8",
    notes: "Auto Key reference stock (hookGroup C)",
  },
  {
    filename: "mCode.csv",
    category: "csv",
    importRole: "reference-stock",
    required: true,
    encoding: "UTF-8",
    notes: "Motorcycle Key reference stock (hookGroup M)",
  },
  {
    filename: "oCode.csv",
    category: "csv",
    importRole: "optional-reference-stock",
    required: false,
    encoding: "UTF-8",
    notes: "Other Special Key reference stock (hookGroup O)",
  },
]

export function getLegacyArchiveSubdir(category: LegacyArchiveFileSpec["category"]): string {
  switch (category) {
    case "dbf":
      return "dbf"
    case "csv":
      return "csv"
    default:
      return "other"
  }
}
