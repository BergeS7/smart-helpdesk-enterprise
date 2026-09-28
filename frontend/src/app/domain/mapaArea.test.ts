import { describe, expect, it } from "vitest";
import { areaDaEmpresa, areaDosPontos } from "./mapaArea";

describe("enquadramento do mapa pela região da empresa", () => {
  it("envolve todas as unidades, em qualquer lugar do país", () => {
    const pontos = [{ latitude: -8.06, longitude: -34.88 }, { latitude: -7.9, longitude: -34.9 }, { latitude: -9.6, longitude: -35.7 }];
    const [[sul, oeste], [norte, leste]] = areaDosPontos(pontos)!;
    expect([sul, oeste, norte, leste]).toEqual([-9.6, -35.7, -7.9, -34.88]);
    for (const p of pontos) {
      expect(p.latitude).toBeGreaterThanOrEqual(sul);
      expect(p.latitude).toBeLessThanOrEqual(norte);
      expect(p.longitude).toBeGreaterThanOrEqual(oeste);
      expect(p.longitude).toBeLessThanOrEqual(leste);
    }
  });

  it("uma unidade só ganha folga mínima em vez de zoom máximo", () => {
    const [[sul, oeste], [norte, leste]] = areaDosPontos([{ latitude: -3.6667, longitude: -45.38 }])!;
    expect(norte - sul).toBeCloseTo(0.3);
    expect(leste - oeste).toBeCloseTo(0.3);
    expect((norte + sul) / 2).toBeCloseTo(-3.6667);
  });

  it("ignora coordenadas vazias, inválidas ou o 0,0 de dados antigos", () => {
    expect(areaDosPontos([{ latitude: null, longitude: null }, { latitude: 0, longitude: 0 }, { latitude: 120, longitude: 10 }])).toBeNull();
  });

  it("usa as unidades; os computadores só quando nenhuma unidade tem coordenada", () => {
    const unidades = [{ latitude: -23.55, longitude: -46.63 }];
    const computadores = [{ latitude: -3.66, longitude: -45.38 }];
    expect(areaDaEmpresa(unidades, computadores)![0][0]).toBeCloseTo(-23.7);
    expect(areaDaEmpresa([{ latitude: null, longitude: null }], computadores)![0][0]).toBeCloseTo(-3.81);
    expect(areaDaEmpresa([], [])).toBeNull();
  });
});
