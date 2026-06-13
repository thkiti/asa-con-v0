"use client"

import {
  CATALOG_HOVER_PREVIEW_MAX_HEIGHT,
  CATALOG_HOVER_PREVIEW_MAX_WIDTH,
} from "@/lib/catalog-image-ui/hover-preview-layout"

type CatalogProductImageHoverPreviewProps = {
  productCode: string
  top: number
  left: number
  loading: boolean
  imageUrl: string | null
  imageFailed: boolean
  onImageError: () => void
}

export function CatalogProductImageHoverPreview({
  productCode,
  top,
  left,
  loading,
  imageUrl,
  imageFailed,
  onImageError,
}: CatalogProductImageHoverPreviewProps) {
  const showImage = Boolean(imageUrl) && !imageFailed && !loading

  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{ top, left }}
      data-testid="catalog-product-image-hover-preview"
      role="tooltip"
    >
      <div
        className="overflow-hidden rounded-lg border border-zinc-300 bg-white p-1 shadow-md"
        style={{
          maxWidth: CATALOG_HOVER_PREVIEW_MAX_WIDTH,
          maxHeight: CATALOG_HOVER_PREVIEW_MAX_HEIGHT,
        }}
      >
        {loading ? (
          <div
            className="flex min-h-24 w-full min-w-[8rem] items-center justify-center px-3 py-4"
            data-testid="catalog-product-image-hover-loading"
          >
            <span className="text-xs text-zinc-500">Loading…</span>
          </div>
        ) : showImage ? (
          <img
            src={imageUrl!}
            alt={`Catalog image for ${productCode}`}
            className="block h-auto w-full object-contain"
            style={{ maxHeight: CATALOG_HOVER_PREVIEW_MAX_HEIGHT }}
            loading="lazy"
            onError={onImageError}
          />
        ) : (
          <div
            className="flex min-h-24 w-full min-w-[8rem] items-center justify-center px-3 py-4"
            data-testid="catalog-product-image-hover-no-image"
          >
            <span className="text-xs text-zinc-500">No image</span>
          </div>
        )}
      </div>
    </div>
  )
}
