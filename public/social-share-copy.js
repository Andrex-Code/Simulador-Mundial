(() => {
  function getChampionName() {
    const selectors = [
      ".champion-mark strong .team-label span:last-child",
      ".champion-mark strong",
      ".hero-card strong",
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.replace("Campeón:", "").trim();
      if (text && !/por definir/i.test(text)) return text;
    }

    return "campeón por definir";
  }

  function getShareUrl(inputUrl) {
    if (inputUrl) return inputUrl;
    return `${window.location.origin}${window.location.pathname}${window.location.hash || ""}`;
  }

  function getViralText(shareUrl, includeLink = true) {
    const championName = getChampionName();
    const lines = [
      "Yo ya hice mi simulación del Mundial 2026 🏆",
      `Me salió campeón: ${championName}`,
      "",
      "A ver si a ti te da el mismo resultado 👀👇",
    ];

    if (includeLink) lines.push(shareUrl);
    return lines.join("\n");
  }

  if (navigator.share) {
    const nativeShare = navigator.share.bind(navigator);
    navigator.share = (data = {}) => {
      const shareUrl = getShareUrl(data.url);
      return nativeShare({
        ...data,
        title: "Mi simulación del Mundial 2026",
        text: getViralText(shareUrl, true),
      });
    };
  }

  const nativeOpen = window.open.bind(window);
  window.open = (url, target, features) => {
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.hostname.includes("facebook.com") && parsed.pathname.includes("/sharer")) {
        const shareUrl = parsed.searchParams.get("u") || getShareUrl();
        parsed.searchParams.set("u", shareUrl);
        parsed.searchParams.set("quote", getViralText(shareUrl, false));
        return nativeOpen(parsed.toString(), target, features);
      }
    } catch {
      // If it is not a valid URL, keep the original behavior.
    }

    return nativeOpen(url, target, features);
  };
})();
