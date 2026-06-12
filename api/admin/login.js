const { createSessionCookie, readJsonBody, sendJson } = require("../_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, { error: "Method not allowed" }, 405);
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return sendJson(res, { error: "Admin no configurado" }, 503);
  }

  const body = await readJsonBody(req);

  if (body.password !== adminPassword) {
    return sendJson(res, { error: "Clave incorrecta" }, 401);
  }

  return sendJson(res, { ok: true }, 200, {
    "set-cookie": createSessionCookie(),
  });
};
