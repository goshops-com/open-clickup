import { expect, it } from "vitest";
import { encodeCsv, parseCsv, parseCsvWithHeader, deescapeFormula } from "@/lib/list-csv";

it("escapes commas, quotes, newlines, and empty cells in CSV", () => {
  expect(encodeCsv([["Résumé, draft", 'Say "hi"', "one\ntwo", null]])).toBe(
    '"Résumé, draft","Say ""hi""","one\ntwo",""\r\n',
  );
});

it("neutralizes leading formula markers in text without changing typed numbers", () => {
  expect(encodeCsv([["=1+1", " +10", "-12", "@text", "\tname", -12, false]])).toBe(
    `"'=1+1","' +10","'-12","'@text","'\tname","-12","false"\r\n`,
  );
});

it("parses quoted CSV with commas, quotes, and newlines", () => {
  const csv = `"a,b","c""d","e\nf",""\r\n`;
  expect(parseCsv(csv)).toEqual([["a,b", 'c"d', "e\nf", ""]]);
});

it("round-trips encode → parse with formula neutralization", () => {
  const rows = [["=2+2", "normal", " +10", "\tindented"]];
  const encoded = encodeCsv(rows);
  const parsed = parseCsv(encoded);
  // deescapeFormula should bring back original for import
  const deescaped = parsed[0].map(deescapeFormula);
  expect(deescaped).toEqual(["=2+2", "normal", " +10", "\tindented"]);
});

it("parses header and rows, stripping BOM", () => {
  const csv = `\uFEFF"Task name","Status"\r\n"My task","TO DO"\r\n`;
  const { header, rows } = parseCsvWithHeader(csv);
  expect(header).toEqual(["Task name", "Status"]);
  expect(rows).toEqual([["My task", "TO DO"]]);
});

it("handles empty lines and missing columns", () => {
  const csv = `"Task name","Status"\r\n"Only name"\r\n\r\n"Second","DONE"\r\n`;
  const { header, rows } = parseCsvWithHeader(csv);
  expect(header).toEqual(["Task name", "Status"]);
  // parse preserves blank line as [""] and missing column as ["Only name"]
  expect(rows.length).toBe(3);
  expect(rows[0][0]).toBe("Only name");
  expect(rows[1]).toEqual([""]);
  expect(rows[2]).toEqual(["Second", "DONE"]);
});
