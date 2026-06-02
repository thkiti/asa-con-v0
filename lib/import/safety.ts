export function assertImportApplyAllowed(apply: boolean): void {
  if (!apply) return

  if (
    process.env.NODE_ENV === "production" &&
    process.env.IMPORT_ALLOW_PRODUCTION !== "true"
  ) {
    throw new Error(
      "Refusing import apply in production. Set IMPORT_ALLOW_PRODUCTION=true to override."
    )
  }
}
