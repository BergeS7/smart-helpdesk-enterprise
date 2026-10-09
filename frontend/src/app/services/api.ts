/**
 * Responsabilidade: ponto único de importação da API do frontend.
 * O código fica dividido por área em ./api/*; este arquivo só reexporta, para os imports existentes continuarem iguais.
 */
export { API_URL, ApiError, getToken, getUsuarioLogado, salvarSessao, atualizarUsuarioLocal, limparSessao, getSessaoPersistida } from "./api/http";
export type { PerfilUsuario, UsuarioLogado, ApiUsuario, LoginResposta, RecursoPlano } from "./api/http";
export * from "./api/types";
export * from "./api/auth";
export * from "./api/usuarios";
export * from "./api/chamados";
export * from "./api/teams";
export * from "./api/performance";
export * from "./api/relatorios";
export * from "./api/conhecimento";
export * from "./api/sistema";
export * from "./api/desenvolvimento";
export * from "./api/assistente";
export * from "./api/plataforma";
