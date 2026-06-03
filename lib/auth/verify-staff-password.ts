import bcrypt from "bcryptjs"

export async function verifyStaffPassword(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, storedHash)
}
