import { describe, expect, it } from "vitest";
import { communicationStatusLabel, formatBytes, formatInventoryValue, humanizeChangeField, humanizeKey, isObjectArray } from "./assetInventoryFormat";

describe("humanizeKey", () => {
  it("traduz as chaves conhecidas do inventário do agente para PT-BR", () => {
    expect(humanizeKey("loggedUser")).toBe("Usuário logado");
    expect(humanizeKey("serialNumber")).toBe("Número de série");
    expect(humanizeKey("hostname")).toBe("Nome do computador");
  });

  it("chave desconhecida vira Título Com Espaço, nunca CAIXAALTACOLADA", () => {
    expect(humanizeKey("someNewField")).toBe("Some new field");
    expect(humanizeKey("loggedUser")).not.toBe("LOGGEDUSER");
  });
});

describe("formatInventoryValue", () => {
  it("formata booleano, vazio e status ENABLED/DISABLED/UNKNOWN", () => {
    expect(formatInventoryValue("dhcpEnabled", true)).toBe("Sim");
    expect(formatInventoryValue("dhcpEnabled", false)).toBe("Não");
    expect(formatInventoryValue("x", null)).toBe("Não informado");
    expect(formatInventoryValue("x", "")).toBe("Não informado");
    expect(formatInventoryValue("status", "ENABLED")).toBe("Ativado");
    expect(formatInventoryValue("status", "DISABLED")).toBe("Desativado");
    expect(formatInventoryValue("status", "UNKNOWN")).toBe("Desconhecido");
  });

  it("formata datetime ISO e data simples em pt-BR", () => {
    expect(formatInventoryValue("installDate", "2026-01-15T10:30:00Z")).toContain("2026");
    expect(formatInventoryValue("installedOn", "2026-01-15")).toContain("2026");
    expect(formatInventoryValue("installedOn", "2026-01-15")).not.toBe("2026-01-15");
  });

  it("campos de bytes usam GB/MB, não o número cru (bug do painel anterior)", () => {
    expect(formatInventoryValue("capacityBytes", 8589934592)).toBe("8.00 GB");
    expect(formatInventoryValue("sizeBytes", 500000000000)).toContain("GB");
    expect(formatInventoryValue("memory.total", 1073741824)).toBe("1.00 GB");
    expect(formatInventoryValue("cores", 8)).toBe("8");
  });

  it("aplica unidade a MHz e porcentagem", () => {
    expect(formatInventoryValue("maxClockMhz", 3200)).toBe("3200 MHz");
    expect(formatInventoryValue("freePercentage", 42)).toBe("42%");
  });

  it("array de textos vira lista separada por vírgula, não JSON", () => {
    expect(formatInventoryValue("ipAddresses", ["10.0.0.5", "fe80::1"])).toBe("10.0.0.5, fe80::1");
    expect(formatInventoryValue("gateways", [])).toBe("Nenhum");
  });
});

describe("formatBytes", () => {
  it("escolhe GB, MB ou B pelo tamanho", () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2.00 GB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes("abc")).toBe("Não informado");
  });
});

describe("isObjectArray", () => {
  it("distingue array de objetos (vira cartões) de array de valores simples", () => {
    expect(isObjectArray([{ name: "eth0" }])).toBe(true);
    expect(isObjectArray(["10.0.0.5"])).toBe(false);
    expect(isObjectArray([])).toBe(false);
    expect(isObjectArray("10.0.0.5")).toBe(false);
  });
});

describe("communicationStatusLabel", () => {
  it("traduz o status de comunicação de forma consistente em toda a tela", () => {
    expect(communicationStatusLabel("recent")).toBe("Recente");
    expect(communicationStatusLabel("attention")).toBe("Atenção");
    expect(communicationStatusLabel("no_communication")).toBe("Sem comunicação");
    expect(communicationStatusLabel(undefined)).toBe("Sem comunicação");
  });
});

describe("humanizeChangeField", () => {
  it("traduz os nomes usados no histórico de alterações (ativo_alteracoes.campo)", () => {
    expect(humanizeChangeField("computer.serial")).toBe("Número de série");
    expect(humanizeChangeField("security.defender")).toBe("Antivírus (Windows Defender)");
    expect(humanizeChangeField("memory.total")).toBe("Memória total");
  });

  it("campo desconhecido usa o último segmento humanizado, não a chave crua", () => {
    expect(humanizeChangeField("algum.campoNovo")).toBe("Campo novo");
  });
});
