/** One field quoted per RFC 4180 when it holds a comma, quote or line break. */
export function csvField(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvLine(fields: Array<string | number | null>): string {
  return fields.map(csvField).join(',');
}
