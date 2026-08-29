/**
 * Responsabilidade: Configuração compartilhada de security; inicializa integrações e parâmetros de infraestrutura.
 */
const crypto = require("crypto");

const INSECURE_VALUES = new Set([
  "smarthelpdesk",
  "smart-helpdesk-agent-setup",
  "smart_helpdesk_change_me",
  "change-this-jwt-secret-before-production",
  "changeme",
  "password",
]);

function validateSecret(name, minimumLength) {
  const value = String(process.env[name] || "").trim();
  if (!value || value.length < minimumLength || INSECURE_VALUES.has(value.toLowerCase())) {
    throw new Error(`${name} ausente, fraco ou usando valor padrão. Gere um segredo seguro antes de iniciar em produção.`);
  }
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) => rule.test(value)).length;
  if (variety < 3) throw new Error(`${name} não possui diversidade suficiente de caracteres.`);
  return value;
}

function validateProductionSecurity() {
  if (process.env.NODE_ENV !== "production") return;
  validateSecret("JWT_SECRET", 32);
  validateSecret("DB_PASSWORD", 16);
  const origins = String(process.env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!origins.length) throw new Error("ALLOWED_ORIGINS deve conter ao menos uma origem explícita em produção.");
}

function correlationId() { return crypto.randomUUID(); }

module.exports = { validateProductionSecurity, validateSecret, correlationId };
