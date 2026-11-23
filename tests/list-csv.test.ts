import { expect, it } from "vitest";
import { encodeCsv } from "@/lib/list-csv";

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
