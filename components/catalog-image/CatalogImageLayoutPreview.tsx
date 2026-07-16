"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  buildCropTemplate,
  clampCropRect,
  defaultCatalogCropRect,
  moveCropRect,
  resizeCropRect,
  type CropRect,
  type CropTemplate,
  type ResizeHandle,
} from "@/lib/catalog-image-ui/crop-template"
import type { CatalogImageAssignedSlot } from "@/lib/catalog-image-ui/types"
import type { CatalogImageCropSettingsVM } from "./CatalogImageView"

type CatalogImageLayoutPreviewProps = {
  imageUrl: string | null
  cropSettings: CatalogImageCropSettingsVM
  cropRect: CropRect | null
  assignedSlots: CatalogImageAssignedSlot[]
  loading: boolean
  onImageLoad: () => void
  onImageError: () => void
  onCropRectChange: (rect: CropRect) => void
  onCropTemplateChange?: (template: CropTemplate) => void
  onImageDimensionsChange?: (size: ImageSize) => void
}

type ImageSize = {
  width: number
  height: number
}

type DragMode =
  | { kind: "move"; startClientX: number; startClientY: number; startRect: CropRect }
  | {
      kind: "resize"
      handle: ResizeHandle
      startClientX: number
      startClientY: number
      startRect: CropRect
    }

const HANDLE_CLASS =
  "absolute z-20 h-3 w-3 border-2 border-sky-400 bg-zinc-100 shadow pointer-events-auto"

function getScale(natural: ImageSize, display: ImageSize) {
  return {
    scaleX: display.width / natural.width,
    scaleY: display.height / natural.height,
  }
}

export function CatalogImageLayoutPreview({
  imageUrl,
  cropSettings,
  cropRect,
  assignedSlots,
  loading,
  onImageLoad,
  onImageError,
  onCropRectChange,
  onCropTemplateChange,
  onImageDimensionsChange,
}: CatalogImageLayoutPreviewProps) {
  const { columns, rows } = cropSettings
  const slotCount = Math.max(1, columns) * Math.max(1, rows)

  const imgRef = useRef<HTMLImageElement>(null)
  const [naturalSize, setNaturalSize] = useState<ImageSize | null>(null)
  const [displaySize, setDisplaySize] = useState<ImageSize | null>(null)
  const dragRef = useRef<DragMode | null>(null)

  const syncDisplaySize = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    setDisplaySize({
      width: img.offsetWidth,
      height: img.offsetHeight,
    })
  }, [])

  const publishCropRect = useCallback(
    (nextRect: CropRect) => {
      if (!naturalSize) return
      const clamped = clampCropRect(nextRect, naturalSize.width, naturalSize.height)
      onCropRectChange(clamped)
      const template = buildCropTemplate(
        cropSettings,
        naturalSize.width,
        naturalSize.height,
        clamped
      )
      onCropTemplateChange?.(template)
    },
    [cropSettings, naturalSize, onCropRectChange, onCropTemplateChange]
  )

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget
      const nextNatural = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      }
      setNaturalSize(nextNatural)
      onImageDimensionsChange?.(nextNatural)
      setDisplaySize({
        width: img.offsetWidth,
        height: img.offsetHeight,
      })
      const initial = defaultCatalogCropRect(
        nextNatural.width,
        nextNatural.height
      )
      onCropRectChange(initial)
      const template = buildCropTemplate(
        cropSettings,
        nextNatural.width,
        nextNatural.height,
        initial
      )
      onCropTemplateChange?.(template)
      onImageLoad()
    },
    [
      cropSettings,
      onImageDimensionsChange,
      onImageLoad,
      onCropRectChange,
      onCropTemplateChange,
    ]
  )

  useEffect(() => {
    if (!imageUrl) {
      setNaturalSize(null)
      setDisplaySize(null)
      onImageDimensionsChange?.({ width: 0, height: 0 })
      return
    }

    setNaturalSize(null)
    setDisplaySize(null)
  }, [imageUrl, onImageDimensionsChange])

  useEffect(() => {
    if (!naturalSize || !cropRect) return
    const template = buildCropTemplate(
      cropSettings,
      naturalSize.width,
      naturalSize.height,
      cropRect
    )
    onCropTemplateChange?.(template)
  }, [
    cropSettings.columns,
    cropSettings.rows,
    cropSettings.rotateDeg,
    naturalSize,
    cropRect,
    onCropTemplateChange,
  ])

  useEffect(() => {
    const onResize = () => syncDisplaySize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [syncDisplaySize])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || !naturalSize || !displaySize || !cropRect) return

      const { scaleX, scaleY } = getScale(naturalSize, displaySize)
      const deltaX = (event.clientX - drag.startClientX) / scaleX
      const deltaY = (event.clientY - drag.startClientY) / scaleY

      if (drag.kind === "move") {
        publishCropRect(
          moveCropRect(
            drag.startRect,
            deltaX,
            deltaY,
            naturalSize.width,
            naturalSize.height
          )
        )
      } else {
        publishCropRect(
          resizeCropRect(
            drag.startRect,
            drag.handle,
            deltaX,
            deltaY,
            naturalSize.width,
            naturalSize.height
          )
        )
      }
    }

    const onPointerUp = () => {
      dragRef.current = null
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [cropRect, displaySize, naturalSize, publishCropRect])

  const startDrag = useCallback(
    (event: React.PointerEvent, mode: DragMode) => {
      event.preventDefault()
      event.stopPropagation()
      dragRef.current = mode
    },
    []
  )

  const scale =
    naturalSize && displaySize ? getScale(naturalSize, displaySize) : null
  const cropDisplay =
    cropRect && scale
      ? {
          left: cropRect.cropX * scale.scaleX,
          top: cropRect.cropY * scale.scaleY,
          width: cropRect.cropWidth * scale.scaleX,
          height: cropRect.cropHeight * scale.scaleY,
        }
      : null

  return (
    <div className="w-full">
      {!imageUrl ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Open a PDF file to preview catalog image
        </p>
      ) : (
        <div className="flex justify-center">
          <div className="relative w-full">
            <img
              key={imageUrl}
              ref={imgRef}
              src={imageUrl}
              alt="PDF page preview"
              onLoad={handleImageLoad}
              onError={onImageError}
              draggable={false}
              className="block h-auto w-full bg-zinc-800"
            />
            {cropDisplay && displaySize ? (
              <div
                className="absolute left-0 top-0"
                style={{
                  width: displaySize.width,
                  height: displaySize.height,
                }}
              >
                <div
                  className="absolute border-2 border-sky-400 bg-sky-500/10"
                  style={{
                    left: cropDisplay.left,
                    top: cropDisplay.top,
                    width: cropDisplay.width,
                    height: cropDisplay.height,
                    cursor: "move",
                  }}
                  onPointerDown={(event) => {
                    if (!cropRect) return
                    startDrag(event, {
                      kind: "move",
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                      startRect: cropRect,
                    })
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 grid"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, 1fr)`,
                      gridTemplateRows: `repeat(${rows}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: slotCount }, (_, index) => {
                      const assigned = assignedSlots.find(
                        (slot) => slot.sourceSlot === index + 1
                      )
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-center border border-amber-400/90 bg-amber-500/15 p-1"
                        >
                          <span className="max-w-full truncate rounded bg-zinc-950/90 px-1.5 py-0.5 text-center text-xs font-semibold text-amber-300 ring-1 ring-amber-500/70">
                            {assigned?.productCode || index + 1}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {(["nw", "ne", "sw", "se"] as const).map((handle) => {
                    const position =
                      handle === "nw"
                        ? { left: -6, top: -6, cursor: "nwse-resize" }
                        : handle === "ne"
                          ? { right: -6, top: -6, cursor: "nesw-resize" }
                          : handle === "sw"
                            ? { left: -6, bottom: -6, cursor: "nesw-resize" }
                            : { right: -6, bottom: -6, cursor: "nwse-resize" }

                    return (
                      <div
                        key={handle}
                        className={HANDLE_CLASS}
                        style={position}
                        onPointerDown={(event) => {
                          if (!cropRect) return
                          startDrag(event, {
                            kind: "resize",
                            handle,
                            startClientX: event.clientX,
                            startClientY: event.clientY,
                            startRect: cropRect,
                          })
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {loading ? (
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Loading preview…
        </p>
      ) : null}
    </div>
  )
}
