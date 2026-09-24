/**
 * Responsabilidade: aba Configurações: logos, avisos do sistema e demais ajustes gerais.
 */
import { MessageSquare, Upload, UserCog } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "../../../components/shared/FormPrimitives";
import { corPrincipalSistema, emailSuporteSistema } from "../../comum/appShared";
import type { PainelAdmin } from "../useAdminPanel";

export function AbaConfiguracoesGerais({ painel }: { painel: PainelAdmin }) {
  const { respostasRapidas, novaResposta, setNovaResposta, configSistema, setConfigSistema, enviandoLogoSistema, criarRespostaRapidaAdmin, salvarConfiguracoesAdmin, trocarLogoSistema, sistemaNome, sistemaLogo1, sistemaLogo2 } = painel;
  return (
    <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
      <div className="space-y-6">
        <Card>
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <UserCog size={18} />
            Configurações do sistema
          </h3>
          <form
            onSubmit={salvarConfiguracoesAdmin}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-zinc-200">
                  <img
                    src={sistemaLogo1}
                    alt={`${sistemaNome} - logo 1`}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">Logo 1</p>
                  <p className="truncate text-xs text-zinc-500">
                    Usada na lateral esquerda.
                  </p>
                  <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700 transition hover:border-blue-200 hover:text-blue-700">
                    <Upload size={15} />
                    {enviandoLogoSistema === "logo1"
                      ? "Enviando..."
                      : "Trocar logo 1"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        trocarLogoSistema(event, "logo1")
                      }
                      disabled={Boolean(enviandoLogoSistema)}
                    />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-zinc-200">
                  <img
                    src={sistemaLogo2}
                    alt={`${sistemaNome} - logo 2`}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">Logo 2</p>
                  <p className="truncate text-xs text-zinc-500">
                    Usada ao lado do nome do sistema.
                  </p>
                  <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700 transition hover:border-blue-200 hover:text-blue-700">
                    <Upload size={15} />
                    {enviandoLogoSistema === "logo2"
                      ? "Enviando..."
                      : "Trocar logo 2"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        trocarLogoSistema(event, "logo2")
                      }
                      disabled={Boolean(enviandoLogoSistema)}
                    />
                  </label>
                </div>
              </div>
            </div>
            <Field label="Nome do sistema">
              <Input
                value={String(configSistema.nome_sistema || "")}
                onChange={(e) =>
                  setConfigSistema({
                    ...configSistema,
                    nome_sistema: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="E-mail de suporte">
              <Input
                type="email"
                value={String(configSistema.email_suporte || "")}
                onChange={(e) =>
                  setConfigSistema({
                    ...configSistema,
                    email_suporte: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Cor principal">
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={corPrincipalSistema(configSistema)}
                  onChange={(e) =>
                    setConfigSistema({
                      ...configSistema,
                      cor_principal: e.target.value,
                    })
                  }
                  className="w-16 p-1"
                />
                <Input
                  value={String(
                    configSistema.cor_principal || "#2563eb",
                  )}
                  onChange={(e) =>
                    setConfigSistema({
                      ...configSistema,
                      cor_principal: e.target.value,
                    })
                  }
                />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SLA alta resposta">
                <Input
                  type="number"
                  min="1"
                  value={String(
                    configSistema.sla_alta_resposta || 60,
                  )}
                  onChange={(e) =>
                    setConfigSistema({
                      ...configSistema,
                      sla_alta_resposta: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="SLA alta resolução">
                <Input
                  type="number"
                  min="1"
                  value={String(
                    configSistema.sla_alta_resolucao || 480,
                  )}
                  onChange={(e) =>
                    setConfigSistema({
                      ...configSistema,
                      sla_alta_resolucao: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="SLA média resposta">
                <Input
                  type="number"
                  min="1"
                  value={String(
                    configSistema.sla_media_resposta || 240,
                  )}
                  onChange={(e) =>
                    setConfigSistema({
                      ...configSistema,
                      sla_media_resposta: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="SLA média resolução">
                <Input
                  type="number"
                  min="1"
                  value={String(
                    configSistema.sla_media_resolucao || 1440,
                  )}
                  onChange={(e) =>
                    setConfigSistema({
                      ...configSistema,
                      sla_media_resolucao: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="SLA baixa resposta">
                <Input
                  type="number"
                  min="1"
                  value={String(
                    configSistema.sla_baixa_resposta || 1440,
                  )}
                  onChange={(e) =>
                    setConfigSistema({
                      ...configSistema,
                      sla_baixa_resposta: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="SLA baixa resolução">
                <Input
                  type="number"
                  min="1"
                  value={String(
                    configSistema.sla_baixa_resolucao || 2880,
                  )}
                  onChange={(e) =>
                    setConfigSistema({
                      ...configSistema,
                      sla_baixa_resolucao: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <Button>Salvar e aplicar</Button>
          </form>
        </Card>
        <Card>
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <MessageSquare size={18} />
            Nova resposta rápida
          </h3>
          <form
            onSubmit={criarRespostaRapidaAdmin}
            className="space-y-3"
          >
            <Field label="Título">
              <Input
                value={novaResposta.titulo}
                onChange={(e) =>
                  setNovaResposta({
                    ...novaResposta,
                    titulo: e.target.value,
                  })
                }
                placeholder="Ex.: Solicitar print"
              />
            </Field>
            <Field label="Categoria">
              <Input
                value={novaResposta.categoria}
                onChange={(e) =>
                  setNovaResposta({
                    ...novaResposta,
                    categoria: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Mensagem">
              <Textarea
                value={novaResposta.mensagem}
                onChange={(e) =>
                  setNovaResposta({
                    ...novaResposta,
                    mensagem: e.target.value,
                  })
                }
                placeholder="Texto que será usado no chat do chamado"
              />
            </Field>
            <Button>Criar resposta</Button>
          </form>
        </Card>
      </div>
      <Card>
        <h3 className="mb-4 font-black">Prévia aplicada</h3>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="mb-2 text-xs font-bold text-zinc-500">
                Logo 1 / lateral
              </p>
              <img
                src={sistemaLogo1}
                alt="Logo 1"
                className="h-12 w-12 rounded-xl object-contain ring-1 ring-zinc-200"
              />
            </div>
            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="mb-2 text-xs font-bold text-zinc-500">
                Logo 2 / topo
              </p>
              <img
                src={sistemaLogo2}
                alt="Logo 2"
                className="h-12 w-12 rounded-xl object-contain ring-1 ring-zinc-200"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs font-bold text-zinc-500">Nome</p>
            <p className="text-xl font-black">{sistemaNome}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs font-bold text-zinc-500">Suporte</p>
            <p className="font-black text-blue-600">
              {emailSuporteSistema(configSistema)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs font-bold text-zinc-500">
              Cor principal
            </p>
            <div className="mt-2 h-10 rounded-xl bg-blue-600" />
          </div>
          <h3 className="pt-3 font-black">
            Respostas rápidas cadastradas
          </h3>
          {respostasRapidas.map((r) => (
            <div key={r.id} className="rounded-2xl border p-4">
              <p className="font-black">{r.titulo}</p>
              <p className="text-xs font-bold text-blue-600">
                {r.categoria}
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                {r.mensagem}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
