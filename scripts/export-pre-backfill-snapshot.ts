import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"

import { POLICY_SUMMARY_HEADERS } from "../lib/product-groups/management-product-group"
import { prisma } from "../lib/shared/prisma"

const GG80_LEGACY = ["7003001", "7003002", "7003003"] as const
const GG80_REPLACEMENT = ["8001007", "8001008", "8001009"] as const

const OUT_DIR = path.resolve(
  `data/backfill-snapshots/pre-apply-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`
)

const AFFECTED_PRODUCT_CODES = [
  ...POLICY_SUMMARY_HEADERS,
  ...GG80_LEGACY,
  ...GG80_REPLACEMENT,
  "8001001",
  "8001002",
  "8001003",
  "8001004",
  "8001005",
  "8001006",
]

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const [productCount, refCount, activeRefCount] = await Promise.all([
    prisma.product.count(),
    prisma.referenceStock.count(),
    prisma.referenceStock.count({ where: { deleted: false } }),
  ])

  const products = await prisma.product.findMany({
    where: { code: { in: [...new Set(AFFECTED_PRODUCT_CODES)] } },
    orderBy: { code: "asc" },
  })

  const productIds = products.map((p) => p.id)
  const refs =
    productIds.length > 0
      ? await prisma.referenceStock.findMany({
          where: { productId: { in: productIds } },
          orderBy: [{ productCode: "asc" }, { hookGroup: "asc" }, { hookNo: "asc" }],
        })
      : []

  const manifest = {
    exportedAt: new Date().toISOString(),
    outDir: OUT_DIR,
    counts: {
      productTotal: productCount,
      referenceStockTotal: refCount,
      referenceStockActive: activeRefCount,
      affectedProductsFound: products.length,
      affectedReferenceStockFound: refs.length,
    },
    affectedProductCodes: [...new Set(AFFECTED_PRODUCT_CODES)].sort(),
  }

  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(path.join(OUT_DIR, "products.json"), JSON.stringify(products, null, 2))
  fs.writeFileSync(path.join(OUT_DIR, "reference-stock.json"), JSON.stringify(refs, null, 2))

  console.log("Pre-backfill snapshot written to:", OUT_DIR)
  console.log(JSON.stringify(manifest, null, 2))
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
