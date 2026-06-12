(() => {
  const SHARE_WIDTH = 1080;
  const SHARE_HEIGHT = 1350;
  const MOBILE_MAX_WIDTH = 720;
  const previousToBlob = HTMLCanvasElement.prototype.toBlob;

  function roundedRect(ctx, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
  }

  function fillRound(ctx, x, y, width, height, radius, fill, stroke) {
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function drawText(ctx, text, x, y, font, color, align = "left") {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  function trimText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let output = text;
    while (output.length > 3 && ctx.measureText(`${output}...`).width > maxWidth) output = output.slice(0, -1);
    return `${output}...`;
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  function getChampionName() {
    const selectors = [".champion-mark strong .team-label span:last-child", ".champion-mark strong", ".hero-card strong"];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.replace("Campeón:", "").trim();
      if (text && !/por definir/i.test(text)) return text;
    }
    return "Por definir";
  }

  function getChampionFlagSrc() {
    return document.querySelector(".champion-mark strong .flag-img, .hero-card .flag-img")?.getAttribute("src") || "";
  }

  function cleanTeamName(text) {
    return (text || "Por definir").replace(/\s+/g, " ").replace(/^Avanza\s+/i, "").trim();
  }

  function parseCard(card) {
    const teams = Array.from(card.querySelectorAll(".ko-team"));
    const homeName = cleanTeamName(teams[0]?.querySelector("span")?.textContent || "");
    const awayName = cleanTeamName(teams[1]?.querySelector("span")?.textContent || "");
    const homeScore = teams[0]?.querySelector("input")?.value || "-";
    const awayScore = teams[1]?.querySelector("input")?.value || "-";
    const advanceText = cleanTeamName(card.querySelector("small")?.textContent || "");
    const homeNumber = Number(homeScore);
    const awayNumber = Number(awayScore);
    let winnerName = /^Pendiente$/i.test(advanceText) ? "" : advanceText;
    if (!winnerName && Number.isFinite(homeNumber) && Number.isFinite(awayNumber) && homeNumber !== awayNumber) {
      winnerName = homeNumber > awayNumber ? homeName : awayName;
    }

    return {
      label: card.querySelector(".ko-title")?.textContent?.trim() || "",
      homeName,
      awayName,
      winnerName,
      homeFlag: teams[0]?.querySelector("img")?.getAttribute("src") || "",
      awayFlag: teams[1]?.querySelector("img")?.getAttribute("src") || "",
      homeScore,
      awayScore,
    };
  }

  function parseRound(round) {
    return {
      label: round.querySelector("h3")?.textContent?.replace(/ Lado [AB]/i, "").trim() || "",
      matches: Array.from(round.querySelectorAll(".ko-card")).map(parseCard),
    };
  }

  function getShareData() {
    return {
      leftRounds: Array.from(document.querySelectorAll(".bracket-side.left .bracket-round")).map(parseRound),
      rightRounds: Array.from(document.querySelectorAll(".bracket-side.right .bracket-round")).map(parseRound),
      finalCards: Array.from(document.querySelectorAll(".final-lane .ko-card")).map(parseCard),
    };
  }

  function shortLabel(label) {
    if (/diec/i.test(label) || /16/i.test(label)) return "16vos";
    if (/oct/i.test(label)) return "8vos";
    if (/cuart/i.test(label)) return "4tos";
    if (/semi/i.test(label)) return "Semi";
    return label;
  }

  function collectSources(data, championFlag) {
    const sources = new Set(championFlag ? [championFlag] : []);
    [...data.leftRounds, ...data.rightRounds].forEach((round) => {
      round.matches.forEach((match) => {
        if (match.homeFlag) sources.add(match.homeFlag);
        if (match.awayFlag) sources.add(match.awayFlag);
      });
    });
    data.finalCards.forEach((match) => {
      if (match.homeFlag) sources.add(match.homeFlag);
      if (match.awayFlag) sources.add(match.awayFlag);
    });
    return [...sources];
  }

  function sameTeam(a, b) {
    return cleanTeamName(a).toLowerCase() === cleanTeamName(b).toLowerCase();
  }

  function drawFlag(ctx, image, x, y, width, height) {
    if (!image) return;
    ctx.save();
    roundedRect(ctx, x, y, width, height, 4);
    ctx.clip();
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
  }

  function drawMiniMatch(ctx, match, images, x, y, width, height, accent = "#38bdf8") {
    fillRound(ctx, x, y, width, height, 10, "rgba(8, 54, 50, 0.9)", "rgba(45, 212, 191, 0.34)");
    fillRound(ctx, x, y, 5, height, 10, accent);
    const flagX = x + 9;
    const flagW = 34;
    const flagH = 23;
    const scoreX = flagX + flagW + 13;
    drawFlag(ctx, images.get(match.homeFlag), flagX, y + 6, flagW, flagH);
    drawFlag(ctx, images.get(match.awayFlag), flagX, y + 35, flagW, flagH);
    drawText(ctx, match.homeScore, scoreX, y + 25, "900 22px Arial", "#fbbf24");
    drawText(ctx, match.awayScore, scoreX, y + 54, "900 22px Arial", "#fbbf24");
  }

  function drawCenterMatch(ctx, match, images, x, y, title, accent) {
    const width = 224;
    const height = 118;
    fillRound(ctx, x, y, width, height, 20, "rgba(8, 54, 50, 0.94)", "rgba(45, 212, 191, 0.42)");
    fillRound(ctx, x, y, 7, height, 20, accent);
    fillRound(ctx, x + 16, y + 12, title.length > 6 ? 108 : 70, 24, 12, "rgba(2, 12, 27, 0.50)");
    drawText(ctx, title, x + 26, y + 30, "900 15px Arial", "#cbd5e1");
    const flagW = 34;
    const flagH = 24;
    const nameX = x + 64;
    const scoreX = x + width - 20;
    const row1 = y + 62;
    const row2 = y + 94;
    drawFlag(ctx, images.get(match.homeFlag), x + 20, row1 - 20, flagW, flagH);
    drawFlag(ctx, images.get(match.awayFlag), x + 20, row2 - 20, flagW, flagH);
    drawText(ctx, trimText(ctx, match.homeName, 98), nameX, row1, "800 18px Arial", "#f8fafc");
    drawText(ctx, trimText(ctx, match.awayName, 98), nameX, row2, "800 18px Arial", "#f8fafc");
    drawText(ctx, match.homeScore, scoreX, row1, "900 22px Arial", "#fbbf24", "right");
    drawText(ctx, match.awayScore, scoreX, row2, "900 22px Arial", "#fbbf24", "right");
  }

  function drawConnector(ctx, fromX, fromY, toX, toY) {
    ctx.strokeStyle = "rgba(148, 163, 184, 0.30)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    const midX = (fromX + toX) / 2;
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(midX, fromY);
    ctx.lineTo(midX, toY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  }

  function roundPosition(count, index, cardHeight) {
    const top = 594;
    if (count === 8) return top + index * (cardHeight + 8);
    if (count === 4) return top + 34 + index * (cardHeight + 60);
    if (count === 2) return top + 106 + index * (cardHeight + 174);
    return top + 246;
  }

  function drawSide(ctx, rounds, images, side) {
    const cardW = 78;
    const cardH = 62;
    const leftXs = [44, 150, 256, 362];
    const rightXs = [958, 852, 746, 640];
    const sourceRounds = side === "left" ? rounds : rounds.slice().reverse();
    const xs = side === "left" ? leftXs : rightXs;
    const accents = ["#3b82f6", "#60a5fa", "#818cf8", "#f59e0b"];
    const drawn = [];

    sourceRounds.forEach((round, roundIndex) => {
      const x = xs[roundIndex];
      drawText(ctx, shortLabel(round.label), x + cardW / 2, 576, "900 17px Arial", "#dbeafe", "center");
      drawn[roundIndex] = round.matches.map((match, index) => {
        const y = roundPosition(round.matches.length, index, cardH);
        drawMiniMatch(ctx, match, images, x, y, cardW, cardH, accents[roundIndex]);
        return { match, x, y, midY: y + cardH / 2 };
      });
    });

    for (let i = 0; i < 3; i += 1) {
      const current = drawn[i] || [];
      const next = drawn[i + 1] || [];
      current.forEach((item, index) => {
        const winner = item.match.winnerName;
        let target = winner
          ? next.find((candidate) => sameTeam(candidate.match.homeName, winner) || sameTeam(candidate.match.awayName, winner))
          : undefined;
        if (!target) target = next[Math.floor(index / 2)];
        if (!target) return;
        const fromX = side === "left" ? item.x + cardW : item.x;
        const toX = side === "left" ? target.x : target.x + cardW;
        drawConnector(ctx, fromX, item.midY, toX, target.midY);
      });
    }
  }

  function drawChampion(ctx, championName, championImage) {
    const x = 70;
    const y = 154;
    const width = 940;
    const height = 250;
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "rgba(25, 55, 83, 0.98)");
    gradient.addColorStop(0.55, "rgba(9, 31, 51, 0.98)");
    gradient.addColorStop(1, "rgba(47, 37, 19, 0.98)");
    fillRound(ctx, x, y, width, height, 34, gradient, "rgba(251, 191, 36, 0.46)");
    fillRound(ctx, x + 30, y + 28, 170, 46, 23, "rgba(251,191,36,0.16)", "rgba(251,191,36,0.35)");
    drawText(ctx, "CAMPEÓN", x + 115, y + 59, "900 21px Arial", "#fbbf24", "center");
    drawText(ctx, "🏆", x + width / 2, y + 86, "700 52px Arial", "#fbbf24", "center");
    fillRound(ctx, x + 160, y + 108, width - 320, 92, 46, "rgba(2,12,27,0.74)", "rgba(255,255,255,0.14)");
    drawFlag(ctx, championImage, x + 194, y + 126, 92, 62);
    drawText(ctx, trimText(ctx, championName, 410), x + width / 2 + 58, y + 168, "900 48px Arial", "#fff7d6", "center");
    drawText(ctx, "Mi predicción al campeón del Mundial 2026", x + width / 2, y + 232, "600 22px Arial", "#cbd5e1", "center");
  }

  async function drawMobileShare(callback, type, quality) {
    const data = getShareData();
    const championFlag = getChampionFlagSrc();
    const entries = await Promise.all(collectSources(data, championFlag).map(async (src) => [src, await loadImage(src)]));
    const images = new Map(entries.filter((entry) => entry[1]));
    const championName = getChampionName();
    const canvas = document.createElement("canvas");
    canvas.width = SHARE_WIDTH;
    canvas.height = SHARE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return callback(null);
    const bg = ctx.createLinearGradient(0, 0, 0, SHARE_HEIGHT);
    bg.addColorStop(0, "#06111e");
    bg.addColorStop(0.55, "#081d31");
    bg.addColorStop(1, "#07111d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(88, 82, 190, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(1010, 205, 245, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawText(ctx, "Mi bracket del Mundial 2026", 64, 86, "900 44px Arial", "#f8fafc");
    drawText(ctx, "Mi simulación", 64, 122, "700 24px Arial", "#a8bbd2");
    fillRound(ctx, 720, 46, 290, 74, 22, "rgba(251,191,36,0.13)", "rgba(251,191,36,0.34)");
    drawText(ctx, "CAMPEÓN", 748, 78, "900 18px Arial", "#fbbf24");
    drawText(ctx, trimText(ctx, championName, 220), 748, 106, "900 29px Arial", "#ffffff");
    drawChampion(ctx, championName, images.get(championFlag));
    drawText(ctx, "Bracket completo", 70, 482, "900 30px Arial", "#f8fafc");
    drawText(ctx, "Cruces conectados por equipo ganador", 70, 516, "700 20px Arial", "#9fb4cc");
    fillRound(ctx, 16, 536, 1048, 624, 30, "rgba(7, 18, 31, 0.92)", "rgba(148, 163, 184, 0.22)");
    drawSide(ctx, data.leftRounds, images, "left");
    drawSide(ctx, data.rightRounds, images, "right");
    const third = data.finalCards.find((card) => /tercer/i.test(card.label)) || data.finalCards[0];
    const final = data.finalCards.find((card) => /final/i.test(card.label)) || data.finalCards[1];
    if (third) drawCenterMatch(ctx, third, images, 428, 642, "3er puesto", "#64748b");
    fillRound(ctx, 456, 780, 168, 132, 24, "rgba(8, 47, 73, 0.94)", "rgba(251, 191, 36, 0.46)");
    drawText(ctx, "CAMPEÓN", 540, 808, "900 15px Arial", "#fbbf24", "center");
    drawFlag(ctx, images.get(championFlag), 506, 820, 68, 46);
    drawText(ctx, trimText(ctx, championName, 150), 540, 898, "900 22px Arial", "#ffffff", "center");
    if (final) drawCenterMatch(ctx, final, images, 428, 936, "Final", "#fbbf24");
    fillRound(ctx, 70, 1216, 940, 72, 24, "rgba(255,255,255,0.05)", "rgba(255,255,255,0.12)");
    drawText(ctx, "Haz tu predicción en", SHARE_WIDTH / 2, 1246, "700 20px Arial", "#9fb4cc", "center");
    drawText(ctx, window.location.host || "simulador-mundial-26.vercel.app", SHARE_WIDTH / 2, 1275, "900 24px Arial", "#f8fafc", "center");
    previousToBlob.call(canvas, callback, type || "image/png", quality || 0.95);
  }

  HTMLCanvasElement.prototype.toBlob = function mobileShareToBlob(callback, type, quality) {
    const isShareCanvas = this.width === 1800 && this.height === 1080;
    const isMobile = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
    if (isMobile && isShareCanvas) {
      void drawMobileShare(callback, type, quality);
      return;
    }
    previousToBlob.call(this, callback, type, quality);
  };
})();
