import type { PrismaClient } from "@/generated/prisma/client"
import { deleteReferenceStock } from "./delete-reference-stock"
import type { PatchReferenceStockBody } from "./parse-product-reference-mutation"
import { restoreReferenceStock } from "./restore-reference-stock"
import { updateReferenceStock } from "./update-reference-stock"
import type { ProductReferenceListItem } from "./types"

type ReferenceDb = Pick<PrismaClient, "product" | "referenceStock">

export async function patchReferenceStock(
  db: ReferenceDb,
  id: string,
  body: PatchReferenceStockBody
): Promise<ProductReferenceListItem> {
  if (body.action === "delete") {
    return deleteReferenceStock(db, id)
  }
  if (body.action === "restore") {
    return restoreReferenceStock(db, id)
  }
  return updateReferenceStock(db, id, body)
}
