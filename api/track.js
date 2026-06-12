const {
  getClientIp,
  getGeo,
  getHeader,
  getRedisConfig,
  hashVisitor,
  normalizePath,
  normalizeReferrer,
  readJsonBody,
  redisPipeline,
  sendJson,
} = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, { error: "Method not allowed" }, 405);
  }

  if (!getRedisConfig()) {
    return sendJson(res, { ok: true, configured: false }, 202);
  }

  const body = await readJsonBody(req);

  const now = new Date();
  const timestamp = now.getTime();
  const day = now.toISOString().slice(0, 10);
  const hour = `${now.toISOString().slice(0, 13)}:00`;
  const path = normalizePath(body.path);
  const referrer = normalizeReferrer(body.referrer);
  const userAgent = getHeader(req, "user-agent");
  const geo = getGeo(req);
  const visitorId = hashVisitor([getClientIp(req), userAgent]);
  const cityKey = `${geo.city}, ${geo.region}, ${geo.country}`;
  const event = JSON.stringify({
    ts: timestamp,
    path,
    referrer,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    language: typeof body.language === "string" ? body.language.slice(0, 24) : "",
    width: Number(body.width || 0),
    height: Number(body.height || 0),
  });

  await redisPipeline([
    ["ZADD", "analytics:events", timestamp, event],
    ["ZREMRANGEBYSCORE", "analytics:events", 0, timestamp - 1000 * 60 * 60 * 24 * 90],
    ["INCR", "analytics:views:total"],
    ["INCR", `analytics:views:day:${day}`],
    ["INCR", `analytics:views:hour:${hour}`],
    ["HINCRBY", "analytics:paths", path, 1],
    ["HINCRBY", "analytics:countries", geo.country, 1],
    ["HINCRBY", "analytics:cities", cityKey, 1],
    ["HINCRBY", "analytics:referrers", referrer, 1],
    ["PFADD", `analytics:unique:day:${day}`, visitorId],
    ["EXPIRE", `analytics:unique:day:${day}`, 60 * 60 * 24 * 180],
  ]);

  return sendJson(res, { ok: true });
};
