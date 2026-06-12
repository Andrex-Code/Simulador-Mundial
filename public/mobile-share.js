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

  function drawFlag(ctx, image, x, y, width, height) {
    if (!image) return;
    ctx.save();
    roundedRect(ctx, x, y, width, height, 8);
    ctx.clip();
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
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

  async function drawMobileShare(originalCanvas, callback, type, quality) {
    const championName = getChampionName();
    const championImage = await loadImage(getChampionFlagSrc());
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
    drawChampion(ctx, championName, championImage);

    drawText(ctx, "Bracket completo", 70, 482, "900 30px Arial", "#f8fafc");
    drawText(ctx, "Cruces generados por la lógica del simulador", 70, 516, "700 20px Arial", "#9fb4cc");

    fillRound(ctx, 24, 544, 1032, 622, 30, "rgba(7, 18, 31, 0.92)", "rgba(148, 163, 184, 0.22)");
    ctx.save();
    roundedRect(ctx, 38, 558, 1004, 594, 24);
    ctx.clip();
    ctx.drawImage(originalCanvas, 0, 0, 1800, 1080, 38, 558, 1004, 594);
    ctx.restore();

    fillRound(ctx, 70, 1216, 940, 72, 24, "rgba(255,255,255,0.05)", "rgba(255,255,255,0.12)");
    drawText(ctx, "Haz tu predicción en", SHARE_WIDTH / 2, 1246, "700 20px Arial", "#9fb4cc", "center");
    drawText(ctx, window.location.host || "simulador-mundial-26.vercel.app", SHARE_WIDTH / 2, 1275, "900 24px Arial", "#f8fafc", "center");
    previousToBlob.call(canvas, callback, type || "image/png", quality || 0.95);
  }

  HTMLCanvasElement.prototype.toBlob = function mobileShareToBlob(callback, type, quality) {
    const isShareCanvas = this.width === 1800 && this.height === 1080;
    const isMobile = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
    if (isMobile && isShareCanvas) {
      void drawMobileShare(this, callback, type, quality);
      return;
    }
    previousToBlob.call(this, callback, type, quality);
  };
})();
