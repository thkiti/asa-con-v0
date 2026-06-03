import type { PrismaClient } from "@/generated/prisma/client"
import { deleteProduct } from "./delete-product"
import type { PatchProductBody } from "./parse-product-mutation"
import { restoreProduct } from "./restore-product"
import { updateProduct } from "./update-product"
import type { ProductReferenceListItem } from "./types"

type ProductDb = Pick<PrismaClient, "product" | "referenceStock" | "$transaction">

export async function patchProduct(
  db: ProductDb,
  id: string,
  body: PatchProductBody
): Promise<ProductReferenceListItem> {
  if (body.action === "delete") {
    return deleteProduct(db, id)
  }
  if (body.action === "restore") {
    return restoreProduct(db, id)
  }
  return updateProduct(db, id, { name: body.name, productType: body.productType })
}
