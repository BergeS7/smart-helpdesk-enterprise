/**
 * Responsabilidade: Módulo de openapi; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
// Documento OpenAPI estático, escrito a partir da leitura real das rotas em
// backend/src/routes/*.js e montado no app.js. Cobre método, caminho,
// autenticação exigida e agrupamento por domínio; não inventa endpoints nem
// contratos que não existem no código.
const bearerAuth = [{ bearerAuth: [] }];

function op(summary, { auth = true, tags, params = [] } = {}) {
  const parameters = params.map((name) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
  return {
    summary,
    tags,
    parameters: parameters.length ? parameters : undefined,
    security: auth ? bearerAuth : [],
    responses: {
      200: { description: "Sucesso" },
      400: { description: "Requisição inválida" },
      401: { description: "Não autenticado" },
      403: { description: "Sem permissão" },
      404: { description: "Não encontrado" },
      429: { description: "Muitas tentativas" },
    },
  };
}

const openapiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Smart HelpDesk Enterprise API",
    version: "1.0.0",
    description:
      "Documentação gerada a partir das rotas reais do backend. Autenticação via Bearer JWT (`Authorization: Bearer <token>`), exceto nos endpoints marcados como públicos.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  tags: [
    { name: "Auth" },
    { name: "Usuários" },
    { name: "Chamados" },
    { name: "Dashboard" },
    { name: "Catálogos" },
    { name: "Notificações" },
    { name: "Configurações" },
    { name: "Avisos" },
    { name: "Times" },
    { name: "Performance" },
    { name: "Ativos" },
    { name: "Permissões" },
    { name: "Sistema" },
  ],
  paths: {
    "/health": { get: op("Health check", { auth: false, tags: ["Sistema"] }) },
    "/system/health": { get: op("Health check (namespace system)", { auth: false, tags: ["Sistema"] }) },
    "/system/diagnostics": { get: op("Diagnóstico administrativo (perfil desenvolvedor)", { tags: ["Sistema"] }) },
    "/system/errors/frontend": { post: op("Registrar erro reportado pelo frontend", { tags: ["Sistema"] }) },

    "/auth/login": { post: op("Login genérico", { auth: false, tags: ["Auth"] }) },
    "/auth/login/usuario": { post: op("Login de usuário", { auth: false, tags: ["Auth"] }) },
    "/auth/login/admin": { post: op("Login de administrador", { auth: false, tags: ["Auth"] }) },
    "/auth/recuperar-senha": { post: op("Solicitar recuperação de senha", { auth: false, tags: ["Auth"] }) },
    "/auth/redefinir-senha": { post: op("Redefinir senha", { auth: false, tags: ["Auth"] }) },

    "/usuarios/primeiro-admin": { post: op("Criar o primeiro administrador", { auth: false, tags: ["Usuários"] }) },
    "/usuarios/cadastro": { post: op("Cadastro público de usuário", { auth: false, tags: ["Usuários"] }) },
    "/usuarios/verificar-email": { post: op("Verificar e-mail", { auth: false, tags: ["Usuários"] }) },
    "/usuarios/reenviar-verificacao": { post: op("Reenviar verificação de e-mail", { auth: false, tags: ["Usuários"] }) },
    "/usuarios/me": {
      get: op("Obter meu perfil", { tags: ["Usuários"] }),
      put: op("Atualizar meu perfil", { tags: ["Usuários"] }),
    },
    "/usuarios/me/foto": {
      patch: op("Atualizar minha foto de perfil", { tags: ["Usuários"] }),
      delete: op("Remover minha foto de perfil", { tags: ["Usuários"] }),
    },
    "/usuarios": {
      get: op("Listar usuários (técnico/admin/desenvolvedor)", { tags: ["Usuários"] }),
      post: op("Criar usuário (admin/desenvolvedor)", { tags: ["Usuários"] }),
    },
    "/usuarios/{id}": {
      put: op("Atualizar usuário (desenvolvedor)", { tags: ["Usuários"], params: ["id"] }),
      delete: op("Remover usuário", { tags: ["Usuários"], params: ["id"] }),
    },
    "/usuarios/{id}/aprovar": { patch: op("Aprovar usuário", { tags: ["Usuários"], params: ["id"] }) },
    "/usuarios/{id}/rejeitar": { patch: op("Rejeitar usuário", { tags: ["Usuários"], params: ["id"] }) },

    "/chamados": {
      get: op("Listar chamados (perfis com fila)", { tags: ["Chamados"] }),
      post: op("Criar chamado", { tags: ["Chamados"] }),
    },
    "/chamados/usuario/me": { get: op("Listar meus chamados", { tags: ["Chamados"] }) },
    "/chamados/relatorios/resumo/metricas": { get: op("Resumo de métricas de relatórios", { tags: ["Chamados"] }) },
    "/chamados/relatorios/{formato}": { get: op("Exportar relatório de chamados", { tags: ["Chamados"], params: ["formato"] }) },
    "/chamados/respostas-rapidas/lista": { get: op("Listar respostas rápidas", { tags: ["Chamados"] }) },
    "/chamados/respostas-rapidas": { post: op("Criar resposta rápida", { tags: ["Chamados"] }) },
    "/chamados/filtros-salvos/lista": { get: op("Listar filtros salvos", { tags: ["Chamados"] }) },
    "/chamados/filtros-salvos": { post: op("Salvar filtro", { tags: ["Chamados"] }) },
    "/chamados/filtros-salvos/{id}": { delete: op("Excluir filtro salvo", { tags: ["Chamados"], params: ["id"] }) },
    "/chamados/{id}/historico.pdf": { get: op("Baixar histórico do chamado em PDF", { tags: ["Chamados"], params: ["id"] }) },
    "/chamados/{id}": {
      get: op("Buscar chamado por id", { tags: ["Chamados"], params: ["id"] }),
      patch: op("Atualizar chamado", { tags: ["Chamados"], params: ["id"] }),
      delete: op("Excluir chamado (desenvolvedor)", { tags: ["Chamados"], params: ["id"] }),
    },
    "/chamados/{id}/assumir": { patch: op("Assumir chamado", { tags: ["Chamados"], params: ["id"] }) },
    "/chamados/{id}/encerrar": { patch: op("Encerrar chamado", { tags: ["Chamados"], params: ["id"] }) },
    "/chamados/{id}/reabrir": { patch: op("Reabrir chamado", { tags: ["Chamados"], params: ["id"] }) },
    "/chamados/{id}/comentarios": {
      get: op("Listar comentários", { tags: ["Chamados"], params: ["id"] }),
      post: op("Adicionar comentário", { tags: ["Chamados"], params: ["id"] }),
    },
    "/chamados/{id}/anexos": {
      get: op("Listar anexos", { tags: ["Chamados"], params: ["id"] }),
      post: op("Adicionar anexos (multipart, máx. 5 arquivos)", { tags: ["Chamados"], params: ["id"] }),
    },
    "/chamados/{id}/anexos/{anexoId}/download": {
      get: op("Baixar anexo autenticado", { tags: ["Chamados"], params: ["id", "anexoId"] }),
    },
    "/chamados/{id}/movimentacoes": { get: op("Listar movimentações", { tags: ["Chamados"], params: ["id"] }) },
    "/chamados/{id}/avaliar": { post: op("Avaliar chamado encerrado", { tags: ["Chamados"], params: ["id"] }) },

    "/dashboard": { get: op("Obter dados do dashboard", { tags: ["Dashboard"] }) },

    "/catalogos/base-conhecimento": {
      get: op("Listar base de conhecimento", { tags: ["Catálogos"] }),
      post: op("Criar artigo da base de conhecimento", { tags: ["Catálogos"] }),
    },
    "/catalogos/base-conhecimento/{id}": { put: op("Atualizar artigo", { tags: ["Catálogos"], params: ["id"] }) },
    "/catalogos/base-conhecimento/{id}/visualizar": { post: op("Registrar visualização do artigo", { tags: ["Catálogos"], params: ["id"] }) },
    "/catalogos/base-conhecimento/{id}/avaliar": { post: op("Avaliar artigo", { tags: ["Catálogos"], params: ["id"] }) },
    "/catalogos/{tipo}": {
      get: op("Listar catálogo por tipo", { tags: ["Catálogos"], params: ["tipo"] }),
      post: op("Criar item de catálogo (admin/desenvolvedor)", { tags: ["Catálogos"], params: ["tipo"] }),
    },
    "/catalogos/{tipo}/{id}": { put: op("Atualizar item de catálogo", { tags: ["Catálogos"], params: ["tipo", "id"] }) },

    "/notificacoes": { get: op("Listar notificações", { tags: ["Notificações"] }) },
    "/notificacoes/ler": { patch: op("Marcar todas como lidas", { tags: ["Notificações"] }) },
    "/notificacoes/{id}/ler": { patch: op("Marcar notificação como lida", { tags: ["Notificações"], params: ["id"] }) },

    "/configuracoes": {
      get: op("Obter configurações do sistema", { auth: false, tags: ["Configurações"] }),
      put: op("Salvar configurações (desenvolvedor)", { tags: ["Configurações"] }),
    },
    "/configuracoes/logo": { patch: op("Atualizar logo do sistema", { tags: ["Configurações"] }) },
    "/configuracoes/logo1": { patch: op("Atualizar logo alternativa", { tags: ["Configurações"] }) },

    "/avisos/ativos": { get: op("Listar avisos ativos", { auth: false, tags: ["Avisos"] }) },
    "/avisos/admin": { get: op("Listar avisos (equipe)", { tags: ["Avisos"] }) },
    "/avisos": { post: op("Criar aviso de manutenção (desenvolvedor)", { tags: ["Avisos"] }) },
    "/avisos/{id}": {
      put: op("Atualizar aviso", { tags: ["Avisos"], params: ["id"] }),
      delete: op("Excluir aviso", { tags: ["Avisos"], params: ["id"] }),
    },

    "/teams/users/search": { get: op("Buscar usuários para times", { tags: ["Times"] }) },
    "/teams": {
      get: op("Listar times", { tags: ["Times"] }),
      post: op("Criar time (admin/desenvolvedor/super_admin)", { tags: ["Times"] }),
    },
    "/teams/{id}": {
      get: op("Detalhar time", { tags: ["Times"], params: ["id"] }),
      patch: op("Atualizar time", { tags: ["Times"], params: ["id"] }),
      delete: op("Remover time", { tags: ["Times"], params: ["id"] }),
    },
    "/teams/{id}/members": {
      get: op("Listar membros do time", { tags: ["Times"], params: ["id"] }),
      post: op("Adicionar membro ao time", { tags: ["Times"], params: ["id"] }),
    },
    "/teams/{id}/members/{userId}": { delete: op("Remover membro do time", { tags: ["Times"], params: ["id", "userId"] }) },
    "/teams/{id}/manager": { put: op("Alterar gestor do time", { tags: ["Times"], params: ["id"] }) },

    "/performance/tickets/{id}/rating": {
      get: op("Consultar avaliação do chamado", { tags: ["Performance"], params: ["id"] }),
      post: op("Registrar avaliação do chamado", { tags: ["Performance"], params: ["id"] }),
    },
    "/performance/me": { get: op("Meu dashboard de performance", { tags: ["Performance"] }) },
    "/performance/technicians/{id}": { get: op("Dashboard de performance do técnico", { tags: ["Performance"], params: ["id"] }) },
    "/performance/teams/{id}": { get: op("Dashboard de performance do time", { tags: ["Performance"], params: ["id"] }) },
    "/performance/company": { get: op("Dashboard de performance da empresa", { tags: ["Performance"] }) },
    "/performance/ranking": { get: op("Ranking de performance", { tags: ["Performance"] }) },

    "/assets/agent/locations": { get: op("Localidades para o agente (com limite de tentativas)", { auth: false, tags: ["Ativos"] }) },
    "/assets/agent/enroll": { post: op("Registrar agente (com limite de tentativas)", { auth: false, tags: ["Ativos"] }) },
    "/assets/agent/heartbeat": { post: op("Heartbeat do agente (token de agente)", { auth: false, tags: ["Ativos"] }) },
    "/assets/agent/report": { post: op("Reportar inventário (token de agente)", { auth: false, tags: ["Ativos"] }) },
    "/assets/admin/invites": { post: op("Criar convite de agente (admin/desenvolvedor)", { tags: ["Ativos"] }) },
    "/assets/admin/locations": {
      get: op("Listar localidades administráveis", { tags: ["Ativos"] }),
      post: op("Salvar localidade", { tags: ["Ativos"] }),
    },
    "/assets": { get: op("Listar ativos", { tags: ["Ativos"] }) },
    "/assets/{id}": { get: op("Detalhar ativo", { tags: ["Ativos"], params: ["id"] }) },
    "/assets/{id}/inventory": { get: op("Inventário do ativo", { tags: ["Ativos"], params: ["id"] }) },
    "/assets/{id}/history": { get: op("Histórico do ativo", { tags: ["Ativos"], params: ["id"] }) },
    "/assets/{id}/changes": { get: op("Mudanças detectadas do ativo", { tags: ["Ativos"], params: ["id"] }) },
    "/assets/{id}/snapshots": { get: op("Snapshots do ativo", { tags: ["Ativos"], params: ["id"] }) },
    "/assets/{id}/snapshots/{snapshotId}": { get: op("Detalhar snapshot", { tags: ["Ativos"], params: ["id", "snapshotId"] }) },
    "/assets/{id}/alerts": { get: op("Alertas do ativo", { tags: ["Ativos"], params: ["id"] }) },
    "/assets/{id}/alerts/{alertId}/acknowledge": { patch: op("Confirmar alerta", { tags: ["Ativos"], params: ["id", "alertId"] }) },
    "/assets/{id}/location": { patch: op("Atualizar localização do ativo", { tags: ["Ativos"], params: ["id"] }) },
    "/assets/{id}/status": { patch: op("Atualizar status do ativo", { tags: ["Ativos"], params: ["id"] }) },

    "/permissoes/me": { get: op("Minhas permissões", { tags: ["Permissões"] }) },
    "/permissoes/catalog": { get: op("Catálogo de permissões (admin/desenvolvedor)", { tags: ["Permissões"] }) },
    "/permissoes/users/{id}": {
      get: op("Permissões de um usuário", { tags: ["Permissões"], params: ["id"] }),
      put: op("Atualizar permissões de um usuário", { tags: ["Permissões"], params: ["id"] }),
    },
  },
};

module.exports = { openapiDocument };
