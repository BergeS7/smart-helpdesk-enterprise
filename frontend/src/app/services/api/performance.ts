/**
 * Responsabilidade: avaliação de desempenho e ranking de satisfação.
 */
import { request } from "./http";
import type { MyPerformanceDashboard, PerformanceCompanyDashboard, PerformanceRatingInput, PerformanceScore } from "./types";

export function enviarAvaliacaoPerformance(
  id: number | string,
  dados: PerformanceRatingInput,
) {
  return request(`/performance/tickets/${id}/rating`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function obterDashboardPerformance(month?: number, year?: number) {
  const qs = new URLSearchParams();
  if (month) qs.set("month", String(month));
  if (year) qs.set("year", String(year));
  return request<PerformanceCompanyDashboard>(
    `/performance/company${qs.toString() ? `?${qs}` : ""}`,
  );
}

export function obterMinhaPerformance(month?: number, year?: number) {
  const qs = new URLSearchParams();
  if (month) qs.set("month", String(month));
  if (year) qs.set("year", String(year));
  return request<MyPerformanceDashboard>(
    `/performance/me${qs.toString() ? `?${qs}` : ""}`,
  );
}

export function obterRankingSatisfacao(month?: number, year?: number) {
  const qs = new URLSearchParams({ scope: "technicians" });
  if (month) qs.set("month", String(month));
  if (year) qs.set("year", String(year));
  return request<PerformanceScore[]>(`/performance/ranking?${qs}`);
}
