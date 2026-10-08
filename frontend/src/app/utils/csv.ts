/**
 * Responsabilidade: célula de CSV segura para abrir no Excel (mesma regra de backend/src/utils/csv.js).
 * Texto que começa com = + - @ (ou tabulação/retorno) ganha um apóstrofo para não virar fórmula.
 */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

export function celulaCsv(valor: unknown) {
  let texto = String(valor ?? "");
  if (typeof valor !== "number" && INICIO_DE_FORMULA.test(texto)) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
}
