const webpush = require("web-push");
const pool = require("../config/database");

// Tabelas privadas: nunca disponibilizar chaves ou endpoints pela API de dados.
const schema = `
  CREATE TABLE IF NOT EXISTS web_push_keys (
    id INTEGER PRIMARY KEY CHECK (id = 1), public_key TEXT NOT NULL, private_key TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS web_push_subscriptions (
    endpoint TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL, token_version INTEGER NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS web_push_usuario_idx ON web_push_subscriptions(usuario_id);
  ALTER TABLE web_push_keys ENABLE ROW LEVEL SECURITY;
  ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON web_push_keys, web_push_subscriptions FROM PUBLIC;
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
      REVOKE ALL ON web_push_keys, web_push_subscriptions FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
      REVOKE ALL ON web_push_keys, web_push_subscriptions FROM authenticated;
    END IF;
  END $$;
`;
let ready;
function ensurePushSchema() {
  if (!ready) ready = (async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(873421)");
      await client.query(schema);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  })().catch((error) => { ready = null; throw error; });
  return ready;
}

async function getKeys() {
  await ensurePushSchema();
  let result = await pool.query("SELECT public_key, private_key FROM web_push_keys WHERE id=1");
  if (!result.rows.length) {
    const keys = webpush.generateVAPIDKeys();
    await pool.query("INSERT INTO web_push_keys(id,public_key,private_key) VALUES(1,$1,$2) ON CONFLICT DO NOTHING", [keys.publicKey, keys.privateKey]);
    result = await pool.query("SELECT public_key, private_key FROM web_push_keys WHERE id=1");
  }
  return { publicKey: result.rows[0].public_key, privateKey: result.rows[0].private_key };
}

function validSubscription(value) {
  try {
    if (!value || typeof value.endpoint !== "string" || value.endpoint.length > 2048) return false;
    const url = new URL(value.endpoint);
    const host = url.hostname;
    const allowed = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" || host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
    if (!allowed || url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return false;
    const { p256dh, auth } = value.keys || {};
    return typeof p256dh === "string" && /^[A-Za-z0-9_-]+={0,2}$/.test(p256dh) && Buffer.from(p256dh, "base64url").length === 65 &&
      typeof auth === "string" && /^[A-Za-z0-9_-]+={0,2}$/.test(auth) && Buffer.from(auth, "base64url").length === 16;
  } catch { return false; }
}

function notificationPayload(userId, notification) {
  const ticket = /^\/chamados\/(\d+)(?:$|[/?#])/.exec(notification.link || "");
  const query = new URLSearchParams({ pushUser: String(userId) });
  if (ticket) query.set("pushTicket", ticket[1]);
  return JSON.stringify({
    title: String(notification.titulo || "Smart HelpDesk").slice(0, 100),
    body: String(notification.mensagem || "Você tem uma nova notificação.").slice(0, 300),
    tag: `helpdesk-${userId}-${notification.id || "test"}`,
    url: `/?${query}`, userId: Number(userId),
  });
}

async function sendToUserDetailed(userId, notification, endpoint = null) {
  await ensurePushSchema();
  const result = await pool.query(`SELECT s.subscription FROM web_push_subscriptions s
    JOIN usuarios u ON u.id=s.usuario_id
    WHERE s.usuario_id=$1 AND u.status='ativo' AND s.token_version=COALESCE(u.token_version,1)
      AND ($2::text IS NULL OR s.endpoint=$2)`, [userId, endpoint]);
  if (!result.rows.length) return { sent: 0, total: 0, failures: ["subscription_missing_or_revoked"] };
  const keys = await getKeys();
  const subject = process.env.VAPID_SUBJECT || "https://github.com/BergeS7/smart-helpdesk-enterprise";
  const payload = notificationPayload(userId, notification);
  const results = await Promise.all(result.rows.map(async ({ subscription }) => {
    if (!validSubscription(subscription)) return "invalid_subscription";
    try {
      await webpush.sendNotification(subscription, payload, { vapidDetails: { subject, ...keys }, TTL: 3600, timeout: 5000 });
      return true;
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) {
        await pool.query("DELETE FROM web_push_subscriptions WHERE endpoint=$1 AND usuario_id=$2", [subscription.endpoint, userId]);
      } else console.error("Falha no envio push:", error.statusCode || "indisponível");
      return error.statusCode ? `provider_http_${error.statusCode}` : "provider_unreachable";
    }
  }));
  return { sent: results.filter((item) => item === true).length, total: results.length, failures: results.filter((item) => item !== true) };
}

async function sendToUser(userId, notification, endpoint = null) {
  return (await sendToUserDetailed(userId, notification, endpoint)).sent;
}

async function sendSafely(userId, notification) {
  try { await sendToUser(userId, notification); }
  catch { console.error("Push indisponível; notificação preservada no sistema."); }
}

module.exports = { schema, ensurePushSchema, getKeys, validSubscription, notificationPayload, sendToUser, sendToUserDetailed, sendSafely };
