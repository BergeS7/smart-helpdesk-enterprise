const test = require("node:test");
const assert = require("node:assert/strict");
const { validateProductionSecurity } = require("../src/config/security");

function withEnvironment(values, action) {
  const previous = { ...process.env };
  Object.assign(process.env, values);
  try { return action(); } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
}

test("produção recusa segredos padrão", () => withEnvironment({ NODE_ENV: "production", JWT_SECRET: "change-this-jwt-secret-before-production", DB_PASSWORD: "smart_helpdesk_change_me", ALLOWED_ORIGINS: "http://localhost:8090" }, () => {
  assert.throws(() => validateProductionSecurity(), /JWT_SECRET/);
}));

test("produção exige origem explícita", () => withEnvironment({ NODE_ENV: "production", JWT_SECRET: "Y7!mZ9#qP4@xL2$vN8&cR6*eT3^uI5(o", DB_PASSWORD: "D8@base-Segura-2026!", ALLOWED_ORIGINS: "" }, () => {
  assert.throws(() => validateProductionSecurity(), /ALLOWED_ORIGINS/);
}));

test("configuração forte é aceita", () => withEnvironment({ NODE_ENV: "production", JWT_SECRET: "Y7!mZ9#qP4@xL2$vN8&cR6*eT3^uI5(o", DB_PASSWORD: "D8@base-Segura-2026!", ALLOWED_ORIGINS: "https://helpdesk.exemplo.com" }, () => {
  assert.doesNotThrow(() => validateProductionSecurity());
}));
