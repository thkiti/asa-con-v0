import path from "path"

import {
  BOOTSTRAP_HO_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_CODE,
} from "../constants"
import type { ImportProfile, ImportRunOptions } from "../types"

const DEFAULT_SOURCE_DIR = path.resolve("data/legacy/devboard-v1")
const LEGACY_FLAT_SOURCE_DIR = path.resolve("D:/_projects/asa-con/scripts")

export function resolveImportSourceDir(override?: string): string {
  const fromEnv = process.env.IMPORT_SOURCE_DIR?.trim()
  if (override?.trim()) return path.resolve(override.trim())
  if (fromEnv) return path.resolve(fromEnv)
  return DEFAULT_SOURCE_DIR
}

export function getDevboardV1Profile(sourceDir?: string): ImportProfile {
  const resolvedSourceDir = resolveImportSourceDir(sourceDir)

  return {
    id: "devboard-v1",
    sourceDir: resolvedSourceDir,
    branchFile: "SHP.DBF",
    productFile: "POSINY.DBF",
    staffFile: "EME.DBF",
    referenceStockFiles: [
      { fileName: "kCode.csv", hookGroup: "K" },
      { fileName: "cCode.csv", hookGroup: "C" },
      { fileName: "mCode.csv", hookGroup: "M" },
      { fileName: "oCode.csv", hookGroup: "O", optional: true },
    ],
    hoBranch: {
      code: BOOTSTRAP_HO_BRANCH_CODE,
      name: "Head Office",
      type: "HO",
    },
    bootstrapShopBranch: {
      code: BOOTSTRAP_SHOP_BRANCH_CODE,
      name: "Bootstrap Shop",
      type: "SH",
    },
  }
}

export function resolveLegacyFlatSourceDir(): string {
  return LEGACY_FLAT_SOURCE_DIR
}

export function resolveImportProfile(options: ImportRunOptions): ImportProfile {
  switch (options.profile) {
    case "devboard-v1":
      return getDevboardV1Profile(options.sourceDir)
    default:
      throw new Error(`Unknown import profile: ${options.profile}`)
  }
}
