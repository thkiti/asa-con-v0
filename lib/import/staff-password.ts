import bcrypt from "bcryptjs"

/** Default staff password for import — matches legacy asa-con importStaff (bcrypt hash of "1234"). */
export const STAFF_DEFAULT_PASSWORD = "1234"

let cachedHash: string | null = null

export async function getDefaultStaffPasswordHash(): Promise<string> {
  if (!cachedHash) {
    cachedHash = await bcrypt.hash(STAFF_DEFAULT_PASSWORD, 10)
  }
  return cachedHash
}

/** Test helper — bcrypt salt differs per process otherwise. */
export function resetDefaultStaffPasswordHashCache(): void {
  cachedHash = null
}

export async function verifyDefaultStaffPassword(storedHash: string): Promise<boolean> {
  return bcrypt.compare(STAFF_DEFAULT_PASSWORD, storedHash)
}
