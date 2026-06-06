/** Format accumulated worked seconds as HH:mm:ss (hours may exceed 24). */
export function formatWorkedDuration(totalSeconds: number): string {
  const safe =
    Number.isFinite(totalSeconds) && totalSeconds > 0
      ? Math.floor(totalSeconds)
      : 0
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const pad2 = (n: number) => String(n).padStart(2, "0")
  return `${String(hours).padStart(2, "0")}:${pad2(minutes)}:${pad2(seconds)}`
}
