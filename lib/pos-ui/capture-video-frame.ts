export type CaptureVideoFrameOptions = {
  quality?: number
  mimeType?: string
}

/**
 * Grab the current video frame as a JPEG blob.
 * Returns null when the video is not ready or encoding fails.
 */
export async function captureVideoFrame(
  video: HTMLVideoElement | null,
  options: CaptureVideoFrameOptions = {}
): Promise<Blob | null> {
  if (!video || video.videoWidth < 2 || video.videoHeight < 2) {
    return null
  }

  const canvas = document.createElement("canvas")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.drawImage(video, 0, 0)

  const quality = options.quality ?? 0.92
  const mimeType = options.mimeType ?? "image/jpeg"

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

export type CameraFacingMode = "user" | "environment"

export async function startCameraStream(
  video: HTMLVideoElement | null,
  facingMode: CameraFacingMode = "environment"
): Promise<MediaStream | null> {
  if (!video || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    })
    video.srcObject = stream
    return stream
  } catch {
    return null
  }
}

export async function startCheckoutCameraStream(
  video: HTMLVideoElement | null
): Promise<MediaStream | null> {
  return startCameraStream(video, "environment")
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}
