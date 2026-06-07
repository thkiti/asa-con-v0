import path from "path"

const DEFAULT_INPUT_DIR = path.resolve("local/catalog-image/input")
const DEFAULT_WORK_DIR = path.resolve("local/catalog-image/work")

const DEFAULT_CATALOG_PRODUCT_IMAGE_DIR =
  process.platform === "win32"
    ? "C:\\ASA-CON\\Catalog\\Images"
    : path.resolve("local/catalog-image/images")

export function getCatalogImageInputDir(): string {
  const fromEnv = process.env.CATALOG_IMAGE_INPUT_DIR?.trim()
  return fromEnv ? path.resolve(fromEnv) : DEFAULT_INPUT_DIR
}

export function getCatalogImageWorkDir(): string {
  const fromEnv = process.env.CATALOG_IMAGE_WORK_DIR?.trim()
  return fromEnv ? path.resolve(fromEnv) : DEFAULT_WORK_DIR
}

export function getCatalogProductImageDir(): string {
  const fromEnv = process.env.CATALOG_PRODUCT_IMAGE_DIR?.trim()
  return fromEnv ? path.resolve(fromEnv) : DEFAULT_CATALOG_PRODUCT_IMAGE_DIR
}

/** Persistent catalog product images folder (alias for getCatalogProductImageDir). */
export function getCatalogImageFinalDir(): string {
  return getCatalogProductImageDir()
}
