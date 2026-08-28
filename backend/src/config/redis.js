const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "";
let client = null;
let lastErrorLoggedAt = 0;

function logErrorThrottled(message) {
  const now = Date.now();
  if (now - lastErrorLoggedAt < 30000) return;
  lastErrorLoggedAt = now;
  console.error(message);
}

if (redisUrl) {
  client = createClient({
    url: redisUrl,
    socket: {
      // Backoff limitado a 10s e log com throttle: evita flood de tentativas
      // e de logs quando o Redis fica indisponível por um período longo.
      reconnectStrategy: (attempts) => Math.min(attempts * 500, 10000),
    },
  });
  client.on("error", (error) => {
    logErrorThrottled(`Redis: erro de conexão. Rate limiting segue em modo degradado (fail-open). ${error.message}`);
  });
  client.connect().catch((error) => {
    logErrorThrottled(`Redis: falha ao conectar em ${redisUrl.replace(/:\/\/.*@/, "://***@")} - ${error.message}`);
  });
}

/**
 * Retorna o client Redis compartilhado, ou null quando REDIS_URL não está
 * configurada. Nunca cria uma conexão nova por chamada.
 */
function getRedisClient() {
  return client;
}

module.exports = { getRedisClient };
