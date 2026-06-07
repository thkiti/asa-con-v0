import path from "path"

const DEFAULT_INPUT_DIR = path.resolve("local/catalog-image/input")
const DEFAULT_WORK_DIR = path.resolve("local/catalog-image/work")

export function getCatalogImageInputDir(): string {
  const fromEnv = process.env.CATALOG_IMAGE_INPUT_DIR?.trim()
  return fromEnv ? path.resolve(fromEnv) : DEFAULT_INPUT_DIR
}

export function getCatalogImageWorkDir(): string {
  const fromEnv = process.env.CATALOG_IMAGE_WORK_DIR?.trim()
  return fromEnv ? path.resolve(fromEnv) : DEFAULT_WORK_DIR
}

export function getCatalogImageFinalDir(): string {
  return path.resolve(getCatalogImageWorkDir(), "final")
}
