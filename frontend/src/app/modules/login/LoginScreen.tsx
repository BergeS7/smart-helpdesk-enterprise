/**
 * Responsabilidade: tela de login, cadastro, verificação de e-mail e recuperação de senha.
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { openLegalDocument } from "../../components/LegalComplianceLayer";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck, User } from "lucide-react";
import { Toaster, toast } from "sonner";
import { municipiosMaranhao } from "../../data/municipiosMaranhao";
import { Button, Field, Input } from "../../components/shared/FormPrimitives";
import { cadastrarUsuarioPublico, verificarEmailCadastro, reenviarVerificacaoEmail, login, redefinirSenha, salvarSessao, solicitarRecuperacaoSenha, type ApiAvisoSistema, type ConfiguracoesSistema, type UsuarioLogado } from "../../services/api";
import { AvisosSistemaBanner, SystemThemeStyle, logoSistema1, nomeSistema, normalizarPerfilApp, variaveisTemaSistema } from "../comum/appShared";
import type { LoginMode, TelaAuth } from "../comum/appShared";

// Jornada pública de autenticação, recuperação e primeiro acesso.
export function LoginScreen({
  onLogin,
  configSistema,
  avisosSistema,
}: {
  onLogin: (usuario: UsuarioLogado) => void;
  configSistema: ConfiguracoesSistema;
  avisosSistema: ApiAvisoSistema[];
}) {
  const [mode, setMode] = useState<LoginMode>("usuario");
  const [tela, setTela] = useState<TelaAuth>("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [cadastro, setCadastro] = useState({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
    departamento: "",
    municipio: "",
    unidade: "",
    cargo: "",
    aceitaTermos: false,
  });
  const [recuperar, setRecuperar] = useState({
    email: "",
    codigo: "",
    novaSenha: "",
  });
  const [verificacao, setVerificacao] = useState({ email: "", codigo: "" });

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const resposta = await login(email, senha);

      const usuarioNormalizado = {
        ...resposta.usuario,
        perfil: normalizarPerfilApp(
          resposta.usuario.perfil,
        ) as UsuarioLogado["perfil"],
      };

      const sessaoNormalizada = {
        ...resposta,
        usuario: usuarioNormalizado,
      };

      salvarSessao(sessaoNormalizada);
      toast.success("Login realizado com sucesso.");
      onLogin(usuarioNormalizado);
    } catch (error) {
      if (error instanceof Error && error.message === "Confirme seu e-mail antes de entrar.") {
        setVerificacao({ email: email.trim().toLowerCase(), codigo: "" });
        setTela("verificar");
      }
      toast.error(
        error instanceof Error ? error.message : "Erro ao fazer login.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCadastro(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const resposta = await cadastrarUsuarioPublico(cadastro);
      toast.success(resposta.mensagem);
      setVerificacao({ email: cadastro.email, codigo: "" });
      setTela("verificar");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao solicitar cadastro.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerificarEmail(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const resposta = await verificarEmailCadastro(verificacao.email, verificacao.codigo);
      toast.success(resposta.mensagem);
      setEmail(verificacao.email);
      setTela("login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao confirmar e-mail.");
    } finally { setLoading(false); }
  }

  async function handleReenviarVerificacao() {
    setLoading(true);
    try {
      const resposta = await reenviarVerificacaoEmail(verificacao.email);
      toast.success(resposta.mensagem);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reenviar código.");
    } finally { setLoading(false); }
  }

  async function handleRecuperar(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (!recuperar.codigo) {
        const resp = await solicitarRecuperacaoSenha(recuperar.email);
        toast.success(resp.mensagem);
      } else {
        await redefinirSenha(
          recuperar.email,
          recuperar.codigo,
          recuperar.novaSenha,
        );
        toast.success("Senha redefinida. Faça login novamente.");
        setTela("login");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro na recuperação.",
      );
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = mode === "admin";
  const sistemaNome = nomeSistema(configSistema);
  const sistemaLogo = logoSistema1(configSistema);

  return (
    <div
      className="smart-helpdesk-config-theme min-h-screen overflow-x-hidden bg-gradient-to-br from-[#073b66] via-[#087fa8] to-[#17a9d4]"
      style={variaveisTemaSistema(configSistema)}
    >
      <SystemThemeStyle />
      <Toaster position="top-right" richColors />
      <div className="fixed inset-x-0 top-4 z-40 mx-auto w-[min(920px,calc(100vw-32px))]">
        <AvisosSistemaBanner avisos={avisosSistema} />
      </div>
      <div className="grid min-h-screen w-full grid-cols-1 lg:h-screen lg:grid-cols-[46%_54%] lg:overflow-hidden lg:bg-white">
        <section className="relative z-10 order-2 -mt-10 flex min-h-[calc(100vh-270px)] items-start justify-center rounded-t-[42px] bg-white px-6 pb-10 pt-12 shadow-[0_-18px_45px_rgba(21,42,100,.16)] sm:px-10 lg:mt-0 lg:min-h-0 lg:items-center lg:overflow-y-auto lg:rounded-none lg:px-16 lg:py-10 lg:shadow-none">
          <div className="w-full max-w-[440px]">
            <div className="mb-7 flex items-center justify-center gap-3 text-center lg:mb-10">
              <div className="flex h-12 w-12 items-center justify-center">
                <img
                  src={sistemaLogo}
                  alt={sistemaNome}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {sistemaNome}
                </h1>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Central de atendimento
                </p>
              </div>
            </div>

            {tela === "login" && (
              <>
                <div className="mb-7 text-center">
                  <h2 className="text-[28px] font-black tracking-tight text-slate-950 sm:text-3xl">
                    Olá, seja bem-vindo!
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    {isAdmin
                      ? "Entre com suas credenciais para acessar a administração."
                      : "Entre com suas credenciais para acompanhar seus chamados."}
                  </p>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <Field label="E-mail">
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-3 text-zinc-400"
                        size={18}
                      />
                      <Input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={
                          isAdmin ? "admin@empresa.com" : "voce@empresa.com"
                        }
                        className="pl-10"
                      />
                    </div>
                  </Field>
                  <Field label="Senha">
                    <div className="relative">
                      <KeyRound
                        className="absolute left-3 top-3 text-zinc-400"
                        size={18}
                      />
                      <Input
                        required
                        type={mostrarSenha ? "text" : "password"}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Digite sua senha"
                        className="pl-10 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha((visivel) => !visivel)}
                        onMouseDown={(event) => event.preventDefault()}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-zinc-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                        title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={mostrarSenha}
                      >
                        {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </Field>
                  <Button disabled={loading} className="h-14 w-full rounded-2xl text-base shadow-[0_12px_25px_rgba(37,99,235,.22)]">
                    {loading ? "Entrando..." : "Avançar"}
                    <ArrowRight size={18} />
                  </Button>
                </form>
                <div className="mt-6 grid gap-3 text-center">
                  <button
                    onClick={() => setTela("cadastro")}
                    className="text-sm font-bold text-slate-800 transition hover:text-slate-500"
                  >
                    Ainda não tenho conta. Solicitar cadastro
                  </button>
                  <button
                    onClick={() => setTela("recuperar")}
                    className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-zinc-300" />
                  <span className="text-sm text-zinc-400">ou</span>
                  <div className="h-px flex-1 bg-zinc-300" />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMode((prev) => (prev === "admin" ? "usuario" : "admin"))
                  }
                  className={`mx-auto flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${isAdmin ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"}`}
                >
                  {isAdmin ? <User size={17} /> : <ShieldCheck size={17} />}
                  {isAdmin
                    ? "Voltar para login de usuário"
                    : "Entrar como administrador"}
                </button>
              </>
            )}

            {tela === "cadastro" && (
              <form onSubmit={handleCadastro} className="space-y-4">
                <h2 className="text-center text-2xl font-black text-zinc-800">
                  Solicitar cadastro
                </h2>
                <Field label="Nome">
                  <Input
                    required
                    value={cadastro.nome}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, nome: e.target.value })
                    }
                  />
                </Field>
                <Field label="E-mail">
                  <Input
                    required
                    type="email"
                    value={cadastro.email}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Senha">
                  <Input
                    required
                    type="password"
                    minLength={8}
                    title="Use no mínimo 8 caracteres."
                    value={cadastro.senha}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, senha: e.target.value })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefone">
                    <Input
                      value={cadastro.telefone}
                      onChange={(e) =>
                        setCadastro({ ...cadastro, telefone: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Cargo">
                    <Input
                      value={cadastro.cargo}
                      onChange={(e) =>
                        setCadastro({ ...cadastro, cargo: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Departamento">
                  <Input
                    value={cadastro.departamento}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, departamento: e.target.value })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Município">
                    <select required value={cadastro.municipio} onChange={(e) => { const municipio = e.target.value; setCadastro({ ...cadastro, municipio, unidade: municipio ? `Maranhão Motos - ${municipio}` : "" }); }} className="h-10 w-full rounded-md border border-input bg-input-background px-3 text-sm">
                      <option value="">Selecione</option>{municipiosMaranhao.map((item) => <option key={item.nome} value={item.nome}>{item.nome}</option>)}
                    </select>
                  </Field>
                  <Field label="Unidade"><Input readOnly value={cadastro.unidade} placeholder="Definida pelo município" /></Field>
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-zinc-700">
                  <input
                    required
                    type="checkbox"
                    checked={cadastro.aceitaTermos}
                    onChange={(e) =>
                      setCadastro({
                        ...cadastro,
                        aceitaTermos: e.target.checked,
                      })
                    }
                    className="mt-1"
                  />
                  <span>
                    Li e aceito os{" "}
                    <button
                      type="button"
                      onClick={() => openLegalDocument("terms")}
                      className="font-black text-blue-700 underline"
                    >
                      Termos de Uso
                    </button>{" "}
                    e tomei ciência da{" "}
                    <button
                      type="button"
                      onClick={() => openLegalDocument("privacy")}
                      className="font-black text-blue-700 underline"
                    >
                      Política de Privacidade
                    </button>
                    .
                  </span>
                </label>
                <Button disabled={loading} className="w-full">
                  Enviar solicitação
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTela("login")}
                  className="w-full"
                >
                  Voltar
                </Button>
              </form>
            )}

            {tela === "recuperar" && (
              <form onSubmit={handleRecuperar} className="space-y-4">
                <h2 className="text-center text-2xl font-black text-zinc-800">
                  Recuperar senha
                </h2>
                <Field label="E-mail">
                  <Input
                    required
                    type="email"
                    value={recuperar.email}
                    onChange={(e) =>
                      setRecuperar({ ...recuperar, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Código recebido">
                  <Input
                    value={recuperar.codigo}
                    onChange={(e) =>
                      setRecuperar({ ...recuperar, codigo: e.target.value })
                    }
                    placeholder="Preencha depois de solicitar"
                  />
                </Field>
                <Field label="Nova senha">
                  <Input
                    type="password"
                    minLength={8}
                    title="Use no mínimo 8 caracteres."
                    value={recuperar.novaSenha}
                    onChange={(e) =>
                      setRecuperar({ ...recuperar, novaSenha: e.target.value })
                    }
                  />
                </Field>
                <Button disabled={loading} className="w-full">
                  {recuperar.codigo ? "Redefinir senha" : "Solicitar código"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTela("login")}
                  className="w-full"
                >
                  Voltar
                </Button>
              </form>
            )}
            {tela === "verificar" && (
              <form onSubmit={handleVerificarEmail} className="space-y-4">
                <h2 className="text-center text-2xl font-black text-zinc-800">Confirmar e-mail</h2>
                <p className="text-center text-sm leading-6 text-zinc-500">Digite o código de 6 dígitos recebido em <strong>{verificacao.email}</strong>. Se não recebeu ou o código expirou, clique em Reenviar código. Após confirmar, aguarde a aprovação do administrador.</p>
                <Field label="Código de confirmação">
                  <Input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificacao.codigo} onChange={(e) => setVerificacao({ ...verificacao, codigo: e.target.value.replace(/\D/g, "") })} placeholder="000000" />
                </Field>
                <Button disabled={loading || verificacao.codigo.length !== 6} className="w-full">Confirmar e-mail</Button>
                <Button type="button" variant="secondary" disabled={loading} onClick={handleReenviarVerificacao} className="w-full">Reenviar código</Button>
                <button type="button" onClick={() => setTela("login")} className="w-full text-sm font-semibold text-zinc-500">Voltar ao login</button>
              </form>
            )}
            <p className="mt-12 text-center text-[11px] font-medium text-slate-400">
              Acesso seguro e restrito a usuários autorizados.
            </p>
          </div>
        </section>
        <section className="relative order-1 flex min-h-[310px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#073b66] via-[#087fa8] to-[#17a9d4] px-7 pb-20 pt-10 text-white lg:min-h-0 lg:px-12 lg:py-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 14% 18%, rgba(255,255,255,.9) 0 1px, transparent 2px), radial-gradient(circle at 72% 13%, rgba(255,255,255,.75) 0 1px, transparent 2px), radial-gradient(circle at 84% 31%, rgba(255,255,255,.7) 0 1.5px, transparent 2.5px), radial-gradient(circle at 44% 28%, rgba(255,255,255,.65) 0 1px, transparent 2px)",
              backgroundSize:
                "190px 170px, 230px 210px, 260px 230px, 310px 260px",
            }}
          />
          <div className="absolute right-[11%] top-[12%] h-px w-28 rotate-[-28deg] bg-gradient-to-r from-transparent via-white to-white shadow-[0_0_12px_white]" />
          <svg
            aria-hidden="true"
            viewBox="0 0 600 430"
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-0 h-[72%] w-full"
          >
            <path d="M0 190 L75 135 L150 190 L235 100 L330 192 L420 125 L510 180 L600 110 L600 430 L0 430 Z" fill="#315eac" />
            <path d="M0 250 L90 170 L175 245 L275 145 L360 245 L460 175 L600 250 L600 430 L0 430 Z" fill="#214886" />
            <path d="M0 305 L95 220 L205 310 L320 205 L415 302 L525 230 L600 285 L600 430 L0 430 Z" fill="#142f69" />
            <path d="M0 330 C100 300 180 355 285 325 C390 295 475 340 600 310 L600 430 L0 430 Z" fill="#0c2257" />
            <path d="M0 352 C120 320 200 382 315 346 C425 312 505 370 600 340" fill="none" stroke="rgba(106,153,226,.35)" strokeWidth="4" />
          </svg>
          <div className="relative z-10 -mt-8 flex max-w-lg flex-col items-center px-6 text-center lg:-mt-16">
            <h2 className="text-3xl font-black uppercase leading-tight tracking-tight lg:text-4xl">Todo o suporte em um só lugar.</h2>
            <p className="mt-5 max-w-sm text-base font-medium leading-6 text-blue-50 lg:text-lg">Organize chamados, prioridades e prazos com mais agilidade.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
