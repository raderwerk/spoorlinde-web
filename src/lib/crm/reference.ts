export function createReference(source: string): string {
  const compact = source.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const body = (compact + "XXXXXXXX").slice(0, 8);
  return `SL-${body}`;
}
