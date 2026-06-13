import { loadStaffEvidenceCaptureMobileMeta } from "@/lib/pos/staff-evidence-capture-token"
import {
  renderStaffEvidenceMobileUploadErrorPage,
  renderStaffEvidenceMobileUploadFormPage,
  staffEvidenceHtmlResponse,
} from "@/lib/pos/staff-evidence-mobile-html"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { parseMobileUploadRouteToken } from "@/lib/pos-ui/parse-mobile-upload-route-token"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ token: string[] }>
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { token: tokenSegments } = await context.params
    const token = parseMobileUploadRouteToken(tokenSegments)

    if (!token) {
      return staffEvidenceHtmlResponse(
        renderStaffEvidenceMobileUploadErrorPage({
          message: "Upload link is missing a token.",
        }),
        400
      )
    }

    const meta = loadStaffEvidenceCaptureMobileMeta(token)
    return staffEvidenceHtmlResponse(renderStaffEvidenceMobileUploadFormPage({ token, meta }))
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return staffEvidenceHtmlResponse(
        renderStaffEvidenceMobileUploadErrorPage({
          title: err.code === "TOKEN_EXPIRED" ? "Link Expired" : "Upload unavailable",
          message: err.message,
        }),
        err.httpStatus
      )
    }

    console.error("GET /staff-evidence/mobile/[...token]:", err)
    return staffEvidenceHtmlResponse(
      renderStaffEvidenceMobileUploadErrorPage({ message: "Internal error" }),
      500
    )
  }
}
