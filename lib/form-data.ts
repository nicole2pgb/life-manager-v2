// Reads a form field as a string. File uploads and missing fields become "",
// so callers only deal with strings.
export function readText(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
