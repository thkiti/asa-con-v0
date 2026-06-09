import { loadPaymentEvidenceMobileMeta } from "@/lib/pos/payment-evidence-upload-token"
import {
  htmlResponse,
  renderMobileUploadErrorPage,
  renderMobileUploadFormPage,
  renderMobileUploadSuccessPage,
} from "@/lib/pos/payment-evidence-mobile-html"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { parseMobileUploadRouteToken } from "@/lib/pos-ui/parse-mobile-upload-route-token"
import { prisma } from "@/lib/shared/prisma"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ token: string[] }>
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { token: tokenSegments } = await context.params
    const token = parseMobileUploadRouteToken(tokenSegments)

    if (!token) {
      return htmlResponse(
        renderMobileUploadErrorPage({
          message: "Upload link is missing a token.",
        }),
        400
      )
    }

    const meta = await loadPaymentEvidenceMobileMeta(prisma, token)
    return htmlResponse(renderMobileUploadFormPage({ token, meta }))
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      if (err.code === "EVIDENCE_ALREADY_UPLOADED") {
        return htmlResponse(renderMobileUploadSuccessPage(), 200)
      }

      return htmlResponse(
        renderMobileUploadErrorPage({
          title: err.code === "TOKEN_EXPIRED" ? "Link Expired" : "Upload unavailable",
          message: err.message,
        }),
        err.httpStatus
      )
    }

    console.error("GET /payment-evidence/mobile/[...token]:", err)
    return htmlResponse(
      renderMobileUploadErrorPage({ message: "Internal error" }),
      500
    )
  }
}
