/**
 * Responsabilidade: Funções utilitárias de permissoes, sem responsabilidade de interface.
 */
const PERFIS = {
  USUARIO: 'usuario',
  TECNICO: 'tecnico',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin',
  DESENVOLVEDOR: 'desenvolvedor',
};

function normalizarPerfil(perfil) {
  const valor = String(perfil || 'usuario').trim().toLowerCase();
  if (valor === 'super_admin' || valor === 'dev' || valor === 'developer') return PERFIS.DESENVOLVEDOR;
  if (valor === PERFIS.TECNICO) return PERFIS.TECNICO;
  if (valor === PERFIS.SUPERVISOR) return PERFIS.SUPERVISOR;
  if (valor === PERFIS.ADMIN) return PERFIS.ADMIN;
  if (valor === PERFIS.DESENVOLVEDOR) return PERFIS.DESENVOLVEDOR;
  return PERFIS.USUARIO;
}

function perfilLegado(perfil) {
  return normalizarPerfil(perfil);
}

function ehUsuarioComum(perfil) {
  return normalizarPerfil(perfil) === PERFIS.USUARIO;
}

function ehTecnico(perfil) {
  return normalizarPerfil(perfil) === PERFIS.TECNICO;
}

function ehAdmin(perfil) {
  const p = normalizarPerfil(perfil);
  return p === PERFIS.ADMIN || p === PERFIS.DESENVOLVEDOR;
}

function ehDesenvolvedor(perfil) {
  return normalizarPerfil(perfil) === PERFIS.DESENVOLVEDOR;
}

function ehEquipe(perfil) {
  const p = normalizarPerfil(perfil);
  return [PERFIS.TECNICO, PERFIS.SUPERVISOR, PERFIS.ADMIN, PERFIS.DESENVOLVEDOR].includes(p);
}

function temPerfil(perfilAtual, perfisPermitidos = []) {
  const atual = normalizarPerfil(perfilAtual);
  return perfisPermitidos.map(normalizarPerfil).includes(atual);
}

module.exports = {
  PERFIS,
  normalizarPerfil,
  perfilLegado,
  ehUsuarioComum,
  ehTecnico,
  ehAdmin,
  ehDesenvolvedor,
  ehEquipe,
  temPerfil,
};
