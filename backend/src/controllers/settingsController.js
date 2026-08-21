const fs = require("fs");
const path = require("path");
const pool = require("../config/database");
const { ehDesenvolvedor } = require("../utils/permissoes");

function podeConfigurar(user) {
  return ehDesenvolvedor(user?.perfil);
}

const defaults = {
  sla_critica_resposta: 15,
  sla_critica_resolucao: 120,
  nome_sistema: "Smart HelpDesk",
  email_suporte: "",
  cor_principal: "#2563eb",
  logo_url: "",
  logo_1_url: "",
  sla_alta_resposta: 60,
  sla_alta_resolucao: 480,
  sla_media_resposta: 240,
  sla_media_resolucao: 1440,
  sla_baixa_resposta: 1440,
  sla_baixa_resolucao: 2880,
  closedTicketsHideAfter: "24h",
};

const chavesPermitidas = new Set(Object.keys(defaults));

function normalizarValorConfig(chave, valor) {
  if (valor === undefined || valor === null) return String(defaults[chave] ?? "");

  if (String(chave).startsWith("sla_")) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) return String(defaults[chave]);
    return String(Math.round(numero));
  }

  if (chave === "cor_principal") {
    const cor = String(valor).trim();
    return /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : defaults.cor_principal;
  }

  if (chave === "email_suporte") return String(valor).trim().toLowerCase();

  if (chave === "closedTicketsHideAfter") {
    return ["24h", "48h", "7d", "30d", "never"].includes(String(valor)) ? String(valor) : defaults.closedTicketsHideAfter;
  }

  return String(valor).trim();
}

async function garantirTabelaConfiguracoes() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes_sistema (
      chave VARCHAR(120) PRIMARY KEY,
      valor TEXT NOT NULL,
      atualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const [chave, valor] of Object.entries(defaults)) {
    await pool.query(
      `INSERT INTO configuracoes_sistema (chave, valor)
       VALUES ($1, $2)
       ON CONFLICT (chave) DO NOTHING`,
      [chave, String(valor)]
    );
  }
}

async function carregarConfiguracoesObjeto() {
  await garantirTabelaConfiguracoes();
  const result = await pool.query("SELECT chave, valor FROM configuracoes_sistema");
  const dados = { ...defaults };
  for (const row of result.rows) {
    if (chavesPermitidas.has(row.chave)) dados[row.chave] = row.valor;
  }
  return dados;
}

const obterConfiguracoes = async (req, res) => {
  try {
    return res.json(await carregarConfiguracoesObjeto());
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao carregar configurações", detalhe: error.message });
  }
};

const salvarConfiguracoes = async (req, res) => {
  try {
    if (!podeConfigurar(req.user)) return res.status(403).json({ erro: "Acesso não autorizado" });
    await garantirTabelaConfiguracoes();

    const entradas = Object.entries(req.body || {}).filter(([chave]) => chavesPermitidas.has(chave));

    for (const [chave, valor] of entradas) {
      await pool.query(
        `INSERT INTO configuracoes_sistema (chave, valor, atualizado_por)
         VALUES ($1, $2, $3)
         ON CONFLICT (chave)
         DO UPDATE SET valor = EXCLUDED.valor, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = CURRENT_TIMESTAMP`,
        [chave, normalizarValorConfig(chave, valor), req.user.id]
      );
    }

    return res.json(await carregarConfiguracoesObjeto());
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao salvar configurações", detalhe: error.message });
  }
};

async function atualizarLogoPorChave(req, res, chave, prefixo, label) {
  try {
    if (!podeConfigurar(req.user)) return res.status(403).json({ erro: "Acesso não autorizado" });
    if (!req.file) return res.status(400).json({ erro: `Envie uma imagem para a ${label}` });

    await garantirTabelaConfiguracoes();

    const pastaSistema = path.join(__dirname, "../../uploads/sistema");
    const arquivos = fs.existsSync(pastaSistema) ? fs.readdirSync(pastaSistema) : [];

    for (const arquivo of arquivos) {
      if (arquivo.startsWith(`${prefixo}-`) && arquivo !== req.file.filename) {
        fs.unlink(path.join(pastaSistema, arquivo), () => {});
      }
    }

    const logoUrl = `/uploads/sistema/${req.file.filename}`;

    await pool.query(
      `INSERT INTO configuracoes_sistema (chave, valor, atualizado_por)
       VALUES ($1, $2, $3)
       ON CONFLICT (chave)
       DO UPDATE SET valor = EXCLUDED.valor, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = CURRENT_TIMESTAMP`,
      [chave, logoUrl, req.user.id]
    );

    // Compatibilidade com versões anteriores que ainda leem logo_url.
    if (chave === "logo_1_url") {
      await pool.query(
        `INSERT INTO configuracoes_sistema (chave, valor, atualizado_por)
         VALUES ('logo_url', $1, $2)
         ON CONFLICT (chave)
         DO UPDATE SET valor = EXCLUDED.valor, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = CURRENT_TIMESTAMP`,
        [logoUrl, req.user.id]
      );
    }

    return res.json(await carregarConfiguracoesObjeto());
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: `Erro ao atualizar ${label}`, detalhe: error.message });
  }
}

const atualizarLogoSistema1 = (req, res) => atualizarLogoPorChave(req, res, "logo_1_url", "logo1", "logo 1");
const atualizarLogoSistema = atualizarLogoSistema1;

module.exports = {
  obterConfiguracoes,
  salvarConfiguracoes,
  atualizarLogoSistema,
  atualizarLogoSistema1,
  carregarConfiguracoesObjeto,
};
