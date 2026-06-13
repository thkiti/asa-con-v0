export function isBareMobileUploadPath(pathname: string): boolean {
  return (
    pathname.startsWith("/payment-evidence/mobile") ||
    pathname.startsWith("/staff-evidence/mobile")
  )
}
