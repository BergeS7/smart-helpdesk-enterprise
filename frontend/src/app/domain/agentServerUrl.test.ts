import { describe, expect, it } from "vitest";
import { agentServerUrl } from "./agentServerUrl";

describe("URL de instalação do agente", () => {
  it("usa o backend externo quando o frontend está na Vercel", () => {
    expect(agentServerUrl("https://backend.example/api", "https://frontend.example").href)
      .toBe("https://backend.example/api/assets");
  });
  it("preserva subdiretório e remove a barra final", () => {
    expect(agentServerUrl("/suporte/api/", "https://example.test").href)
      .toBe("https://example.test/suporte/api/assets");
  });
  it("deriva o protocolo da API, não da interface", () => {
    expect(agentServerUrl("https://backend.example/api", "http://localhost:5173").protocol).toBe("https:");
  });
});
