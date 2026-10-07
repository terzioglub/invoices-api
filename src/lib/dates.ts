export function toDateString(value: Date | string): string {
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

export function toTimestamp(value: Date | string | null): string | null {
  if (value === null) return null;
  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString();
}
