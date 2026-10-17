/**
 * Sanitizes a single CSV cell value:
 * 1. Formula injection protection: if string starts with =, +, -, @, prefix with a single quote '
 * 2. Escape double quotes by doubling them (" -> "")
 * 3. Wrap in double quotes if it contains commas, newlines, or quotes
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Formula injection prevention for Excel/Sheets: =, +, -, @
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // If contains double quotes, commas, or newlines, quote the field and double the quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates a full CSV string with UTF-8 BOM, headers, and rows.
 */
export function generateCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const bom = "\uFEFF"; // UTF-8 Byte Order Mark for Excel compatibility
  const headerLine = headers.map(sanitizeCsvCell).join(",");
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(","));

  return bom + [headerLine, ...rowLines].join("\r\n");
}
