/**
 * Responsabilidade: célula de CSV não vira fórmula ao abrir no Excel.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { celulaCsv } = require("../src/utils/csv");

test("texto que começa como fórmula ganha apóstrofo", () => {
  assert.equal(celulaCsv('=HYPERLINK("http://x";"Clique")'), `"'=HYPERLINK(""http://x"";""Clique"")"`);
  for (const inicio of ["+", "-", "@", "\t", "\r"]) assert.equal(celulaCsv(`${inicio}1`), `"'${inicio}1"`);
});

test("texto comum, números e vazios ficam como estão", () => {
  assert.equal(celulaCsv("Impressora sem toner"), '"Impressora sem toner"');
  assert.equal(celulaCsv("CH-0042"), '"CH-0042"');
  assert.equal(celulaCsv(-5), '"-5"');
  assert.equal(celulaCsv(42), '"42"');
  assert.equal(celulaCsv(null), '""');
  assert.equal(celulaCsv(undefined), '""');
});
