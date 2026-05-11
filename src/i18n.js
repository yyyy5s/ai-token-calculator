// src/i18n.js
"use strict";

const I18n = (() => {
  let current = "zh";
  const subscribers = new Set();

  /** Bootstraps the active language: stored preference > browser language > "zh". */
  function init(savedCode) {
    const dict = window.BUILTIN_TRANSLATIONS || {};
    if (savedCode && dict[savedCode]) {
      current = savedCode;
      return;
    }
    const browser = (navigator.language || "zh").toLowerCase();
    if (browser.startsWith("en") && dict.en) current = "en";
    else if (dict[browser.split("-")[0]])    current = browser.split("-")[0];
    else                                     current = dict.zh ? "zh" : Object.keys(dict)[0] || "zh";
  }

  function getCurrent()   { return current; }
  function getLanguages() { return window.BUILTIN_LANGUAGES || []; }

  /** Translate a key. {placeholder} variables substituted from vars. */
  function t(key, vars) {
    const all = window.BUILTIN_TRANSLATIONS || {};
    let str = all[current]?.[key];
    if (str === undefined) str = all.zh?.[key];
    if (str === undefined) return key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, v);
      }
    }
    return str;
  }

  /** Switch language, persist, refresh DOM, notify subscribers. */
  function setLanguage(code) {
    if (!window.BUILTIN_TRANSLATIONS?.[code]) return false;
    current = code;
    if (typeof Storage !== "undefined" && Storage.savePreferences) {
      Storage.savePreferences({ language: code });
    }
    apply();
    subscribers.forEach(fn => { try { fn(code); } catch {} });
    return true;
  }

  /**
   * Walk the DOM and refresh every element that opted into translation:
   *   data-i18n             → textContent
   *   data-i18n-html        → innerHTML (rich content)
   *   data-i18n-placeholder → placeholder
   *   data-i18n-title       → title
   *   data-i18n-aria-label  → aria-label
   */
  function apply() {
    const tag = current === "zh" ? "zh-CN" : current;
    document.documentElement.setAttribute("lang", tag);

    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
      el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
    });
  }

  /** Register a callback invoked after every language change (for dynamic re-renders). */
  function onChange(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  return { init, t, apply, setLanguage, getCurrent, getLanguages, onChange };
})();
