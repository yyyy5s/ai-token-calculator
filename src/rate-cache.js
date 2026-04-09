// src/rate-cache.js
"use strict";

const RateCache = (() => {
  const KEY = "tl_daily_exchange_rate";

  function get() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function set(rateInfo) {
    try {
      localStorage.setItem(KEY, JSON.stringify(rateInfo));
      return true;
    } catch {
      return false;
    }
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
      return true;
    } catch {
      return false;
    }
  }

  return { get, set, clear };
})();