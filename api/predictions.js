const crypto = require("crypto");
const { getRedisConfig, readJsonBody, redisPipeline, sendJson } = require("./_shared");

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 60);
}

function cleanResult(value) {
  if (!value || typeof value !== "object") return undefined;
  const result = {};
  ["home", "away", "penaltiesHome", "penaltiesAway"].forEach((key) => {
    const number = Number(value[key]);
    if (Number.isFinite(number) && number >= 0 && number <= 30) {
      result[key] = number;
    }
  });
  return result.home !== undefined || result.away !== undefined ? result : undefined;
}

function cleanResults(results) {
  if (!results || typeof results !== "object" || Array.isArray(results)) return undefined;
  const output = {};
  Object.entries(results).forEach(([key, value]) => {
    if (!/^(K-)?\d+$/.test(key)) return;
    const result = cleanResult(value);
    if (result) output[key] = result;
  });
  return Object.keys(output).length > 0 ? output : undefined;
}

module.exports = async function handler(req, res) {
  if (!getRedisConfig()) {
    return sendJson(res, { error: "Predicciones no configuradas" }, 503);
  }

  if (req.method === "GET") {
    const idsResult = await redisPipeline([["ZREVRANGE", "predictions:created", 0, 99]]);
    const ids = idsResult?.[0]?.result || [];
    if (ids.length === 0) return sendJson(res, { predictions: [] });

    const itemsResult = await redisPipeline([["HMGET", "predictions:items", ...ids]]);
    const values = itemsResult?.[0]?.result || [];
    const predictions = values
      .map((value) => {
        try {
          return JSON.parse(value);
        } catch {
          return undefined;
        }
      })
      .filter(Boolean);

    return sendJson(res, { predictions });
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    const name = cleanName(body.name);
    const results = cleanResults(body.results);
    const champion = cleanName(body.champion);

    if (!name) return sendJson(res, { error: "Escribe tu nombre" }, 400);
    if (!results || !champion) return sendJson(res, { error: "Completa el campeon antes de guardar" }, 400);

    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const prediction = { id, name, champion, createdAt, results };

    await redisPipeline([
      ["HSET", "predictions:items", id, JSON.stringify(prediction)],
      ["ZADD", "predictions:created", Date.now(), id],
    ]);

    return sendJson(res, { prediction }, 201);
  }

  return sendJson(res, { error: "Method not allowed" }, 405);
};
