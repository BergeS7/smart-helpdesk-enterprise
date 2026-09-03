/** Valida o tamanho mínimo das senhas de cadastro e redefinição. */
function senhaValida(senha) {
  return typeof senha === "string" && senha.length >= 8;
}

module.exports = { senhaValida };
