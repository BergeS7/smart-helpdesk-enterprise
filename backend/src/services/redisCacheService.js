const { getRedisClient } = require("../config/redis");

function readyClient() {
  const client = getRedisClient();
  return client?.isReady ? client : null;
}

async function getJson(key) {
  const client = readyClient();
  if (!client) return null;
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Redis cache: falha ao ler ${key}: ${error.message}`);
    return null;
  }
}

async function setJson(key, value, ttlSeconds) {
  const client = readyClient();
  if (!client) return false;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (error) {
    console.error(`Redis cache: falha ao gravar ${key}: ${error.message}`);
    return false;
  }
}

async function remove(key) {
  const client = readyClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Redis cache: falha ao invalidar ${key}: ${error.message}`);
    return false;
  }
}

module.exports = { getJson, setJson, remove };
