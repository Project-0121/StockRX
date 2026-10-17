import { describe, it, expect } from "vitest";
import { sanitizeCsvCell, generateCsv } from "@/lib/csv/export";

describe("CSV Export & Security", () => {
  it("prefixes formula injection characters (=, +, -, @) with a single quote", () => {
    expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvCell("+1234567890")).toBe("'+1234567890");
    expect(sanitizeCsvCell("-500")).toBe("'-500");
    expect(sanitizeCsvCell("@malicious_cmd")).toBe("'@malicious_cmd");
  });

  it("escapes internal quotes and wraps cells with commas in quotes", () => {
    expect(sanitizeCsvCell('Paracetamol, 500mg "Special"')).toBe(
      '"Paracetamol, 500mg ""Special"""'
    );
  });

  it("handles newlines properly inside double quotes", () => {
    expect(sanitizeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
  });

  it("returns empty string for null or undefined", () => {
    expect(sanitizeCsvCell(null)).toBe("");
    expect(sanitizeCsvCell(undefined)).toBe("");
  });

  it("generates full CSV with UTF-8 BOM, headers, and rows", () => {
    const headers = ["Medicine", "Stock", "FormulaTest"];
    const rows = [
      ["Paracetamol", 120, "=1+1"],
      ['Cough Syrup, "100ml"', 8, "@test"],
    ];

    const csvOutput = generateCsv(headers, rows);

    // Starts with UTF-8 BOM
    expect(csvOutput.startsWith("\uFEFF")).toBe(true);

    // Contains sanitized headers and rows
    expect(csvOutput).toContain("Medicine,Stock,FormulaTest");
    expect(csvOutput).toContain("Paracetamol,120,'=1+1");
    expect(csvOutput).toContain('"Cough Syrup, ""100ml""",8,\'@test');
  });
});
