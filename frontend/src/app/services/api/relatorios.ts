/**
 * Responsabilidade: download e métricas de relatórios.
 */
import { API_URL, getToken, request } from "./http";
import type { FiltrosChamados, ReportMetrics } from "./types";

export function urlRelatorio(
  formato: "csv" | "excel" | "pdf",
  filtros: FiltrosChamados = {},
) {
  const qs = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
  });
  const token = getToken();
  if (token) qs.set("download_token_ignored", "1");
  return `${API_URL}/chamados/relatorios/${formato}${qs.toString() ? `?${qs}` : ""}`;
}

// Baixa relatórios autenticados e preserva o nome indicado pelo servidor.
export async function baixarRelatorio(
  formato: "csv" | "excel" | "pdf",
  filtros: FiltrosChamados = {},
) {
  const qs = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
  });
  const response = await request<Response>(
    `/chamados/relatorios/${formato}${qs.toString() ? `?${qs}` : ""}`,
    { raw: true },
  );
  if (!response.ok) throw new Error("Erro ao baixar relatório");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const periodo = filtros.data_inicio?.slice(0, 7);
  a.download = `chamados${periodo ? `-${periodo}` : ""}.${formato === "excel" ? "xlsx" : formato}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function obterMetricasRelatorio(filtros: FiltrosChamados = {}) {
  const qs = new URLSearchParams();
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== false) qs.set(key, String(value));
  });
  return request<ReportMetrics>(`/chamados/relatorios/resumo/metricas${qs.toString() ? `?${qs}` : ""}`);
}
