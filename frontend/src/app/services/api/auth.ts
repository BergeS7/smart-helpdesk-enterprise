/**
 * Responsabilidade: login, cadastro público, verificação de e-mail e recuperação de senha.
 */
import { request } from "./http";
import type { ApiUsuario, LoginResposta } from "./http";
import type { NovoCadastroUsuario } from "./types";

export function login(email: string, senha: string) {
  return request<LoginResposta>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, senha }),
  });
}

export function loginUsuario(email: string, senha: string) {
  return request<LoginResposta>("/auth/login/usuario", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, senha }),
  });
}

export function loginAdmin(email: string, senha: string) {
  return request<LoginResposta>("/auth/login/admin", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, senha }),
  });
}

export function solicitarRecuperacaoSenha(email: string) {
  return request<{ mensagem: string }>(
    "/auth/recuperar-senha",
    { method: "POST", auth: false, body: JSON.stringify({ email }) },
  );
}

export function redefinirSenha(
  email: string,
  codigo: string,
  novaSenha: string,
) {
  return request<{ mensagem: string }>("/auth/redefinir-senha", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, codigo, novaSenha }),
  });
}

export function cadastrarUsuarioPublico(dados: NovoCadastroUsuario) {
  return request<{ mensagem: string; usuario: ApiUsuario; requer_verificacao_email?: boolean }>(
    "/usuarios/cadastro",
    { method: "POST", auth: false, body: JSON.stringify(dados) },
  );
}

export function verificarEmailCadastro(email: string, codigo: string) {
  return request<{ mensagem: string }>("/usuarios/verificar-email", {
    method: "POST", auth: false, body: JSON.stringify({ email, codigo }),
  });
}

export function reenviarVerificacaoEmail(email: string) {
  return request<{ mensagem: string }>("/usuarios/reenviar-verificacao", {
    method: "POST", auth: false, body: JSON.stringify({ email }),
  });
}
