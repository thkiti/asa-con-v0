/**
 * Build a public URL for a file stored in Vercel Blob.
 */
export function blobUrl(pathname: string): string {
  const cleaned = pathname.replace(/^\/+/, "")
  const encoded = cleaned.split("/").map(encodeURIComponent).join("/")
  const base = process.env.NEXT_PUBLIC_BLOB_BASE_URL?.replace(/\/+$/, "")
  if (base) return `${base}/${encoded}`
  return `/${encoded}`
}
