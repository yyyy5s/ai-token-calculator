// src/storage.js
"use strict";

const Storage = (() => {
  const KEYS = {
    CUSTOM_MODELS:     "tl_custom_models",
    CUSTOM_CURRENCIES: "tl_custom_currencies",
    PREFERENCES:       "tl_preferences",
    COMPARE_LIST:      "tl_compare_list",
    SELECTED_MODEL:    "tl_selected_model",
  };

  function _get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      console.warn("[Storage] Write failed", key);
      return false;
    }
  }

  // Custom Models
  function getCustomModels() {
    return _get(KEYS.CUSTOM_MODELS, []);
  }
  function saveCustomModel(model) {
    if (!model.id) model.id = "custom_" + Date.now();
    model.isCustom = true;
    const list = getCustomModels().filter(m => m.id !== model.id);
    list.push(model);
    return _set(KEYS.CUSTOM_MODELS, list);
  }
  function deleteCustomModel(modelId) {
    const list = getCustomModels().filter(m => m.id !== modelId);
    return _set(KEYS.CUSTOM_MODELS, list);
  }

  // Custom Currencies
  function getCustomCurrencies() {
    return _get(KEYS.CUSTOM_CURRENCIES, []);
  }
  function saveCustomCurrency(currency) {
    const list = getCustomCurrencies().filter(c => c.code !== currency.code);
    list.push(currency);
    return _set(KEYS.CUSTOM_CURRENCIES, list);
  }
  function deleteCustomCurrency(code) {
    const list = getCustomCurrencies().filter(c => c.code !== code);
    return _set(KEYS.CUSTOM_CURRENCIES, list);
  }

  // Preferences
  function getPreferences() {
    return _get(KEYS.PREFERENCES, {
      theme: "system",
      lastParams: {
        inputTokens: 30000,
        outputTokens: 1200,
        cacheHitRate: 20,
        dailyCalls: 100,
      }
    });
  }
  function savePreferences(prefs) {
    const current = getPreferences();
    return _set(KEYS.PREFERENCES, { ...current, ...prefs });
  }

  // Compare list
  function getCompareList() {
    return _get(KEYS.COMPARE_LIST, []);
  }
  function saveCompareList(modelIds) {
    return _set(KEYS.COMPARE_LIST, modelIds.slice(0, 5));
  }

  // Selected model
  function getSelectedModel() {
    return _get(KEYS.SELECTED_MODEL, null);
  }
  function saveSelectedModel(modelId) {
    return _set(KEYS.SELECTED_MODEL, modelId);
  }

  return {
    getCustomModels, saveCustomModel, deleteCustomModel,
    getCustomCurrencies, saveCustomCurrency, deleteCustomCurrency,
    getPreferences, savePreferences,
    getCompareList, saveCompareList,
    getSelectedModel, saveSelectedModel,
  };
})();
