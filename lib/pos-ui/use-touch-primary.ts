/** True on touch-primary devices (e.g. Galaxy Tab A9). */
export function isTouchPrimaryDevice(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia("(pointer: coarse)").matches
}
