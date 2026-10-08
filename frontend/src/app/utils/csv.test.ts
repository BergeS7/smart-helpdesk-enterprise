import { describe, expect, it } from "vitest";
import { celulaCsv } from "./csv";

describe("celulaCsv", () => {
  it("texto que começa como fórmula ganha apóstrofo", () => {
    expect(celulaCsv('=HYPERLINK("http://x";"Clique")')).toBe(`"'=HYPERLINK(""http://x"";""Clique"")"`);
    expect(celulaCsv("@SOMA(A1)")).toBe(`"'@SOMA(A1)"`);
  });

  it("texto comum e números ficam como estão", () => {
    expect(celulaCsv("Ana Souza")).toBe('"Ana Souza"');
    expect(celulaCsv(-5)).toBe('"-5"');
    expect(celulaCsv(4.8)).toBe('"4.8"');
  });
});
