import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { uploadProductImagesToBlob } from "@/lib/catalog-image/vercel-blob"

type UploadToCloudBody = {
  productCodes?: string[]
}

export async function POST(req: Request) {
  try {
    requireCatalogImageSession(await getSession())
    const body = (await req.json()) as UploadToCloudBody
    const productCodes = Array.isArray(body.productCodes)
      ? body.productCodes.map((code) => String(code ?? "").trim()).filter(Boolean)
      : []

    const { results, summary } = await uploadProductImagesToBlob(productCodes)
    return NextResponse.json({ results, summary })
  } catch (err: unknown) {
    return catalogImageErrorResponse(
      err,
      "POST catalog-image/upload-to-cloud error"
    )
  }
}
