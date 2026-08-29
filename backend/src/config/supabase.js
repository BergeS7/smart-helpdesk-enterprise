/**
 * Responsabilidade: Configuração compartilhada de supabase; inicializa integrações e parâmetros de infraestrutura.
 */
const { createClient } = require("@supabase/supabase-js");

let clienteSupabase;

function obterSupabase() {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Storage não configurado no backend.");
  }

  if (!clienteSupabase) {
    clienteSupabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return clienteSupabase;
}

module.exports = { obterSupabase };
