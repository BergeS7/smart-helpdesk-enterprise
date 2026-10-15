// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ModalNovoChamadoEquipe } from "./NovoChamadoEquipe";
import { criarChamado, listarCatalogo, listarUsuariosAdmin, type ApiUsuario, type UsuarioLogado } from "../../../services/api";

vi.mock("../../../services/api", () => ({ criarChamado: vi.fn(), listarCatalogo: vi.fn(), listarUsuariosAdmin: vi.fn() }));

const TECNICO = { id: 7, nome: "Tiago", email: "tiago@x.test", perfil: "tecnico", departamento: "TI" } as UsuarioLogado;
const ANA = { id: 5, nome: "Ana Souza", email: "ana@x.test", perfil: "usuario", status: "ativo", departamento: "Financeiro" } as ApiUsuario;
const BRUNO = { id: 9, nome: "Bruno Lima", email: "bruno@x.test", perfil: "usuario", status: "ativo", departamento: "" } as ApiUsuario;

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.mocked(listarUsuariosAdmin).mockResolvedValue([ANA, BRUNO]);
  vi.mocked(listarCatalogo).mockResolvedValue([{ id: 1, nome: "Incidente" }, { id: 2, nome: "Acesso" }]);
  vi.mocked(criarChamado).mockResolvedValue({ id: 99, numero_chamado: "#HD-2026-0099", titulo: "Sem e-mail", descricao: "x", prioridade: "Media", status: "OPEN", solicitante: "Ana Souza" });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

const botao = (texto: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(texto))!;
async function digitar(campo: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const prototipo = campo instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototipo, "value")!.set!.call(campo, valor);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function renderizar() {
  const onCriado = vi.fn();
  await act(async () => root.render(<ModalNovoChamadoEquipe usuarioLogado={TECNICO} onClose={vi.fn()} onCriado={onCriado} />));
  return { onCriado };
}

it("busca o usuário, abre em nome dele com o canal escolhido e devolve o chamado criado", async () => {
  const { onCriado } = await renderizar();
  expect(listarUsuariosAdmin).toHaveBeenCalledWith({ status: "ativo" });

  await digitar(container.querySelector<HTMLInputElement>('input[aria-label="Buscar solicitante"]')!, "finan");
  expect(container.textContent).toContain("Ana Souza");
  expect(container.textContent).not.toContain("Bruno Lima");
  await act(async () => botao("Ana Souza").click());

  const [canal] = container.querySelectorAll("select");
  await act(async () => { canal.value = "presencial"; canal.dispatchEvent(new Event("change", { bubbles: true })); });
  await digitar(container.querySelector<HTMLInputElement>('input[placeholder^="Ex.: Usuário"]')!, "Sem e-mail");
  await digitar(container.querySelector("textarea")!, "Ligou dizendo que o Outlook não abre");
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

  expect(criarChamado).toHaveBeenCalledWith({ titulo: "Sem e-mail", descricao: "Ligou dizendo que o Outlook não abre", tipo_chamado: "Incidente", solicitante_id: 5, canal_abertura: "presencial" });
  expect(onCriado).toHaveBeenCalledWith(expect.objectContaining({ id: 99 }));
});

it("sem solicitante escolhido não envia o chamado", async () => {
  await renderizar();
  expect(botao("Abrir chamado").disabled).toBe(true);
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(criarChamado).not.toHaveBeenCalled();
});

it("usuário sem departamento mostra o aviso e bloqueia o envio", async () => {
  await renderizar();
  await act(async () => botao("Bruno Lima").click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("sem departamento");
  expect(botao("Abrir chamado").disabled).toBe(true);
});

it("mostra o erro da API sem fechar o modal", async () => {
  vi.mocked(criarChamado).mockRejectedValueOnce(new Error("Solicitante não encontrado nesta empresa"));
  const { onCriado } = await renderizar();
  await act(async () => botao("Ana Souza").click());
  await digitar(container.querySelector<HTMLInputElement>('input[placeholder^="Ex.: Usuário"]')!, "Teste");
  await digitar(container.querySelector("textarea")!, "Descrição");
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(container.textContent).toContain("Solicitante não encontrado nesta empresa");
  expect(onCriado).not.toHaveBeenCalled();
});
