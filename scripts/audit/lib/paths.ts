import fs from "fs"
import path from "path"

const DEFAULT_EXTENSIONS = [".ts", ".tsx"]
const DEFAULT_EXCLUDE_DIRS = ["node_modules", "generated", ".next"]

export function getRepoRoot(): string {
  return path.join(__dirname, "..", "..", "..")
}

export function normalizeRelativePath(filePath: string, repoRoot?: string): string {
  const root = repoRoot ?? getRepoRoot()
  return path.relative(root, filePath).replace(/\\/g, "/")
}

export function resolveRelative(rel: string, repoRoot?: string): string {
  return path.join(repoRoot ?? getRepoRoot(), rel)
}

export function readFileRelative(rel: string, repoRoot?: string): string {
  return fs.readFileSync(resolveRelative(rel, repoRoot), "utf8")
}

export function isPathAllowed(
  relativePath: string,
  allowedRelativePaths: string[]
): boolean {
  const norm = relativePath.replace(/\\/g, "/")
  return allowedRelativePaths.some((allowed) => {
    const a = allowed.replace(/\\/g, "/")
    if (a.endsWith("/")) return norm.startsWith(a)
    return norm === a
  })
}

export function listSourceFiles(
  dir: string,
  opts?: {
    extensions?: string[]
    excludeTest?: boolean
    excludeDirs?: string[]
  }
): string[] {
  const extensions = opts?.extensions ?? DEFAULT_EXTENSIONS
  const excludeDirs = new Set([
    ...DEFAULT_EXCLUDE_DIRS,
    ...(opts?.excludeDirs ?? []),
  ])
  const excludeTest = opts?.excludeTest ?? true

  if (!fs.existsSync(dir)) return []

  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (excludeDirs.has(entry.name)) continue
      out.push(...listSourceFiles(abs, opts))
      continue
    }
    const ext = path.extname(entry.name)
    if (!extensions.includes(ext)) continue
    if (excludeTest && /\.test\.(ts|tsx)$/.test(entry.name)) continue
    out.push(abs)
  }
  return out
}

export function listRelativeSourceFiles(
  relativeDir: string,
  opts?: Parameters<typeof listSourceFiles>[1]
): string[] {
  return listSourceFiles(resolveRelative(relativeDir), opts)
}
