import { parseMobileUploadRouteToken } from "@/lib/pos-ui/parse-mobile-upload-route-token"

export function readMobileUploadTokenFromPathname(pathname: string): string {
  const prefix = "/payment-evidence/mobile/"
  if (!pathname.startsWith(prefix)) return ""

  const remainder = pathname.slice(prefix.length).trim()
  if (!remainder) return ""

  return parseMobileUploadRouteToken(
    remainder.split("/").map((segment) => decodeURIComponent(segment))
  )
}

export function resolveMobileEvidenceToken(
  paramsToken: string | string[] | undefined,
  pathname?: string
): string {
  const fromParams = parseMobileUploadRouteToken(paramsToken)
  if (fromParams) return fromParams

  if (pathname) {
    return readMobileUploadTokenFromPathname(pathname)
  }

  if (typeof window !== "undefined") {
    return readMobileUploadTokenFromPathname(window.location.pathname)
  }

  return ""
}
