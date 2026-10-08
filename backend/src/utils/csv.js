/**
 * Responsabilidade: célula de CSV segura para abrir no Excel.
 * Texto que começa com = + - @ (ou tabulação/retorno) vira fórmula no Excel: um título de chamado
 * como =HYPERLINK(...) viraria um link clicável. O apóstrofo na frente faz o Excel mostrar como texto.
 * Números ficam como estão (negativos continuam números).
 */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

function celulaCsv(valor) {
  let texto = String(valor ?? "");
  if (typeof valor !== "number" && INICIO_DE_FORMULA.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

module.exports = { celulaCsv };
