/**
 * Responsabilidade: enquadramento do mapa de ativos pela região da própria empresa (unidades e
 * computadores com coordenada), em vez de um estado fixo.
 */
export type Ponto = { latitude: number | null; longitude: number | null };
export type Area = [[number, number], [number, number]];

/** Sem nenhuma coordenada ainda: o país inteiro. */
export const VISAO_BRASIL = { centro: [-14.2, -51.9] as [number, number], zoom: 4 };

// Meia largura mínima da área (~17 km): uma unidade sozinha não vira o zoom máximo sobre um quarteirão.
const FOLGA_MINIMA_GRAUS = 0.15;

function valido(ponto: Ponto): ponto is { latitude: number; longitude: number } {
  return ponto.latitude != null && ponto.longitude != null
    && Number.isFinite(ponto.latitude) && Number.isFinite(ponto.longitude)
    && Math.abs(ponto.latitude) <= 90 && Math.abs(ponto.longitude) <= 180
    // 0,0 fica no oceano: é o valor que sobra de coordenada não preenchida em dados antigos.
    && !(ponto.latitude === 0 && ponto.longitude === 0);
}

function comFolga(minimo: number, maximo: number): [number, number] {
  if (maximo - minimo >= FOLGA_MINIMA_GRAUS * 2) return [minimo, maximo];
  const centro = (minimo + maximo) / 2;
  return [centro - FOLGA_MINIMA_GRAUS, centro + FOLGA_MINIMA_GRAUS];
}

/** Retângulo [[sul, oeste], [norte, leste]] que contém os pontos, ou null quando não há coordenada válida. */
export function areaDosPontos(pontos: Ponto[]): Area | null {
  const validos = pontos.filter(valido);
  if (!validos.length) return null;
  const [sul, norte] = comFolga(Math.min(...validos.map((p) => p.latitude)), Math.max(...validos.map((p) => p.latitude)));
  const [oeste, leste] = comFolga(Math.min(...validos.map((p) => p.longitude)), Math.max(...validos.map((p) => p.longitude)));
  return [[sul, oeste], [norte, leste]];
}

/**
 * A área da empresa vem das unidades (onde ela atua); só sem unidade com coordenada usa os computadores.
 * Assim a atualização periódica dos computadores não fica reenquadrando o mapa.
 */
export function areaDaEmpresa(unidades: Ponto[], computadores: Ponto[]): Area | null {
  return areaDosPontos(unidades) ?? areaDosPontos(computadores);
}
