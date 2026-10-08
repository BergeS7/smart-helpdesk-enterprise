import { describe, expect, it } from "vitest";
import { isAdminApp, isEquipeApp, normalizarPerfilApp, perfilLabel } from "./appShared";

describe("perfis no app", () => {
  it("supervisor é da equipe, com rótulo próprio, e não vira usuário comum", () => {
    expect(normalizarPerfilApp("supervisor")).toBe("supervisor");
    expect(normalizarPerfilApp("Supervisor")).toBe("supervisor");
    expect(isEquipeApp("supervisor")).toBe(true);
    expect(isAdminApp("supervisor")).toBe(false);
    expect(perfilLabel("supervisor")).toBe("Supervisor");
  });

  it("perfis conhecidos e legados seguem iguais", () => {
    expect(normalizarPerfilApp("desenvolvedor")).toBe("admin");
    expect(normalizarPerfilApp("tecnico")).toBe("tecnico");
    expect(normalizarPerfilApp("qualquer")).toBe("usuario");
    expect(isEquipeApp("usuario")).toBe(false);
  });
});
