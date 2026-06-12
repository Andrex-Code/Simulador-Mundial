const crypto = require("crypto");

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function sendJson(res, data, status = 200, headers = {}) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value || "";
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  return { url: url.replace(/\/$/, ""), token };
}

async function redisPipeline(commands) {
  const config = getRedisConfig();
  if (!config) return undefined;

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.status}`);
  }

  return response.json();
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
}

function sign(value) {
  const secret = getSessionSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function createSessionCookie() {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = String(expiresAt);
  const value = `${payload}.${sign(payload)}`;
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie() {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=0`;
}

function readCookie(req, name) {
  const header = getHeader(req, "cookie");
  const pair = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : undefined;
}

function isAdmin(req) {
  const secret = getSessionSecret();
  const value = readCookie(req, SESSION_COOKIE);
  if (!secret || !value) return false;

  const [expiresAt, signature] = value.split(".");
  if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;

  const expected = sign(expiresAt);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function hashVisitor(parts) {
  const secret = getSessionSecret() || "analytics";
  return crypto.createHash("sha256").update(`${secret}:${parts.filter(Boolean).join(":")}`).digest("hex");
}

function getClientIp(req) {
  const forwarded = getHeader(req, "x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || getHeader(req, "x-real-ip") || "";
}

function getGeo(req) {
  const city = decodeURIComponent(getHeader(req, "x-vercel-ip-city") || "Desconocida");
  return {
    country: getHeader(req, "x-vercel-ip-country") || "XX",
    region: getHeader(req, "x-vercel-ip-country-region") || "Desconocida",
    city,
  };
}

function normalizePath(value) {
  if (!value || typeof value !== "string") return "/";
  const path = value.split("?")[0].slice(0, 120);
  return path.startsWith("/") ? path : "/";
}

function normalizeReferrer(value) {
  if (!value || typeof value !== "string") return "Directo";
  try {
    return new URL(value).hostname.replace(/^www\./, "") || "Directo";
  } catch {
    return "Directo";
  }
}

function topEntries(raw, limit = 10) {
  if (!Array.isArray(raw)) return [];
  const entries = [];
  for (let index = 0; index < raw.length; index += 2) {
    entries.push({ label: raw[index], value: Number(raw[index + 1] || 0) });
  }
  return entries.sort((a, b) => b.value - a.value).slice(0, limit);
}

module.exports = {
  clearSessionCookie,
  createSessionCookie,
  getClientIp,
  getGeo,
  getHeader,
  getRedisConfig,
  hashVisitor,
  isAdmin,
  normalizePath,
  normalizeReferrer,
  readJsonBody,
  redisPipeline,
  sendJson,
  topEntries,
};
