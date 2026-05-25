export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error("DATABASE_URL is not set")
  return url
}
