/**
 * Responsabilidade: Funções utilitárias de permissoes, sem responsabilidade de interface.
 */
const PERFIS = {
  USUARIO: 'usuario',
  TECNICO: 'tecnico',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin',
};

// O antigo perfil "desenvolvedor" (e seus apelidos) virou o admin da empresa.
const PERFIS_LEGADOS_DE_ADMIN = ['desenvolvedor', 'developer', 'dev', 'super_admin', 'administrador'];

function normalizarPerfil(perfil) {
  const valor = String(perfil || 'usuario').trim().toLowerCase();
  if (PERFIS_LEGADOS_DE_ADMIN.includes(valor)) return PERFIS.ADMIN;
  if (valor === PERFIS.TECNICO) return PERFIS.TECNICO;
  if (valor === PERFIS.SUPERVISOR) return PERFIS.SUPERVISOR;
  if (valor === PERFIS.ADMIN) return PERFIS.ADMIN;
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
  return normalizarPerfil(perfil) === PERFIS.ADMIN;
}

function ehEquipe(perfil) {
  const p = normalizarPerfil(perfil);
  return [PERFIS.TECNICO, PERFIS.SUPERVISOR, PERFIS.ADMIN].includes(p);
}

function temPerfil(perfilAtual, perfisPermitidos = []) {
  const atual = normalizarPerfil(perfilAtual);
  return perfisPermitidos.map(normalizarPerfil).includes(atual);
}

// Dono da plataforma SaaS: não é um perfil, é uma conta específica definida por ambiente.
function emailDonoPlataforma() {
  return String(process.env.PLATFORM_OWNER_EMAIL || '').trim().toLowerCase();
}

function ehEmailDonoPlataforma(email) {
  const dono = emailDonoPlataforma();
  return Boolean(dono) && String(email || '').trim().toLowerCase() === dono;
}

// Exige e-mail verificado para que um cadastro com o mesmo endereço, ainda não confirmado, não herde o acesso.
function ehDonoPlataforma(usuario) {
  return Boolean(usuario?.email_verificado_em) && ehEmailDonoPlataforma(usuario?.email);
}

module.exports = {
  PERFIS,
  normalizarPerfil,
  perfilLegado,
  ehUsuarioComum,
  ehTecnico,
  ehAdmin,
  ehEquipe,
  temPerfil,
  emailDonoPlataforma,
  ehEmailDonoPlataforma,
  ehDonoPlataforma,
};
