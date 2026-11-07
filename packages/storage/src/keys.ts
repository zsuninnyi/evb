/** Rejects keys that would escape the storage root. */
export function assertObjectKey(key: string): void {
  if (key.length === 0 || key.startsWith("/") || key.includes("\\")) {
    throw new Error("Invalid object key");
  }

  const segments = key.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    throw new Error("Invalid object key");
  }
}
