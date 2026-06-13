/** Vercel Blob pathname for a catalog product image (PNG canonical upload format). */
export function getCatalogProductCloudPath(productCode: string): string {
  return `products/${productCode}.png`
}
