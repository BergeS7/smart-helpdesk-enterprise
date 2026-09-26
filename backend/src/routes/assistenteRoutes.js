/**
 * Responsabilidade: Rotas do assistente da base de conhecimento (chat com IA).
 */
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const authMiddleware = require("../middlewares/authMiddleware");
const { exigirPermissao } = require("../middlewares/authMiddleware");
const { perguntar } = require("../services/assistenteService");
const { listarLacunas } = require("../services/assistenteLacunasService");
const { normalizarPergunta } = require("../domain/assistente");
const { LIMITE_PERGUNTAS, JANELA_LIMITE_MINUTOS } = require("../config/assistente");

const router = express.Router();

// Por usuário, não por IP: cada pergunta pode gerar custo de API.
const limitePerguntas = rateLimit({
  windowMs: JANELA_LIMITE_MINUTOS * 60 * 1000,
  limit: LIMITE_PERGUNTAS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `assistente:${req.user.id}`,
  handler: (req, res) => res.status(429).json({ erro: "Você fez muitas perguntas seguidas. Aguarde alguns minutos." }),
});

router.post("/perguntar", authMiddleware, limitePerguntas, async (req, res) => {
  const pergunta = normalizarPergunta(req.body?.pergunta);
  if (pergunta.length < 3) return res.status(400).json({ erro: "Escreva sua dúvida." });
  try {
    return res.json(await perguntar({ pergunta, historico: req.body?.historico, user: req.user }));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Não foi possível responder agora. Tente novamente." });
  }
});

// Painel da equipe: o que o assistente não respondeu, para virar artigo.
router.get("/sem-resposta", authMiddleware, exigirPermissao("gerenciar_base"), async (req, res) => {
  try {
    return res.json(await listarLacunas());
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao carregar perguntas sem resposta" });
  }
});

module.exports = router;
