const { getRedisConfig, isAdmin, redisPipeline, sendJson, topEntries } = require("../_shared");

function lastDays(count) {
  const days = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - index);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

function lastHours(count) {
  const hours = [];
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setUTCHours(now.getUTCHours() - index);
    hours.push(`${date.toISOString().slice(0, 13)}:00`);
  }
  return hours;
}

function resultAt(results, index) {
  return Number(results?.[index]?.result || 0);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, { error: "Method not allowed" }, 405);
  }

  if (!isAdmin(req)) {
    return sendJson(res, { error: "No autorizado" }, 401);
  }

  if (!getRedisConfig()) {
    return sendJson(res, { configured: false });
  }

  const days = lastDays(14);
  const hours = lastHours(24);
  const commands = [
    ["GET", "analytics:views:total"],
    ...days.map((day) => ["GET", `analytics:views:day:${day}`]),
    ...days.map((day) => ["PFCOUNT", `analytics:unique:day:${day}`]),
    ...hours.map((hour) => ["GET", `analytics:views:hour:${hour}`]),
    ["HGETALL", "analytics:paths"],
    ["HGETALL", "analytics:countries"],
    ["HGETALL", "analytics:cities"],
    ["HGETALL", "analytics:referrers"],
    ["ZREVRANGE", "analytics:events", 0, 24],
  ];

  const results = await redisPipeline(commands);
  let cursor = 0;
  const totalViews = resultAt(results, cursor);
  cursor += 1;

  const byDay = days.map((day) => {
    const views = resultAt(results, cursor);
    cursor += 1;
    return { day, views, visitors: 0 };
  });

  byDay.forEach((row) => {
    row.visitors = resultAt(results, cursor);
    cursor += 1;
  });

  const byHour = hours.map((hour) => {
    const views = resultAt(results, cursor);
    cursor += 1;
    return { hour, views };
  });

  const paths = topEntries(results[cursor]?.result, 12);
  cursor += 1;
  const countries = topEntries(results[cursor]?.result, 12);
  cursor += 1;
  const cities = topEntries(results[cursor]?.result, 12);
  cursor += 1;
  const referrers = topEntries(results[cursor]?.result, 12);
  cursor += 1;
  const recent = (results[cursor]?.result || []).map((item) => {
    try {
      return JSON.parse(item);
    } catch {
      return undefined;
    }
  }).filter(Boolean);

  return sendJson(res, {
    configured: true,
    generatedAt: new Date().toISOString(),
    totalViews,
    todayViews: byDay.at(-1)?.views || 0,
    todayVisitors: byDay.at(-1)?.visitors || 0,
    byDay,
    byHour,
    paths,
    countries,
    cities,
    referrers,
    recent,
  });
};
