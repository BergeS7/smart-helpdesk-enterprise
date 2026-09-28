/**
 * Responsabilidade: página pública /ativar/<código>: o responsável pela empresa cria a senha e vira o administrador.
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Building2, CheckCircle2, RefreshCw } from "lucide-react";
import { Toaster, toast } from "sonner";
import { openLegalDocument } from "../../components/LegalComplianceLayer";
import { Button, Field, Input } from "../../components/shared/FormPrimitives";
import { ativarConviteEmpresa, consultarConviteEmpresa, type ConfiguracoesSistema } from "../../services/api";
import { SystemThemeStyle, logoSistema1, nomeSistema, variaveisTemaSistema } from "../comum/appShared";

type Estado =
  | { etapa: "carregando" }
  | { etapa: "invalido"; mensagem: string }
  | { etapa: "formulario"; empresa: string; email: string }
  | { etapa: "concluido"; email: string; empresa: string };

export function AtivacaoEmpresa({ token, configSistema }: { token: string; configSistema: ConfiguracoesSistema }) {
  const [estado, setEstado] = useState<Estado>({ etapa: "carregando" });
  const [form, setForm] = useState({ nome: "", senha: "", telefone: "", cargo: "", aceitaTermos: false });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    consultarConviteEmpresa(token)
      .then(({ empresa, email }) => setEstado({ etapa: "formulario", empresa: empresa.nome, email }))
      .catch((error) => setEstado({ etapa: "invalido", mensagem: error instanceof Error ? error.message : "Link de liberação inválido." }));
  }, [token]);

  async function ativar(event: FormEvent) {
    event.preventDefault();
    if (estado.etapa !== "formulario") return;
    setEnviando(true);
    try {
      const resposta = await ativarConviteEmpresa(token, form);
      setEstado({ etapa: "concluido", email: resposta.email, empresa: resposta.empresa.nome });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível liberar o acesso.");
    } finally {
      setEnviando(false);
    }
  }

  // Volta para a raiz, onde a tela de login aparece.
  const irParaLogin = () => window.location.assign("/");

  return (
    <div
      className="smart-helpdesk-config-theme grid min-h-screen place-items-center bg-gradient-to-br from-[#073b66] via-[#087fa8] to-[#17a9d4] p-4"
      style={variaveisTemaSistema(configSistema)}
    >
      <SystemThemeStyle />
      <Toaster position="top-right" richColors />
      <div className="w-full max-w-[460px] rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src={logoSistema1(configSistema)} alt={nomeSistema(configSistema)} className="h-10 w-10 object-contain" />
          <h1 className="text-xl font-black text-slate-900">{nomeSistema(configSistema)}</h1>
        </div>

        {estado.etapa === "carregando" && (
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500"><RefreshCw size={16} className="animate-spin" /> Conferindo o link…</p>
        )}

        {estado.etapa === "invalido" && (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-black text-slate-900">Link indisponível</h2>
            <p className="text-sm text-slate-600">{estado.mensagem} Peça um novo link a quem liberou o acesso da sua empresa.</p>
            <Button type="button" variant="secondary" className="w-full" onClick={irParaLogin}>Ir para o login</Button>
          </div>
        )}

        {estado.etapa === "concluido" && (
          <div className="space-y-4 text-center">
            <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
            <h2 className="text-xl font-black text-slate-900">Acesso liberado</h2>
            <p className="text-sm text-slate-600">
              Você é o administrador de <b>{estado.empresa}</b>. Entre com <b>{estado.email}</b> e a senha que acabou de criar.
            </p>
            <Button type="button" className="w-full" onClick={irParaLogin}>Entrar no sistema</Button>
          </div>
        )}

        {estado.etapa === "formulario" && (
          <form onSubmit={ativar} className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-black text-slate-900"><Building2 size={16} /> {estado.empresa}</p>
              <p className="mt-1">Crie sua senha para administrar a empresa. Seu acesso será <b>{estado.email}</b>.</p>
            </div>
            <Field label="Seu nome">
              <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field label="Senha (mínimo de 8 caracteres)">
              <Input required type="password" minLength={8} autoComplete="new-password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telefone (opcional)">
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </Field>
              <Field label="Cargo (opcional)">
                <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input required type="checkbox" className="mt-1" checked={form.aceitaTermos} onChange={(e) => setForm({ ...form, aceitaTermos: e.target.checked })} />
              <span>
                Li e aceito os{" "}
                <button type="button" onClick={() => openLegalDocument("terms")} className="font-black text-blue-700 underline">Termos de Uso</button>{" "}
                e tomei ciência da{" "}
                <button type="button" onClick={() => openLegalDocument("privacy")} className="font-black text-blue-700 underline">Política de Privacidade</button>.
              </span>
            </label>
            <Button type="submit" disabled={enviando} className="w-full">{enviando ? "Liberando acesso…" : "Criar senha e liberar acesso"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
