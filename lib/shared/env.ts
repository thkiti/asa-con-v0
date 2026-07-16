/**
 * Database URL helpers.
 *
 * - DATABASE_URL: runtime app (Next/Vercel) — Supabase transaction pooler recommended
 * - DIRECT_URL: Prisma CLI / migrations / long-running scripts — direct Postgres host
 *
 * Next.js API routes must only call requireDatabaseUrl() / resolvePgPoolMax().
 * Do not require DIRECT_URL at runtime.
 */

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error("DATABASE_URL is not set")
  return url
}

/**
 * Direct (non-pooled) connection for Prisma CLI and heavy scripts.
 * Does not fall back to DATABASE_URL — callers that want fallback use
 * {@link resolveDirectOrDatabaseUrl}.
 */
export function requireDirectUrl(): string {
  const url = process.env.DIRECT_URL?.trim()
  if (!url) throw new Error("DIRECT_URL is not set")
  return url
}

/**
 * Prefer DIRECT_URL for CLI/scripts; fall back to DATABASE_URL when unset.
 * Never use this in Next.js request handlers (keep runtime on DATABASE_URL).
 */
export function resolveDirectOrDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim()
  if (direct) return direct
  return requireDatabaseUrl()
}

/**
 * Prisma CLI datasource precedence for prisma.config.ts:
 * DIRECT_URL → DATABASE_URL → local placeholder (generate without DB).
 */
export function resolvePrismaCliDatasourceUrl(
  env: NodeJS.ProcessEnv = process.env
): string {
  const direct = env.DIRECT_URL?.trim()
  if (direct) return direct
  const database = env.DATABASE_URL?.trim()
  if (database) return database
  return "postgresql://127.0.0.1:5432/asa_con_v0?schema=public"
}

/** Small pg Pool max — 1 on Vercel/serverless, small locally. */
export function resolvePgPoolMax(env: NodeJS.ProcessEnv = process.env): number {
  const override = env.PRISMA_POOL_MAX?.trim()
  if (override) {
    const n = Number(override)
    if (Number.isFinite(n) && n >= 1 && n <= 10) {
      return Math.trunc(n)
    }
  }

  if (
    env.VERCEL === "1" ||
    Boolean(env.VERCEL_ENV) ||
    Boolean(env.AWS_LAMBDA_FUNCTION_NAME)
  ) {
    return 1
  }

  return 2
}
