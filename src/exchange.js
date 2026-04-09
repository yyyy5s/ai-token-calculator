// src/exchange.js
"use strict";

const Exchange = (() => {
  const DEFAULT_RATE = 7.25;
  const API_URL = "https://open.er-api.com/v6/latest/USD";
  const DAY_MS = 24 * 60 * 60 * 1000;

  function formatDateKey(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  function formatDisplayDate(timestamp) {
    return formatDateKey(timestamp);
  }

  function shouldRefreshRate(cached, now = Date.now()) {
    if (!cached?.rate || !cached?.timestamp) return true;
    if ((now - cached.timestamp) >= DAY_MS) return true;
    return cached.dateKey !== formatDateKey(now);
  }

  async function getUSDtoCNY() {
    const now = Date.now();
    const cached = RateCache.get();
    if (!shouldRefreshRate(cached, now)) {
      return {
        rate: cached.rate,
        source: "cache",
        updatedAt: cached.timestamp,
        displayDate: formatDisplayDate(cached.timestamp),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.result !== "success" || !data.rates?.CNY) {
        throw new Error("Bad API response");
      }

      const rate = parseFloat(data.rates.CNY.toFixed(4));
      const savedAt = Date.now();
      RateCache.set({
        rate,
        timestamp: savedAt,
        dateKey: formatDateKey(savedAt),
      });
      return {
        rate,
        source: "api",
        updatedAt: savedAt,
        displayDate: formatDisplayDate(savedAt),
      };
    } catch (err) {
      console.warn("[Exchange] Failed:", err.message);
      if (cached?.rate) {
        return {
          rate: cached.rate,
          source: "stale",
          updatedAt: cached.timestamp,
          displayDate: formatDisplayDate(cached.timestamp),
        };
      }

      const fallbackAt = now;
      return {
        rate: DEFAULT_RATE,
        source: "default",
        updatedAt: fallbackAt,
        displayDate: formatDisplayDate(fallbackAt),
      };
    }
  }

  return { getUSDtoCNY, DEFAULT_RATE, formatDateTime, formatDisplayDate };
})();
