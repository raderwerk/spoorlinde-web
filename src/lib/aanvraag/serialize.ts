/** Serializes data without allowing user-controlled text to close an inline script element. */
export function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
