"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { fetchCatalogProductImageUrl } from "@/lib/catalog-image-ui/catalog-product-image-client"
import {
  catalogHoverPreviewBounds,
  CATALOG_HOVER_PREVIEW_GAP_PX,
} from "@/lib/catalog-image-ui/hover-preview-layout"
import { CatalogProductImageHoverPreview } from "./CatalogProductImageHoverPreview"

type CatalogProductCodeHoverProps = {
  productCode: string
  children?: ReactNode
  className?: string
}

function computePreviewPosition(trigger: HTMLElement): { top: number; left: number } {
  const rect = trigger.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const { maxWidth, maxHeight } = catalogHoverPreviewBounds(viewportWidth, viewportHeight)

  let left = rect.right + CATALOG_HOVER_PREVIEW_GAP_PX
  if (left + maxWidth > viewportWidth - CATALOG_HOVER_PREVIEW_GAP_PX) {
    left = Math.max(
      CATALOG_HOVER_PREVIEW_GAP_PX,
      rect.left - maxWidth - CATALOG_HOVER_PREVIEW_GAP_PX
    )
  }

  let top = rect.top
  if (top + maxHeight > viewportHeight - CATALOG_HOVER_PREVIEW_GAP_PX) {
    top = Math.max(
      CATALOG_HOVER_PREVIEW_GAP_PX,
      viewportHeight - maxHeight - CATALOG_HOVER_PREVIEW_GAP_PX
    )
  }

  return { top, left }
}

export function CatalogProductCodeHover({
  productCode,
  children,
  className,
}: CatalogProductCodeHoverProps) {
  const code = String(productCode ?? "").trim()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const requestIdRef = useRef(0)

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    setPosition(computePreviewPosition(trigger))
  }, [])

  const closePreview = useCallback(() => {
    setOpen(false)
    setLoading(false)
    setImageFailed(false)
    requestIdRef.current += 1
  }, [])

  const openPreview = useCallback(() => {
    if (!code) return
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setImageUrl(null)
    setImageFailed(false)
    setLoading(true)
    updatePosition()
    setOpen(true)

    void fetchCatalogProductImageUrl(code).then((url) => {
      if (requestIdRef.current !== requestId) return
      setImageUrl(url)
      setLoading(false)
    })
  }, [code, updatePosition])

  const handleImageError = useCallback(() => {
    setImageFailed(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onReposition = () => updatePosition()
    window.addEventListener("scroll", onReposition, true)
    window.addEventListener("resize", onReposition)
    return () => {
      window.removeEventListener("scroll", onReposition, true)
      window.removeEventListener("resize", onReposition)
    }
  }, [open, updatePosition])

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    closePreview()
  }

  if (!code) {
    return <span className={className}>{children ?? productCode}</span>
  }

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        className={`cursor-default rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60 ${className ?? ""}`}
        data-testid="catalog-product-code-hover-trigger"
        data-product-code={code}
        onMouseEnter={openPreview}
        onMouseLeave={closePreview}
        onFocus={openPreview}
        onBlur={handleBlur}
      >
        {children ?? code}
      </span>

      {open && typeof document !== "undefined"
        ? createPortal(
            <CatalogProductImageHoverPreview
              productCode={code}
              top={position.top}
              left={position.left}
              loading={loading}
              imageUrl={imageUrl}
              imageFailed={imageFailed}
              onImageError={handleImageError}
            />,
            document.body
          )
        : null}
    </>
  )
}
