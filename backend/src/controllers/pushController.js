const pool = require("../config/database");
const push = require("../services/pushService");

exports.config = async (req, res) => {
  try {
    const { publicKey } = await push.getKeys();
    res.set("Cache-Control", "no-store").json({ publicKey });
  } catch { res.status(503).json({ erro: "Notificações push indisponíveis. Tente novamente mais tarde." }); }
};

exports.subscribe = async (req, res) => {
  if (!push.validSubscription(req.body)) return res.status(400).json({ erro: "Inscrição push inválida ou navegador não compatível." });
  try {
    await push.ensurePushSchema();
    const subscription = { endpoint: req.body.endpoint, keys: { p256dh: req.body.keys.p256dh, auth: req.body.keys.auth } };
    const result = await pool.query(`INSERT INTO web_push_subscriptions(endpoint,usuario_id,subscription,token_version)
      VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET
      subscription=EXCLUDED.subscription,token_version=EXCLUDED.token_version,atualizado_em=NOW()
      WHERE web_push_subscriptions.usuario_id=EXCLUDED.usuario_id RETURNING endpoint`,
    [subscription.endpoint, req.user.id, JSON.stringify(subscription), req.user.tokenVersion]);
    if (!result.rows.length) return res.status(409).json({ erro: "Este aparelho está vinculado a outra conta. Desative e ative novamente." });
    res.json({ enabled: true });
  } catch { res.status(503).json({ erro: "Não foi possível ativar as notificações." }); }
};

exports.unsubscribe = async (req, res) => {
  if (typeof req.body.endpoint !== "string") return res.status(400).json({ erro: "Informe o aparelho." });
  try {
    await push.ensurePushSchema();
    await pool.query("DELETE FROM web_push_subscriptions WHERE endpoint=$1 AND usuario_id=$2", [req.body.endpoint, req.user.id]);
    res.json({ enabled: false });
  } catch { res.status(503).json({ erro: "Não foi possível desativar as notificações no servidor." }); }
};

exports.test = async (req, res) => {
  if (typeof req.body.endpoint !== "string") return res.status(400).json({ erro: "Informe o aparelho." });
  try {
    const sent = await push.sendToUser(req.user.id, { titulo: "Notificações ativadas", mensagem: "Os alertas do Smart HelpDesk chegarão neste aparelho." }, req.body.endpoint);
    if (!sent) return res.status(503).json({ erro: "O aparelho não recebeu o envio. Desative e ative as notificações novamente." });
    res.json({ mensagem: "Teste enviado. Confira a barra de notificações." });
  } catch { res.status(503).json({ erro: "Não foi possível enviar o teste." }); }
};
