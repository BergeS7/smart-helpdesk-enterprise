/**
 * Responsabilidade: guarda a empresa da requisição atual para que o banco aplique o isolamento.
 *
 * Dentro de executarComoEmpresa, toda consulta roda com o papel restrito helpdesk_empresa e a
 * Row Level Security só mostra e só aceita linhas daquela empresa. Fora dele (login, rotas
 * públicas, rotinas agendadas, migrations) a conexão fica com o usuário dono do banco.
 */
const { AsyncLocalStorage } = require("node:async_hooks");

// Empresa que recebeu os dados existentes na migração para multiempresa.
const EMPRESA_PRINCIPAL = 1;

const armazenamento = new AsyncLocalStorage();

function validarEmpresa(empresaId) {
  const id = Number(empresaId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Empresa inválida para o contexto do banco.");
  return id;
}

function executarComoEmpresa(empresaId, fn) {
  return armazenamento.run({ empresaId: validarEmpresa(empresaId) }, fn);
}

// Para o que é da plataforma, mesmo quando disparado dentro de uma requisição (DDL, chaves do push).
function executarComoSistema(fn) {
  return armazenamento.run({ empresaId: null }, fn);
}

function empresaAtual() {
  return armazenamento.getStore()?.empresaId ?? null;
}

module.exports = { EMPRESA_PRINCIPAL, executarComoEmpresa, executarComoSistema, empresaAtual };
