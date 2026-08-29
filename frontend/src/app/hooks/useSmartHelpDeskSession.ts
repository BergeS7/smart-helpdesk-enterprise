/**
 * Responsabilidade: Hook React de use smart help desk session; encapsula estado e efeitos reutilizáveis.
 */
import { useCallback, useEffect, useState } from "react";
import {
  atualizarUsuarioLocal,
  getSessaoPersistida,
  limparSessao,
  obterMeuPerfil,
  obterMinhasPermissoes,
  type UsuarioLogado,
} from "../services/api";

export function useSmartHelpDeskSession() {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [usuarioEntrando, setUsuarioEntrando] = useState<UsuarioLogado | null>(null);
  const [sessaoVerificada, setSessaoVerificada] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!getSessaoPersistida()) {
      setSessaoVerificada(true);
      return () => { ativo = false; };
    }
    obterMeuPerfil()
      .then((perfil) => {
        if (!ativo) return;
        atualizarUsuarioLocal(perfil);
        setUsuario(perfil);
      })
      .catch(() => {
        if (!ativo) return;
        limparSessao();
        setUsuario(null);
      })
      .finally(() => { if (ativo) setSessaoVerificada(true); });
    return () => { ativo = false; };
  }, []);

  const logout = useCallback(() => {
    limparSessao();
    setUsuario(null);
  }, []);

  const authenticated = useCallback(async (nextUser: UsuarioLogado) => {
    setUsuarioEntrando(nextUser);
    await Promise.allSettled([obterMeuPerfil(), obterMinhasPermissoes()]);
    setUsuario(nextUser);
    setUsuarioEntrando(null);
  }, []);

  return { usuario, setUsuario, usuarioEntrando, sessaoVerificada, logout, authenticated };
}

